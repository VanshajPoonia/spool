import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/*
 * A low-poly airliner folded from strip paper: the body in the strip's colour, the fin in the
 * repo's livery, engines and gear in holder black. Built once and shared by every plane on the field.
 * Local axes: nose toward +X, up +Y, right wing toward +Z. The wheels sit at y = -GEAR_H.
 */

export const GEAR_H = 0.46;

type Parts = { body: THREE.BufferGeometry; fin: THREE.BufferGeometry; dark: THREE.BufferGeometry; gear: THREE.BufferGeometry };

let parts: Parts | null = null;

function flat(shape: [number, number][], depth: number) {
  const s = new THREE.Shape(shape.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
}

/* A swept planform in the XZ plane, centred on its own thickness. */
function planform(shape: [number, number][], depth: number) {
  const g = flat(shape, depth);
  g.rotateX(Math.PI / 2);
  g.translate(0, depth / 2, 0);
  return g;
}

function prep(g: THREE.BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.computeVertexNormals();
  return n;
}

function build(): Parts {
  // Fuselage: a lathe from tail (y = 0) to nose (y = 3.3), turned to lie along +X.
  const profile: [number, number][] = [
    [0.02, 0],
    [0.11, 0.22],
    [0.22, 0.62],
    [0.29, 1.1],
    [0.3, 1.6],
    [0.3, 2.45],
    [0.27, 2.82],
    [0.19, 3.08],
    [0.08, 3.26],
    [0, 3.32],
  ];
  const fuselage = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    8,
  );
  fuselage.rotateZ(-Math.PI / 2);
  fuselage.translate(-1.62, 0, 0);
  // The tail cone sweeps up a little, as airliners' do.
  const pos = fuselage.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    if (x < -0.6) pos.setY(i, pos.getY(i) + (-0.6 - x) * 0.13);
  }

  const wing = planform(
    [
      [0.55, -0.3],
      [-0.3, -1.85],
      [-0.6, -1.85],
      [-0.44, -0.3],
      [-0.44, 0.3],
      [-0.6, 1.85],
      [-0.3, 1.85],
      [0.55, 0.3],
    ],
    0.07,
  );
  wing.translate(0.12, -0.13, 0);

  const tailplane = planform(
    [
      [0.0, -0.1],
      [-0.36, -0.82],
      [-0.55, -0.82],
      [-0.42, -0.1],
      [-0.42, 0.1],
      [-0.55, 0.82],
      [-0.36, 0.82],
      [0.0, 0.1],
    ],
    0.05,
  );
  tailplane.translate(-1.22, 0.16, 0);

  const fin = flat(
    [
      [-0.8, 0.12],
      [-1.38, 1.02],
      [-1.66, 1.02],
      [-1.62, 0.12],
    ],
    0.06,
  );
  fin.translate(0, 0.02, -0.03);

  const engine = () => {
    const e = new THREE.CylinderGeometry(0.14, 0.115, 0.6, 8, 1, false);
    e.rotateZ(Math.PI / 2);
    return e;
  };
  const engL = engine();
  engL.translate(0.32, -0.34, -0.78);
  const engR = engine();
  engR.translate(0.32, -0.34, 0.78);

  // A dark band for the cockpit glass.
  const glass = new THREE.CylinderGeometry(0.228, 0.285, 0.17, 8, 1, true, -Math.PI * 0.95, Math.PI * 0.9);
  glass.rotateZ(-Math.PI / 2);
  glass.translate(1.3, 0, 0);

  const wheel = (x: number, z: number, h: number) => {
    const w = new THREE.BoxGeometry(0.12, h, 0.1);
    w.translate(x, -0.18 - h / 2 + 0.06, z);
    return w;
  };

  return {
    body: mergeGeometries([fuselage, wing, tailplane].map(prep)),
    fin: prep(fin),
    dark: mergeGeometries([engL, engR, glass].map(prep)),
    gear: mergeGeometries([wheel(1.05, 0, 0.3), wheel(-0.04, -0.34, 0.34), wheel(-0.04, 0.34, 0.34)].map(prep)),
  };
}

export type LightMats = { red: THREE.Material; green: THREE.Material; white: THREE.Material };

export type PlaneModel = {
  root: THREE.Group;
  body: THREE.MeshStandardMaterial;
  fin: THREE.MeshStandardMaterial;
  gear: THREE.Mesh;
  beacon: THREE.Mesh;
  strobes: THREE.Mesh[];
};

let dot: THREE.SphereGeometry | null = null;

export function makePlane(dark: THREE.Material, lights: LightMats): PlaneModel {
  parts ??= build();
  dot ??= new THREE.SphereGeometry(0.055, 6, 4);
  const body = new THREE.MeshStandardMaterial({ color: 0xf1dfa6, roughness: 0.92, metalness: 0, flatShading: true });
  const fin = new THREE.MeshStandardMaterial({ color: 0xe8412f, roughness: 0.85, metalness: 0, flatShading: true });

  const root = new THREE.Group();
  const add = (g: THREE.BufferGeometry, m: THREE.Material, shadow = true) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = shadow;
    root.add(mesh);
    return mesh;
  };
  add(parts.body, body);
  add(parts.fin, fin);
  add(parts.dark, dark);
  const gear = add(parts.gear, dark);
  gear.visible = false;

  const light = (m: THREE.Material, x: number, y: number, z: number) => {
    const l = new THREE.Mesh(dot!, m);
    l.position.set(x, y, z);
    root.add(l);
    return l;
  };
  // Port red, starboard green, a red beacon on the spine and white strobes on the tips.
  light(lights.red, -0.58, -0.1, -1.86);
  light(lights.green, -0.58, -0.1, 1.86);
  const beacon = light(lights.red, 0.1, 0.33, 0);
  const strobes = [light(lights.white, -0.5, -0.08, -1.9), light(lights.white, -0.5, -0.08, 1.9), light(lights.white, -1.66, 1.02, 0)];

  return { root, body, fin, gear, beacon, strobes };
}
