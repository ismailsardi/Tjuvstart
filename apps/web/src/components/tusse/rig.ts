import type { TussePose } from '../Tusse';
import type { Outfit } from '../outfits';
import { GROUPS, layerFiles, layerUrl, outfitKey, type LayerGroup } from './layers';
import { PAD, RIG } from './rigData';

/**
 * The rigged Tusse: the same illustrated poses as the stills, animated in WebGL like a cut-out
 * puppet. Each pose is one image laid on a grid mesh; every grid point carries a weight per bone
 * (ears, arms, tail, head), painted and blurred so joints bend instead of tearing. Bones are driven
 * by springs, so a move overshoots and settles, and parts catch up with each other. On top of that
 * the whole body breathes, squashes and stretches from the feet.
 *
 * The eyes are their own layer: the pupils slide inside the eye whites (looking around, or at the
 * pointer), and an eyelid comes down for blinks.
 *
 * Clothes are drawn as extra layers on the same mesh (see layers.ts): behind the body, over the
 * body with its own weights, and over the head as one rigid piece.
 *
 * Loaded on demand (see Tusse.tsx). It needs WebGL2, for mipmapped textures at any size, so the
 * full-size art stays smooth when drawn small.
 */

export interface TusseRig {
  /** Show a pose and play its little act (thumb pumps, head shake, fist pumps...). */
  setPose(pose: TussePose): void;
  /** Change clothes. The current pose redresses once the new pieces have loaded. */
  setOutfit(outfit: Outfit): void;
  /** A tap: a hop, or a stir in its sleep. */
  tap(): void;
  dispose(): void;
}

/** Art size in rig units. The textures are drawn at twice this. */
const W = 400;
const H = 440;
/** Grid step of the mesh, in rig units. */
const STEP = 4;
const GX = W / STEP;
const GY = H / STEP;

const EYE_POSES: readonly TussePose[] = ['rest', 'wave', 'thumbs', 'shrug'];

const VS = `
attribute vec2 uv; attribute vec4 w1; attribute vec3 w2;
uniform vec2 pEarL, pEarR, pA, pTail, pHead, pB, pC;
uniform float earL, earR, armA, armAY, tail, head, headY, armB, armC, lean, sx, sy, ty;
uniform vec4 fit;
varying vec2 vuv;
vec2 rot(vec2 p, vec2 c, float a, float w) {
  float s = sin(a), k = cos(a); vec2 d = p - c;
  return mix(p, vec2(k * d.x - s * d.y, s * d.x + k * d.y) + c, w);
}
void main() {
  vuv = uv;
  vec2 p = uv * vec2(${W}.0, ${H}.0);
  p = rot(p, pEarL, earL, w1.r);
  p = rot(p, pEarR, earR, w1.g);
  p = rot(p, pA, armA, w1.b); p.y += armAY * w1.b;
  p = rot(p, pTail, tail, w1.a);
  p = rot(p, pB, armB, w2.g);
  p = rot(p, pC, armC, w2.b);
  p = rot(p, pHead, head, w2.r); p.y += headY * w2.r;
  p.x = fit.w + (p.x - fit.z) * fit.x; p.y = 425.0 + (p.y - 425.0) * fit.y;
  vec2 f = vec2(195.0, 428.0);
  p = f + (p - f) * vec2(sx, sy);
  p = rot(p, f, lean, 1.0);
  p.y += ty;
  vec2 q = (p + vec2(${PAD.x}.0, ${PAD.y}.0)) / vec2(${PAD.w}.0, ${PAD.h}.0);
  gl_Position = vec4(q.x * 2.0 - 1.0, 1.0 - q.y * 2.0, 0.0, 1.0);
}`;

