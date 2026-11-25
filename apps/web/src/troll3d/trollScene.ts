import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ItemId, Outfit } from '../components/outfits';
import type { TussePose } from '../components/Tusse';
import { buildPlaceholder } from './placeholder';

/**
 * Renders the troll in 3D on a canvas. Loads the artist's model from public/troll/tusse.glb
 * when it exists, and falls back to the built-in placeholder otherwise.
 *
 * The model contract (see docs/troll-3d.md): Y up, about 1 unit tall, origin between the feet,
 * facing +Z; animation clips named after poses; one node per outfit item named `outfit_<id>`;
 * props named `prop_mug` and `prop_rock`.
 */
export const MODEL_URL = `${import.meta.env.BASE_URL}troll/tusse.glb`;

/** The clip each pose plays. Poses without their own clip fall back to idle. */
export const CLIP_FOR_POSE: Record<TussePose, string> = {
  rest: 'idle',
  coffee: 'coffee',
  thumbs: 'thumbs',
  shrug: 'shrug',
  cheer: 'cheer',
  wave: 'wave',
  sleep: 'sleep',
};

const ALL_ITEMS: ItemId[] = [
  'helmet',
  'lue',
  'glasses',
  'scarf',
  'sweater',
  'anorak',
  'slippers',
  'cape',
];

export interface TrollScene {
  setPose(pose: TussePose): void;
  setOutfit(outfit: Outfit): void;
  dispose(): void;
}

interface Figure {
  root: THREE.Object3D;
  update(t: number, dt: number): void;
  setPose(pose: TussePose): void;
  setOutfit(outfit: Outfit): void;
}

async function modelExists(): Promise<boolean> {
  try {
    const res = await fetch(MODEL_URL, { method: 'HEAD' });
    return res.ok && !(res.headers.get('content-type') ?? '').includes('text/html');
  } catch {
    return false;
  }
}

async function loadModel(): Promise<Figure> {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
  const root = gltf.scene;
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  const mixer = new THREE.AnimationMixer(root);
  const clips = new Map(gltf.animations.map((clip) => [clip.name, clip]));
  let current: THREE.AnimationAction | undefined;
  const play = (name: string) => {
    const clip = clips.get(name) ?? clips.get('idle');
    if (!clip) return;
    const next = mixer.clipAction(clip);
    if (next === current) return;
    next.reset().fadeIn(0.25).play();
    current?.fadeOut(0.25);
    current = next;
  };
  return {
    root,
    update: (_t, dt) => mixer.update(dt),
    setPose(pose) {
      play(CLIP_FOR_POSE[pose]);
      const mug = root.getObjectByName('prop_mug');
      if (mug) mug.visible = pose === 'coffee';
    },
    setOutfit(outfit) {
      const worn = new Set(Object.values(outfit));
      for (const id of ALL_ITEMS) {
        const node = root.getObjectByName(`outfit_${id}`);
        if (node) node.visible = worn.has(id);
      }
    },
  };
}

function placeholderFigure(): Figure {
  const p = buildPlaceholder();
  let wave = false;
  return {
    root: p.root,
    update: (t) => p.update(t, wave),
    setPose: (pose) => {
      wave = pose === 'wave' || pose === 'cheer';
    },
    // The placeholder has no outfits.
    setOutfit: () => undefined,
  };
}

export async function mountTroll(
  canvas: HTMLCanvasElement,
  { pose, outfit }: { pose: TussePose; outfit: Outfit },
): Promise<TrollScene> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.68, 3.6);
  camera.lookAt(0, 0.52, 0);

  scene.add(new THREE.HemisphereLight(0xeef4ff, 0x8a96b0, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-1.5, 2.5, 2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 2, bottom: -0.5 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe2cc, 1.2);
  rim.position.set(1.8, 1.2, -1.5);
  scene.add(rim);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 48),
    new THREE.ShadowMaterial({ opacity: 0.16 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const figure = (await modelExists()) ? await loadModel() : placeholderFigure();
  scene.add(figure.root);
  figure.setPose(pose);
  figure.setOutfit(outfit);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const clock = new THREE.Clock();
  let frame = 0;
  let visible = true;
  const tick = () => {
    frame = requestAnimationFrame(tick);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    figure.update(clock.elapsedTime, dt);
    renderer.render(scene, camera);
  };
  // Stop drawing while the canvas is scrolled away.
  const io = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
  });
  io.observe(canvas);
  tick();

  return {
    setPose: (p) => figure.setPose(p),
    setOutfit: (o) => figure.setOutfit(o),
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      io.disconnect();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          const m = mesh.material;
          (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
        }
      });
      renderer.dispose();
    },
  };
}
