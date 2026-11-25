import * as THREE from 'three';

/**
 * A stand-in 3D troll built from simple shapes, used only until the artist's model
 * (public/troll/tusse.glb) exists. It has no outfits. Origin between the feet, about 2 units tall.
 */

const COL = {
  body: 0x7f9fd6,
  bodyDark: 0x6386c4,
  belly: 0xffffff,
  nose: 0xf29a74,
  navy: 0x14284a,
  hair: 0x1d3a63,
  orange: 0xe4572e,
  pink: 0xf2a093,
  tooth: 0xfffaf0,
};

function mat(color: number, opts: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0, ...opts });
}

function beanGeometry() {
  const pts: THREE.Vector2[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const u = t * 2 - 1;
    const p = 2.3;
    let r = 0.94 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), p)), 1 / p) * (1 - 0.07 * u);
    if (t < 0.08) r *= 0.75 + (t / 0.08) * 0.25;
    pts.push(new THREE.Vector2(Math.max(r, 0.0001), t * 2));
  }
  return new THREE.LatheGeometry(pts, 64);
}

interface Parts {
  eyes: THREE.Group[];
  face: THREE.Group;
  ears: THREE.Group[];
  arms: THREE.Group[];
  tail: THREE.Group;
  sway: THREE.Group;
  breathe: THREE.Group;
  look: number;
}

export interface Placeholder {
  root: THREE.Group;
  update(t: number, wave: boolean): void;
}

type Vec = [number, number, number];

export function buildPlaceholder(): Placeholder {
  const root = new THREE.Group();
  const sway = new THREE.Group();
  const breathe = new THREE.Group();
  root.add(sway);
  sway.add(breathe);
  const sphere = new THREE.SphereGeometry(1, 40, 28);

  const add = (
    parent: THREE.Object3D,
    geom: THREE.BufferGeometry,
    material: THREE.Material,
    pos?: Vec,
    scale?: Vec,
    rot?: Vec,
  ) => {
    const m = new THREE.Mesh(geom, material);
    if (pos) m.position.set(...pos);
    if (scale) m.scale.set(...scale);
    if (rot) m.rotation.set(...rot);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  add(breathe, beanGeometry(), mat(COL.body), [0, 0.12, 0], [1, 1, 0.92]);
  add(
    breathe,
    sphere,
    mat(COL.belly, { roughness: 0.95, emissive: 0x9aa8c0, emissiveIntensity: 0.25 }),
    [0, 0.72, 0.6],
    [0.48, 0.42, 0.32],
  );

  const face = new THREE.Group();
  breathe.add(face);

  const eyes: THREE.Group[] = [];
  const shine = { emissive: 0xffffff, emissiveIntensity: 0.25 };
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(0.31 * s, 1.5, 0.79);
    eye.rotation.y = 0.32 * s;
    face.add(eye);
    add(eye, sphere, mat(COL.navy, { roughness: 0.55 }), [0, 0, 0], [0.16, 0.21, 0.08]);
    add(eye, sphere, mat(0xffffff, shine), [0.05, 0.07, 0.07], [0.055, 0.065, 0.03]);
    add(eye, sphere, mat(0xffffff, shine), [-0.04, -0.09, 0.07], [0.025, 0.025, 0.015]);
    eyes.push(eye);
    add(
      face,
      new THREE.CapsuleGeometry(0.035, 0.16, 6, 12),
      mat(COL.navy),
      [0.3 * s, 1.8, 0.74],
      undefined,
      [0, 0.3 * s, Math.PI / 2 - 0.15 * s],
    );
    add(
      face,
      sphere,
      mat(COL.pink, { transparent: true, opacity: 0.55, roughness: 1 }),
      [0.62 * s, 1.24, 0.66],
      [0.13, 0.07, 0.04],
      [0, 0.75 * s, 0],
    );
  }

  add(face, sphere, mat(COL.nose, { roughness: 0.6 }), [0, 1.27, 0.93], [0.24, 0.17, 0.17]);

  const smile = new THREE.Shape();
  smile.moveTo(-0.17, 0);
  smile.bezierCurveTo(-0.12, -0.2, 0.12, -0.2, 0.17, 0);
  smile.closePath();
  const mouth = add(
    face,
    new THREE.ExtrudeGeometry(smile, {
      depth: 0.04,
      bevelEnabled: true,
      bevelSize: 0.012,
      bevelThickness: 0.012,
      bevelSegments: 3,
    }),
    mat(COL.navy, { roughness: 0.5 }),
    [0, 1.04, 0.86],
    undefined,
    [-0.18, 0, 0],
  );
  add(mouth, sphere, mat(COL.orange), [0, -0.1, 0.03], [0.08, 0.04, 0.02]);
  add(
    mouth,
    new THREE.ConeGeometry(0.03, 0.06, 12),
    mat(COL.tooth),
    [-0.09, -0.03, 0.045],
    undefined,
    [Math.PI, 0, 0],
  );

  const earPts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const r =
      0.25 * Math.pow(1 - t, 0.9) * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.6)));
    earPts.push(new THREE.Vector2(Math.max(0.0001, r), t * 0.66));
  }
  const earGeo = new THREE.LatheGeometry(earPts, 32);
  const ears: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0.74 * s, 1.5, 0.05);
    pivot.rotation.set(-0.25, 0, -1.0 * s);
    face.add(pivot);
    add(pivot, earGeo, mat(COL.body), [0, 0, 0], [1, 1, 0.42]);
    add(pivot, earGeo, mat(COL.pink, { roughness: 0.9 }), [0, 0.07, 0.06], [0.6, 0.78, 0.22]);
    ears.push(pivot);
  }

  const hair = new THREE.Group();
  hair.position.set(0, 2.02, 0.02);
  breathe.add(hair);
  const hairMat = mat(COL.hair, { roughness: 0.85 });
  for (const [x, y, z, r] of [
    [0, 0.06, 0, 0.2],
    [-0.17, 0, 0.03, 0.15],
    [0.17, 0.01, 0.02, 0.16],
    [-0.06, 0.18, -0.02, 0.13],
    [0.1, 0.17, 0, 0.12],
  ] as const) {
    add(hair, sphere, hairMat, [x, y, z], [r, r * 0.95, r * 0.9]);
  }

  const arms: THREE.Group[] = [];
  const armGeo = new THREE.CapsuleGeometry(0.13, 0.36, 8, 16);
  armGeo.translate(0, -0.25, 0);
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.74 * s, 1.08, 0.22);
    shoulder.rotation.set(-0.35, 0, 0.12 * s);
    breathe.add(shoulder);
    add(shoulder, armGeo, mat(COL.bodyDark));
    add(shoulder, sphere, mat(COL.bodyDark), [0, -0.5, 0.02], [0.15, 0.14, 0.14]);
    arms.push(shoulder);
  }

  for (const s of [-1, 1])
    add(root, sphere, mat(COL.bodyDark), [0.38 * s, 0.1, 0.18], [0.3, 0.14, 0.38]);

  const tail = new THREE.Group();
  tail.position.set(0.45, 0.35, -0.6);
  breathe.add(tail);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.45, -0.1, -0.15),
    new THREE.Vector3(0.85, 0.15, -0.1),
    new THREE.Vector3(0.95, 0.6, 0.05),
  ]);
  add(tail, new THREE.TubeGeometry(curve, 40, 0.07, 12), mat(COL.bodyDark));
  const tuft = new THREE.Group();
  tuft.position.copy(curve.getPoint(1));
  tail.add(tuft);
  for (const [x, y, z, r] of [
    [0, 0.08, 0, 0.16],
    [-0.1, 0, 0.05, 0.12],
    [0.11, 0.02, 0, 0.12],
    [0, 0.2, 0, 0.1],
    [0, 0, 0.1, 0.11],
  ] as const) {
    add(tuft, sphere, mat(COL.orange, { roughness: 0.85 }), [x, y, z], [r, r, r]);
  }

  const parts: Parts = { eyes, face, ears, arms, tail, sway, breathe, look: 0 };
  root.scale.setScalar(0.5);
  return { root, update: (t, wave) => animate(parts, t, wave) };
}