const FS = `precision mediump float;
uniform sampler2D tex, ps, em;
uniform float blink, eyesOn; uniform vec2 gaze; uniform vec4 eyeL, eyeR;
varying vec2 vuv;
const vec2 SZ = vec2(${W}.0, ${H}.0);
// An eyelid in the fur colour, closing to a lash line.
vec4 lid(vec4 col, vec2 p, vec2 c, vec2 r, float k) {
  if (k <= 0.001) return col;
  float hx = 1.0 - pow((p.x - c.x) / r.x, 2.0); if (hx <= 0.0) return col;
  float h = sqrt(hx) * r.y; float top = c.y - h; float bot = c.y + h;
  float ly = mix(top, bot, k);
  if (p.y < top - 1.0) return col;
  float g = clamp((p.y - (c.y - r.y)) / max(ly - (c.y - r.y), 1.0), 0.0, 1.0);
  vec4 l = vec4(mix(vec3(0.2, 0.69, 0.94), vec3(0.16, 0.6, 0.86), g * g), 1.0);
  float cover = (1.0 - smoothstep(ly - 0.8, ly + 0.8, p.y)) * smoothstep(0.0, 0.1, hx);
  vec4 o = mix(col, l, cover);
  float lash = (1.0 - smoothstep(1.0, 2.4, abs(p.y - ly))) * smoothstep(0.05, 0.25, k) * smoothstep(0.0, 0.15, hx);
  o.rgb = mix(o.rgb, vec3(0.12, 0.16, 0.33) * o.a, lash * 0.9);
  return o;
}
void main() {
  vec4 c = texture2D(tex, vuv);
  if (eyesOn > 0.5) {
    vec2 p = vuv * SZ;
    // Pupils are drawn only where there is eye (r), over the filled eye white (g), so the nose and
    // the eye's outline stay in front of them.
    vec4 pu = texture2D(ps, (p - gaze) / SZ);
    vec4 e = texture2D(em, p / SZ);
    c.rgb += pu.a * e.r * (pu.rgb - vec3(e.g));
    c = lid(c, p, eyeL.xy, eyeL.zw + 5.0, blink);
    c = lid(c, p, eyeR.xy, eyeR.zw + 5.0, blink);
  }
  gl_FragColor = c;
}`;

class Spring {
  x = 0;
  v = 0;
  t = 0;
  constructor(
    private k = 120,
    private d = 12,
  ) {}
  step(dt: number) {
    // Small substeps keep the stiff springs (the pupils) stable.
    const n = Math.ceil(dt / 0.004);
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (this.k * (this.t - this.x) - this.d * this.v) * h;
      this.x += this.v * h;
    }
  }
  kick(v: number) {
    this.v += v;
  }
}

interface PoseAssets {
  art: HTMLImageElement;
  /** Bone weights per grid point: ears + arm + tail, and head + the two lower arms. */
  w1: Float32Array;
  w2: Float32Array;
  eyes?: { pupils: HTMLImageElement; mask: HTMLImageElement };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

/** The three weight maps of a pose, stacked in one image (RGB only: alpha would be premultiplied). */
function readWeights(img: HTMLImageElement) {
  const n = (GX + 1) * (GY + 1);
  const c = document.createElement('canvas');
  c.width = GX + 1;
  c.height = (GY + 1) * 3;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No 2D canvas');
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, c.width, c.height).data;
  const w1 = new Float32Array(n * 4);
  const w2 = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) {
    for (let k = 0; k < 3; k++) {
      w1[v * 4 + k] = (px[v * 4 + k] ?? 0) / 255;
      w2[v * 3 + k] = (px[(n + v) * 4 + k] ?? 0) / 255;
    }
    w1[v * 4 + 3] = (px[(2 * n + v) * 4] ?? 0) / 255; // tail
  }
  return { w1, w2 };
}

// Shared by every Tusse on the page: each pose is fetched once, when first shown.
const cache = new Map<TussePose, Promise<PoseAssets>>();
function loadPose(base: string, pose: TussePose): Promise<PoseAssets> {
  let p = cache.get(pose);
  if (!p) {
    const url = (f: string) => `${base}troll/rig/${f}`;
    p = Promise.all([
      loadImage(url(`${pose}.webp`)),
      loadImage(url(`${pose}-weights.png`)),
      EYE_POSES.includes(pose)
        ? Promise.all([loadImage(url(`${pose}-pupils.webp`)), loadImage(url(`${pose}-eyes.png`))])
        : null,
    ]).then(([art, weights, eyes]) => ({
      art,
      ...readWeights(weights),
      eyes: eyes ? { pupils: eyes[0], mask: eyes[1] } : undefined,
    }));
    p.catch(() => cache.delete(pose));
    cache.set(pose, p);
  }
  return p;
}

// Outfit pieces, shared the same way.
const layerCache = new Map<string, Promise<HTMLImageElement>>();
function loadLayer(base: string, file: string): Promise<HTMLImageElement> {
  const url = layerUrl(base, file);
  let p = layerCache.get(url);
  if (!p) {
    p = loadImage(url);
    p.catch(() => layerCache.delete(url));
    layerCache.set(url, p);
  }
  return p;
}

/** One pose's clothes, flattened into one image per group. */
type Dressing = Partial<Record<LayerGroup, HTMLCanvasElement>>;
async function loadDressing(base: string, pose: TussePose, outfit: Outfit): Promise<Dressing> {
  const out: Dressing = {};
  await Promise.all(
    GROUPS.map(async (group) => {
      const files = layerFiles(outfit, pose, group);
      if (!files.length) return;
      // A piece that fails to load is left off rather than holding up the pose.
      const loaded = await Promise.all(files.map((f) => loadLayer(base, f).catch(() => null)));
      const imgs = loaded.filter((img): img is HTMLImageElement => !!img);
      if (!imgs.length) return;
      const c = document.createElement('canvas');
      c.width = imgs[0]!.naturalWidth;
      c.height = imgs[0]!.naturalHeight;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('No 2D canvas');
      for (const img of imgs) ctx.drawImage(img, 0, 0);
      out[group] = c;
    }),
  );
  return out;
}

/**
 * Bone weights for a layer group: the cape behind only moves with the body, the head pieces only
 * with the head, and body pieces with everything but the ears (a sleeve follows its arm, a hat
 * brim shouldn't bend with an ear under it).
 */
function groupWeights(a: PoseAssets, group: LayerGroup) {
  const w1 = new Float32Array(a.w1.length);
  const w2 = new Float32Array(a.w2.length);
  if (group === 'body') {
    w1.set(a.w1);
    w2.set(a.w2);
    for (let i = 0; i < w1.length; i += 4) w1[i] = w1[i + 1] = 0;
  } else if (group === 'head') {
    for (let i = 0; i < w2.length; i += 3) w2[i] = a.w2[i]!;
  }
  return { w1, w2 };
}

const BONES = [
  'earL',
  'earR',
  'armA',
  'armAY',
  'tail',
  'head',
  'headY',
  'armB',
  'armC',
  'lean',
] as const;
type Bone = (typeof BONES)[number];