/** Idle loops matching the SVG troll's: breathe, sway, hop, blink, look around, ears, tail. */
function animate(p: Parts, t: number, wave: boolean) {
  const b = Math.sin((t / 3.2) * Math.PI * 2);
  p.breathe.scale.set(1 + 0.012 * b, 1 + 0.028 * b, 1 + 0.012 * b);
  p.sway.rotation.z = 0.035 * Math.sin((t / 5.3) * Math.PI * 2);
  const hp = (t % 6) / 6;
  p.sway.position.y = hp > 0.85 ? Math.sin(((hp - 0.85) / 0.15) * Math.PI) * 0.18 : 0;
  const bt = t % 4.1;
  const blink = bt < 0.14 ? Math.abs(Math.cos((bt / 0.14) * Math.PI)) : 1;
  for (const e of p.eyes) e.scale.y = Math.max(0.08, blink);
  const lp = (t % 9) / 9;
  const look = lp < 0.3 ? 0 : lp < 0.5 ? -1 : lp < 0.75 ? 1 : 0;
  p.look += (look - p.look) * 0.15;
  p.face.rotation.y = 0.12 * p.look;
  p.ears.forEach((ear, i) => {
    const s = i === 0 ? -1 : 1;
    const et = (t + i * 1.7) % 5;
    ear.rotation.z = -1.0 * s + (et < 0.35 ? 0.25 * Math.sin((et / 0.35) * Math.PI) * s : 0);
  });
  p.tail.rotation.y = 0.35 * Math.sin((t / 2.4) * Math.PI * 2);
  p.tail.rotation.z = 0.12 * Math.sin((t / 2.4) * Math.PI * 2 + 1);
  const [l, r] = p.arms as [THREE.Group, THREE.Group];
  l.rotation.z = -0.12 - 0.03 * b;
  if (wave) {
    r.rotation.z = 2.5 + 0.35 * Math.sin(t * 7);
    r.rotation.x = 0.6;
  } else {
    r.rotation.z = 0.12 + 0.03 * b;
    r.rotation.x = -0.35;
  }
}