export async function createTusseRig(
  canvas: HTMLCanvasElement,
  firstPose: TussePose,
  base: string,
  firstOutfit: Outfit = {},
): Promise<TusseRig> {
  const gl = canvas.getContext('webgl2', {
    premultipliedAlpha: true,
    alpha: true,
    antialias: true,
  });
  if (!gl) throw new Error('No WebGL2');

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? '');
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(prog) ?? '');
  gl.useProgram(prog);

  const buffer = (data: Float32Array) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return b;
  };
  const attr = (b: WebGLBuffer | null, name: string, size: number) => {
    const loc = gl.getAttribLocation(prog, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  };
  const uv: number[] = [];
  for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) uv.push(i / GX, j / GY);
  const idx: number[] = [];
  for (let j = 0; j < GY; j++)
    for (let i = 0; i < GX; i++) {
      const a = j * (GX + 1) + i;
      idx.push(a, a + 1, a + GX + 1, a + 1, a + GX + 2, a + GX + 1);
    }
  attr(buffer(new Float32Array(uv)), 'uv', 2);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx), gl.STATIC_DRAW);

  const texture = (img: TexImageSource, premultiply: boolean) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    return t;
  };
  interface GpuLayer {
    tex: WebGLTexture | null;
    w1: WebGLBuffer | null;
    w2: WebGLBuffer | null;
  }
  interface GpuPose extends GpuLayer {
    eyes?: [WebGLTexture | null, WebGLTexture | null];
    /** The clothes this pose is dressed in, and for which outfit. */
    dressed: string;
    layers: Partial<Record<LayerGroup, GpuLayer>>;
  }
  const gpu = new Map<TussePose, GpuPose>();
  const dropLayers = (g: GpuPose) => {
    for (const l of Object.values(g.layers)) {
      gl.deleteTexture(l.tex);
      gl.deleteBuffer(l.w1);
      gl.deleteBuffer(l.w2);
    }
    g.layers = {};
  };
  const upload = (pose: TussePose, a: PoseAssets, d: Dressing, key: string) => {
    let g = gpu.get(pose);
    if (!g) {
      g = {
        tex: texture(a.art, true),
        w1: buffer(a.w1),
        w2: buffer(a.w2),
        eyes: a.eyes ? [texture(a.eyes.pupils, false), texture(a.eyes.mask, false)] : undefined,
        dressed: '',
        layers: {},
      };
      gpu.set(pose, g);
    }
    if (g.dressed === key) return;
    dropLayers(g);
    for (const group of GROUPS) {
      const c = d[group];
      if (!c) continue;
      const w = groupWeights(a, group);
      g.layers[group] = { tex: texture(c, true), w1: buffer(w.w1), w2: buffer(w.w2) };
    }
    g.dressed = key;
  };
  let outfit = firstOutfit;
  /** A pose with its art, weights and current clothes, ready to upload. */
  const fetchPose = (p: TussePose) => {
    const o = outfit;
    return Promise.all([loadPose(base, p), loadDressing(base, p, o)]).then(
      ([a, d]) => [a, d, outfitKey(o)] as const,
    );
  };

  const UNIFORMS = [
    ...['tex', 'ps', 'em', 'fit', 'sx', 'sy', 'ty', 'blink', 'eyesOn', 'gaze', 'eyeL', 'eyeR'],
    ...['pEarL', 'pEarR', 'pA', 'pTail', 'pHead', 'pB', 'pC'],
    ...BONES,
  ] as const;
  const U = Object.fromEntries(UNIFORMS.map((n) => [n, gl.getUniformLocation(prog, n)])) as Record<
    (typeof UNIFORMS)[number],
    WebGLUniformLocation | null
  >;
  gl.uniform1i(U.tex, 0);
  gl.uniform1i(U.ps, 1);
  gl.uniform1i(U.em, 2);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  upload(firstPose, ...(await fetchPose(firstPose)));

  // ---- motion state
  const S: Record<Bone | 'sq' | 'ty' | 'gx' | 'gy', Spring> = {
    earL: new Spring(160, 9),
    earR: new Spring(160, 9),
    armA: new Spring(140, 10),
    armAY: new Spring(90, 12),
    tail: new Spring(90, 6),
    head: new Spring(90, 10),
    headY: new Spring(90, 12),
    armB: new Spring(110, 9),
    armC: new Spring(110, 9),
    lean: new Spring(80, 11),
    sq: new Spring(260, 14),
    ty: new Spring(200, 16),
    gx: new Spring(900, 55),
    gy: new Spring(900, 55),
  };
  let disposed = false;
  let pose = firstPose;
  let wanted = firstPose;
  let t = 0;
  let blink = 0;
  let blinkT = 0;
  let nextBlink = 1.5;
  let nextTwitch = 2;
  let nextLook = 1;
  let nextHands = 3;
  let nextAct = 0.4;
  let zT = 0;
  let seq: [number, () => void][] = [];
  let seqT = 0;
  let pointer: [number, number] | null = null;
  let pointerT = -99;
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const queue = (steps: [number, () => void][]) => {
    seq = steps;
    seqT = 0;
  };
  const settle = () => {
    for (const k of BONES) S[k].t = 0;
  };

  const hop = () =>
    queue([
      [0, () => (S.sq.t = -0.1)],
      [
        0.09,
        () => {
          S.sq.t = 0.1;
          S.ty.t = -70;
          S.earL.kick(-6);
          S.earR.kick(6);
          S.tail.kick(5);
          S.armB.kick(-1.5);
          S.armC.kick(1.5);
        },
      ],
      [0.27, () => ((S.ty.t = 0), (S.sq.t = 0))],
      [
        0.42,
        () => {
          S.sq.kick(-3.2);
          S.earL.kick(5);
          S.earR.kick(-5);
          S.tail.kick(-4);
          S.armB.kick(1.2);
          S.armC.kick(-1.2);
        },
      ],
    ]);

  /** Each pose's act. Rest and wave share a body; the wave raises the arm and waves three times. */
  const acts: Record<TussePose, () => void> = {
    rest: settle,
    wave: () => {
      const st: [number, () => void][] = [];
      for (let i = 0; i < 3; i++)
        st.push([i * 0.32, () => (S.armA.t = -0.32)], [i * 0.32 + 0.16, () => (S.armA.t = 0.1)]);
      st.push([0.96, () => (S.armA.t = 0)]);
      if (gpu.has('rest')) st.push([1.3, () => show('rest')]);
      queue(st);
    },
    // Thumb pumps twice while it nods yes.
    thumbs: () =>
      queue([
        [0, () => ((S.armA.t = -0.16), (S.headY.t = 5), (S.gx.t = 0), (S.gy.t = 0))],
        [0.18, () => ((S.armA.t = 0.04), (S.headY.t = -1))],
        [0.36, () => ((S.armA.t = -0.16), (S.headY.t = 5), S.earL.kick(-4), S.earR.kick(4))],
        [0.54, () => ((S.armA.t = 0), (S.headY.t = 0))],
      ]),
    // Shakes its head no, then shrugs with drooping ears.
    shrug: () =>
      queue([
        [0, () => ((S.gy.t = 4), (S.gx.t = -3), (S.head.t = 0.09))],
        [0.15, () => (S.head.t = -0.09)],
        [0.3, () => (S.head.t = 0.07)],
        [0.45, () => (S.head.t = -0.06)],
        [0.6, () => (S.head.t = 0.03)],
        [
          0.75,
          () => (
            (S.head.t = 0),
            (S.armB.t = 0.16),
            (S.armC.t = -0.16),
            (S.sq.t = 0.03),
            (S.earL.t = -0.12),
            (S.earR.t = 0.12)
          ),
        ],
        [1.05, () => ((S.armB.t = 0), (S.armC.t = 0), (S.sq.t = 0))],
      ]),
    // Three bounces, fists pumping in turn.
    cheer: () => {
      const st: [number, () => void][] = [];
      for (let i = 0; i < 3; i++)
        st.push(
          [i * 0.45, () => ((S.sq.t = -0.08), (S.ty.t = 0), (S.armB.t = -0.14), (S.armC.t = 0.05))],
          [
            i * 0.45 + 0.12,
            () => ((S.sq.t = 0.06), (S.ty.t = -40), (S.armB.t = 0.05), (S.armC.t = 0.14)),
          ],
          [i * 0.45 + 0.3, () => ((S.ty.t = 0), (S.sq.t = 0))],
        );
      st.push([1.4, () => (S.sq.kick(-2), (S.armB.t = 0), (S.armC.t = 0))]);
      queue(st);
    },
    // A slow, content sway, ears flicking.
    coffee: () =>
      queue([
        [0, () => ((S.head.t = 0.035), (S.lean.t = 0.01))],
        [0.9, () => ((S.head.t = -0.025), (S.lean.t = -0.008), S.earL.kick(-3))],
        [1.8, () => ((S.head.t = 0), (S.lean.t = 0), (S.sq.t = 0.02), S.earR.kick(3))],
        [2.3, () => (S.sq.t = 0)],
      ]),
    // Shifts and nuzzles in, ears and tail twitch, then settles.
    sleep: () =>
      queue([
        [0, () => ((S.head.t = -0.035), (S.headY.t = 2), (S.lean.t = 0.012), (S.sq.t = -0.025))],
        [0.35, () => ((S.head.t = 0.02), S.earR.kick(-4))],
        [0.7, () => ((S.head.t = -0.01), S.tail.kick(3))],
        [1.2, () => ((S.head.t = 0), (S.headY.t = 0), (S.lean.t = 0), (S.sq.t = 0))],
      ]),
  };
  /** How long until a pose plays its act again (seconds); rest has its own fidgets. */
  const again: Record<TussePose, [number, number] | null> = {
    rest: null,
    wave: null,
    thumbs: [6, 9],
    shrug: null,
    cheer: [4, 6],
    coffee: [3.5, 5.5],
    sleep: [5, 8],
  };

  // Squash, swap the pose at the bottom, pop up past the target, then play the act.
  const show = (p: TussePose) => {
    queue([
      [0, () => ((S.sq.t = -0.14), (S.ty.t = 6))],
      [
        0.12,
        () => {
          pose = p;
          settle();
          for (const k of BONES) {
            S[k].x = 0;
            S[k].v = 0;
          }
          S.sq.t = 0;
          S.ty.t = 0;
          S.sq.kick(3.2);
          S.earL.kick(-5);
          S.earR.kick(5);
          S.tail.kick(4);
          nextAct = t + 0.22;
        },
      ],
    ]);
  };

  const onPointer = (e: PointerEvent) => {
    pointer = [e.clientX, e.clientY];
    pointerT = t;
  };
  addEventListener('pointermove', onPointer, { passive: true });

  // Sleep bubbles, as small "z"s floating up from the canvas's box.
  const box = canvas.parentElement;
  const zzz = () => {
    if (!box) return;
    const z = document.createElement('span');
    z.className = 'tusse-zzz';
    z.textContent = 'z';
    z.style.fontSize = `${Math.max(9, box.clientWidth / 9)}px`;
    box.appendChild(z);
    z.addEventListener('animationend', () => z.remove());
  };

  // Only animate while on screen.
  let visible = true;
  const io = new IntersectionObserver((entries) => {
    const was = visible;
    visible = entries.at(-1)?.isIntersecting ?? visible;
    if (visible && !was) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });
  io.observe(canvas);

  let raf = 0;
  let last = performance.now();
  function frame(now: number) {
    if (disposed || !visible) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    t += dt;
    const R = RIG[pose];
    const g = gpu.get(pose)!;
    const eyes = !!(R.eyes && g.eyes);

    seqT += dt;
    for (let s = seq[0]; s && s[0] <= seqT; s = seq[0]) {
      seq.shift();
      s[1]();
    }
    if (!seq.length && t > nextAct) {
      if (pose === 'rest' && wanted === 'wave' && gpu.has('wave')) {
        // Waving pose: the arm rests on the hip between waves.
        show('wave');
      } else {
        acts[pose]();
        const a = pose === 'rest' && wanted === 'wave' ? ([6, 10] as const) : again[pose];
        nextAct = a ? t + rnd(a[0], a[1]) : Infinity;
      }
    }
    if (eyes && t > nextBlink) {
      blinkT = 0.0001;
      nextBlink = t + (Math.random() < 0.2 ? 0.35 : rnd(2, 5.5));
    }
    const calm = pose === 'rest' || pose === 'wave' || pose === 'coffee';
    if (eyes) {
      // The eyes follow the pointer while it moves, otherwise they glance around now and then.
      if (pointer && t - pointerT < 3 && pose !== 'shrug') {
        const r = canvas.getBoundingClientRect();
        const dx = pointer[0] - (r.left + r.width * 0.42);
        const dy = pointer[1] - (r.top + r.height * 0.47);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / (r.width * 1.2));
        S.gx.t = (dx / d) * k * 7;
        S.gy.t = (dy / d) * k * 6;
        if (pose === 'rest' && !seq.length) S.head.t = (dx / d) * k * 0.05;
      } else if (t > nextLook) {
        const centre = Math.random() < 0.35;
        S.gx.t = centre ? 0 : rnd(-6, 6);
        S.gy.t = centre ? 0 : rnd(-4, 5);
        if (pose === 'rest' && !seq.length) {
          S.head.t = S.gx.t * 0.008;
          S.lean.t = rnd(-0.015, 0.015);
        }
        nextLook = t + rnd(1.2, 3.5);
      }
    }
    if (calm && t > nextTwitch) {
      (Math.random() < 0.5 ? S.earL : S.earR).kick(Math.random() < 0.5 ? -6 : 6);
      nextTwitch = t + rnd(2.5, 6);
    }
    if (pose === 'rest' && !seq.length) {
      // Hands on hips shift with the breath, and now and then a small adjustment.
      S.armB.t = Math.sin(t * 1.7) * 0.035;
      S.armC.t = -Math.sin(t * 1.7 + 0.4) * 0.035;
      if (t > nextHands) {
        (Math.random() < 0.5 ? S.armB : S.armC).kick(rnd(-1.4, 1.4));
        nextHands = t + rnd(3, 7);
      }
    }
    const asleep = pose === 'sleep';
    zT += dt;
    if (asleep && zT > 1.1) {
      zT = 0;
      zzz();
    }
    const tailSpeed = asleep ? 0.7 : pose === 'cheer' ? 4 : 1.7;
    S.tail.t = Math.sin(t * tailSpeed) * (asleep ? 0.05 : 0.12) + Math.sin(t * 0.63) * 0.05;
    if (blinkT > 0) {
      blinkT += dt;
      const d = 0.16;
      blink = blinkT < d / 2 ? blinkT / (d / 2) : Math.max(0, 1 - (blinkT - d / 2) / (d * 0.7));
      if (blinkT > d * 1.3) blinkT = blink = 0;
    }
    for (const s of Object.values(S)) s.step(dt);

    const sq = S.sq.x + Math.sin(t * (asleep ? 1.1 : 1.7)) * (asleep ? 0.022 : 0.012);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    if (g.eyes) {
      gl!.activeTexture(gl!.TEXTURE1);
      gl!.bindTexture(gl!.TEXTURE_2D, g.eyes[0]);
      gl!.activeTexture(gl!.TEXTURE2);
      gl!.bindTexture(gl!.TEXTURE_2D, g.eyes[1]);
    }
    gl!.uniform4fv(U.fit, R.fit ?? [1, 1, 0, 0]);
    const pv = R.piv;
    gl!.uniform2fv(U.pEarL, pv.earL);
    gl!.uniform2fv(U.pEarR, pv.earR);
    gl!.uniform2fv(U.pA, pv.armA);
    gl!.uniform2fv(U.pTail, pv.tail);
    gl!.uniform2fv(U.pHead, pv.head);
    gl!.uniform2fv(U.pB, pv.armB);
    gl!.uniform2fv(U.pC, pv.armC);
    for (const k of BONES) gl!.uniform1f(U[k], S[k].x);
    gl!.uniform1f(U.sx, 1 - sq * 0.8);
    gl!.uniform1f(U.sy, 1 + sq);
    gl!.uniform1f(U.ty, S.ty.x);
    gl!.uniform1f(U.blink, eyes ? blink : 0);
    const gs = eyes ? (pose === 'rest' || pose === 'wave' ? 1 : 0.8) : 0;
    gl!.uniform2f(U.gaze, S.gx.x * gs, S.gy.x * gs);
    if (R.eyes) {
      gl!.uniform4fv(U.eyeL, R.eyes[0]);
      gl!.uniform4fv(U.eyeR, R.eyes[1]);
    }
    const draw = (l: GpuLayer, withEyes: boolean) => {
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, l.tex);
      attr(l.w1, 'w1', 4);
      attr(l.w2, 'w2', 3);
      gl!.uniform1f(U.eyesOn, withEyes ? 1 : 0);
      gl!.drawElements(gl!.TRIANGLES, idx.length, gl!.UNSIGNED_INT, 0);
    };
    if (g.layers.back) draw(g.layers.back, false);
    draw(g, eyes);
    if (g.layers.body) draw(g.layers.body, false);
    if (g.layers.head) draw(g.layers.head, false);
    raf = requestAnimationFrame(frame);
  }
  // The waving pose drops its arm back to the hip between waves.
  const preloadRest = () =>
    fetchPose('rest').then(
      (r) => !disposed && r[2] === outfitKey(outfit) && upload('rest', ...r),
      () => {},
    );
  if (firstPose === 'wave') preloadRest();
  raf = requestAnimationFrame(frame);

  return {
    setPose(p) {
      wanted = p;
      if (p === 'wave') preloadRest();
      if (p === pose && gpu.get(p)?.dressed === outfitKey(outfit)) return;
      fetchPose(p).then(
        (r) => {
          if (disposed || wanted !== p || r[2] !== outfitKey(outfit)) return;
          const fresh = !gpu.has(p) || p !== pose;
          upload(p, ...r);
          if (fresh) show(p);
        },
        () => {
          // Keep the pose on screen; the next change tries again.
        },
      );
    },
    setOutfit(o) {
      if (outfitKey(o) === outfitKey(outfit)) return;
      outfit = o;
      // Every pose already on the GPU redresses as soon as its pieces are in.
      for (const p of gpu.keys())
        fetchPose(p).then(
          (r) => !disposed && r[2] === outfitKey(outfit) && upload(p, ...r),
          () => {},
        );
    },
    tap() {
      if (pose === 'sleep') acts.sleep();
      else hop();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      removeEventListener('pointermove', onPointer);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
