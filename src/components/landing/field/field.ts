import * as THREE from "three";
import { print } from "@/components/print/engine";
import { GEAR_H, makePlane, type PlaneModel } from "./plane";

/*
 * The airfield: every PR is a flight under its repo's callsign and its number.
 * PRs waiting on review circle in a stacked hold. Clearance draws an amber branch from the plane
 * down to the runway called MAIN; touchdown is the merge, and the branch folds back into main.
 *
 * World axes: the runway runs along X and planes land toward -X. The camera sits to the south (+Z).
 */

export type Phase = "holding" | "cleared" | "final" | "landed";

export type FlightRef = {
  id: string;
  code: string;
  num: number;
  kind: "pr" | "review" | "plain";
  livery: [string, string];
};

export type FieldClasses = { label: string; leader: string; block: string; code: string; state: string; ring: string };

export type FieldOptions = {
  arrivals: FlightRef[];
  stalled: FlightRef & { quiet: number };
  parked: FlightRef[];
  still: boolean;
  cls: FieldClasses;
  onFocus: (id: string, phase: Phase) => void;
};

export type Field = {
  /** clear the plane at the bottom of the stack to land; false when none is ready */
  clear: () => boolean;
  /** run on the clock, for a landing someone asked for */
  setRunning: (on: boolean) => void;
  /** move the field on by this many seconds, paid out over the next frames; the page's scroll calls it */
  drive: (seconds: number) => void;
  dispose: () => void;
};

/* ---------- paths ---------- */

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

class Track {
  pts: THREE.Vector3[];
  cum: number[];
  length: number;
  constructor(pts: THREE.Vector3[]) {
    this.pts = pts.filter((p, i) => i === 0 || p.distanceToSquared(pts[i - 1]) > 1e-8);
    this.cum = [0];
    for (let i = 1; i < this.pts.length; i++) this.cum.push(this.cum[i - 1] + this.pts[i].distanceTo(this.pts[i - 1]));
    this.length = this.cum[this.cum.length - 1];
  }
  at(d: number, out: THREE.Vector3) {
    const c = this.cum;
    const t = Math.min(Math.max(d, 0), this.length);
    let lo = 0;
    let hi = c.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (c[mid] <= t) lo = mid;
      else hi = mid;
    }
    const span = c[hi] - c[lo] || 1;
    return out.lerpVectors(this.pts[lo], this.pts[hi], (t - c[lo]) / span);
  }
}

function bezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, n = 80) {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push(
      V(0, 0, 0)
        .addScaledVector(p0, u * u * u)
        .addScaledVector(p1, 3 * u * u * t)
        .addScaledVector(p2, 3 * u * t * t)
        .addScaledVector(p3, t * t * t),
    );
  }
  return out;
}

const len = (pts: THREE.Vector3[]) => pts.reduce((a, p, i) => (i ? a + p.distanceTo(pts[i - 1]) : 0), 0);

/* The holding pattern: a racetrack behind the runway, entered at the start of the near leg. */
const HOLD = { cx: 5, cz: -14.5, a: 10, r: 4.6 };
const LEVELS = [7.4, 9.9, 12.4];

function holdTrack() {
  const { cx, cz, a, r } = HOLD;
  const pts: THREE.Vector3[] = [];
  const n = 40;
  for (let i = 0; i <= n; i++) pts.push(V(cx - a + (2 * a * i) / n, 0, cz + r));
  for (let i = 1; i <= n; i++) {
    const al = (Math.PI * i) / n;
    pts.push(V(cx + a + r * Math.sin(al), 0, cz + r * Math.cos(al)));
  }
  for (let i = 1; i <= n; i++) pts.push(V(cx + a - (2 * a * i) / n, 0, cz - r));
  for (let i = 1; i <= n; i++) {
    const al = (Math.PI * i) / n;
    pts.push(V(cx - a - r * Math.sin(al), 0, cz - r * Math.cos(al)));
  }
  return new Track(pts);
}

const RUNWAY = { x0: -24, x1: 24, w: 3.6 };
const FAF = V(33, 4.1, 0);
const TOUCH = V(16, 0, 0);
const LANE_Z = 8.6;
const TURNOFF_X = -13;
const ARRIVE_FROM = V(-86, 16, -40);
const STALL = { x: -22, y: 8.2, z: -15, r: 3.2 };
const STANDS = [V(6.5, 0, 12.2), V(12, 0, 12.2)];

/* From wherever the plane is in the hold: out, round onto final, down onto MAIN, off at the taxiway and away. */
function landingTrack(p: THREE.Vector3, h: THREE.Vector3) {
  const away = h.x < 0;
  const exit = bezier(p, p.clone().addScaledVector(h, away ? 9 : 14).setY(p.y - 0.4), FAF.clone().add(V(8, 0.8, 0)), FAF, 120);
  const fin = bezier(FAF, V(26.5, 1.9, 0), V(21.5, 0.14, 0), TOUCH, 70);
  const roll = [TOUCH, V(-7, 0, 0)];
  const turn = bezier(V(-7, 0, 0), V(TURNOFF_X + 2, 0, 0), V(TURNOFF_X, 0, 1.8), V(TURNOFF_X, 0, 5), 30);
  const lane = bezier(V(TURNOFF_X, 0, 5), V(TURNOFF_X, 0, LANE_Z - 0.6), V(TURNOFF_X - 2, 0, LANE_Z), V(TURNOFF_X - 4, 0, LANE_Z), 20);
  const out = [V(TURNOFF_X - 4, 0, LANE_Z), V(-110, 0, LANE_Z)];
  const marks = { fin: len(exit) };
  const touch = marks.fin + len(fin);
  const turned = touch + len(roll);
  const track = new Track([...exit, ...fin.slice(1), ...roll.slice(1), ...turn.slice(1), ...lane.slice(1), ...out.slice(1)]);
  return { track, fin: marks.fin, touch, turned, taxi: turned + len(turn) + len(lane) };
}

function arrivalTrack(y: number) {
  const entry = V(HOLD.cx - HOLD.a, y, HOLD.cz + HOLD.r);
  return new Track(bezier(ARRIVE_FROM, ARRIVE_FROM.clone().add(V(22, -1, 9)), entry.clone().add(V(-16, 0.6, 0)), entry, 100));
}

/* A curve over a track, for the branch tube. */
class TrackCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private t: Track,
    private upto: number,
  ) {
    super();
  }
  getPoint(u: number, out = new THREE.Vector3()) {
    this.t.at(u * this.upto, out);
    out.y += 0.05;
    return out;
  }
}

/* ---------- theme ---------- */

function tokens(el: Element) {
  const cs = getComputedStyle(el);
  const get = (n: string, fb: string) => cs.getPropertyValue(n).trim() || fb;
  const light = document.documentElement.dataset.theme === "light";
  return {
    light,
    bg: get("--console", "#14181d"),
    rule: get("--rule-2", "#3b4551"),
    holder: light ? "#3a3f47" : "#16171a",
    lane: light ? "#d9dce0" : "#1c1d20",
    paint: light ? "#ffffff" : "#c9ced6",
    move: get("--move", "#f2c94c"),
    pencil: get("--pencil", "#eb5757"),
    landed: get("--landed", "#4cb782"),
    tower: light ? "#c9cdd3" : "#2a2c31",
    glass: light ? "#8ea4b8" : "#d0d6e0",
    edge: light ? "#f6f1e2" : "#e8e4d8",
    dim: light ? "#a3a9b4" : "#2c2e33",
    // Planes are neutral; their tails carry the kind's colour, like the label dots.
    body: light ? "#ffffff" : "#d7dae0",
    kind: {
      pr: get("--strip-pr", "#9b8afb"),
      review: get("--strip-review", "#f087b5"),
      plain: get("--strip-plain", "#8a8f98"),
    } as Record<FlightRef["kind"], string>,
    font: get("--font-geist-mono", "monospace"),
  };
}

/* ---------- the field ---------- */

type Mode = "hold" | "arrive" | "land" | "park" | "orbit" | "idle";

type Sim = {
  m: PlaneModel;
  f: FlightRef;
  mode: Mode;
  level: number;
  y: number;
  hd: number;
  ang: number;
  route: ReturnType<typeof landingTrack> | null;
  track: Track | null;
  d: number;
  v: number;
  pos: THREE.Vector3;
  heading: number;
  pitch: number;
  roll: number;
  held: number;
  touched: number;
  phase: Phase | null;
  text: string;
  blink: number;
  label: { root: HTMLElement; code: HTMLElement; state: HTMLElement };
};

const smooth = (k: number, dt: number) => 1 - Math.exp(-k * dt);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
const easeInOut = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const FOG_NEAR = 70;
const FOG_FAR = 165;
const TUBE_SEG = 260;
const TUBE_RAD = 5;

export function createField(host: HTMLElement, labels: HTMLElement, opts: FieldOptions): Field {
  const { cls, still } = opts;
  let T = tokens(host);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  // 1.5x is still crisp with antialiasing and draws half the pixels of 2x, which keeps the GPU free to scroll the page.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(T.bg, FOG_NEAR, FOG_FAR);
  const camera = new THREE.PerspectiveCamera(26, 2, 1, 400);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1.4);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(-34, 70, 44);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 60, bottom: -60, near: 10, far: 200 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  // The ground only shows what falls on it: shadows. The page shows through everywhere else.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.5 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(260, 65);
  const gridMat = grid.material as THREE.LineBasicMaterial;
  gridMat.vertexColors = false;
  gridMat.transparent = true;
  gridMat.depthWrite = false;
  grid.position.y = 0.002;
  scene.add(grid);

  /* runway, taxiway, stands */
  const slab = (w: number, d: number, h: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  const runwayMat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  const laneMat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  slab(RUNWAY.x1 - RUNWAY.x0, RUNWAY.w, 0.06, runwayMat).position.set(0, 0.03, 0);
  slab(1.7, LANE_Z - RUNWAY.w / 2 + 0.85, 0.04, laneMat).position.set(TURNOFF_X, 0.02, (RUNWAY.w / 2 + LANE_Z + 0.85) / 2 - 0.4);
  slab(140, 1.7, 0.04, laneMat).position.set(-52, 0.02, LANE_Z);
  slab(15, 5.6, 0.04, laneMat).position.set(9.2, 0.02, 12);

  const paintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const laneLineMat = new THREE.MeshBasicMaterial({ color: 0xffb21e });

  // Centreline dashes: these flash amber from the touchdown point when a branch lands.
  const dashXs: number[] = [];
  for (let x = RUNWAY.x0 + 3.2; x <= RUNWAY.x1 - 5; x += 2.6) if (x < -4.4 || x > 7.6) dashXs.push(x);
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 0.012, 0.13), new THREE.MeshBasicMaterial({ color: 0xffffff }), dashXs.length);
  const tmp = new THREE.Object3D();
  dashXs.forEach((x, i) => {
    tmp.position.set(x, 0.066, 0);
    tmp.updateMatrix();
    dashes.setMatrixAt(i, tmp.matrix);
    dashes.setColorAt(i, new THREE.Color(0xffffff));
  });
  scene.add(dashes);

  // Threshold bars at both ends.
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.012, 0.22), paintMat, 16);
  for (let i = 0; i < 16; i++) {
    const end = i < 8 ? RUNWAY.x1 - 1.6 : RUNWAY.x0 + 1.6;
    const k = i % 8;
    tmp.position.set(end, 0.066, -1.4 + k * 0.4);
    tmp.updateMatrix();
    bars.setMatrixAt(i, tmp.matrix);
  }
  scene.add(bars);

  // Taxiway centreline, kept neutral: amber on the field belongs to the flight being brought in.
  const laneLine = new THREE.Mesh(new THREE.BoxGeometry(140, 0.012, 0.09), laneLineMat);
  laneLine.position.set(-52, 0.045, LANE_Z);
  scene.add(laneLine);
  const turnLine = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, LANE_Z - RUNWAY.w / 2), laneLineMat);
  turnLine.position.set(TURNOFF_X, 0.045, (LANE_Z + RUNWAY.w / 2) / 2);
  scene.add(turnLine);

  // MAIN, painted mid-runway so it reads from the south.
  const textCanvas = document.createElement("canvas");
  textCanvas.width = 1024;
  textCanvas.height = 256;
  const textTex = new THREE.CanvasTexture(textCanvas);
  textTex.colorSpace = THREE.SRGBColorSpace;
  textTex.anisotropy = 4;
  const textMat = new THREE.MeshBasicMaterial({ map: textTex, transparent: true, depthWrite: false });
  const word = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.4), textMat);
  word.rotation.x = -Math.PI / 2;
  word.position.set(1.6, 0.07, 0);
  scene.add(word);
  const paintWord = () => {
    const c = textCanvas.getContext("2d")!;
    c.clearRect(0, 0, 1024, 256);
    c.fillStyle = T.paint;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `700 210px ${T.font}`;
    (c as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "40px";
    c.fillText("MAIN", 532, 138);
    textTex.needsUpdate = true;
  };

  /* lights: edges, thresholds, the approach rabbit */
  const lightBox = new THREE.BoxGeometry(0.16, 0.12, 0.16);
  const edgeSpots: [number, number, "edge" | "green" | "red"][] = [];
  for (let x = RUNWAY.x0 + 1; x <= RUNWAY.x1 - 1; x += 3) {
    edgeSpots.push([x, -RUNWAY.w / 2 - 0.25, "edge"], [x, RUNWAY.w / 2 + 0.25, "edge"]);
  }
  for (let z = -1.6; z <= 1.6; z += 0.53) edgeSpots.push([RUNWAY.x1 + 0.2, z, "green"], [RUNWAY.x0 - 0.2, z, "red"]);
  const edgeLights = new THREE.InstancedMesh(lightBox, new THREE.MeshBasicMaterial({ color: 0xffffff }), edgeSpots.length);
  edgeSpots.forEach(([x, z], i) => {
    tmp.position.set(x, 0.07, z);
    tmp.updateMatrix();
    edgeLights.setMatrixAt(i, tmp.matrix);
  });
  scene.add(edgeLights);

  const rabbitXs: number[] = [];
  for (let x = RUNWAY.x1 + 2; x <= RUNWAY.x1 + 15; x += 1.45) rabbitXs.push(x);
  const rabbit = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.1, 1.5), new THREE.MeshBasicMaterial({ color: 0xffffff }), rabbitXs.length);
  rabbitXs.forEach((x, i) => {
    tmp.position.set(x, 0.06, 0);
    tmp.updateMatrix();
    rabbit.setMatrixAt(i, tmp.matrix);
    rabbit.setColorAt(i, new THREE.Color(0xffffff));
  });
  scene.add(rabbit);

  /* the tower, where Spool sits */
  const towerMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, flatShading: true });
  const glassMat = new THREE.MeshBasicMaterial({ color: 0xf1dfa6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0c0f12, roughness: 0.8, metalness: 0, flatShading: true });
  const tower = new THREE.Group();
  const part = (g: THREE.BufferGeometry, m: THREE.Material, y: number) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.y = y;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    tower.add(mesh);
    return mesh;
  };
  part(new THREE.CylinderGeometry(0.62, 0.95, 6.2, 8), towerMat, 3.1);
  part(new THREE.CylinderGeometry(1.25, 0.8, 0.5, 8), towerMat, 6.45);
  part(new THREE.CylinderGeometry(1.15, 1.22, 1.0, 8), glassMat, 7.2);
  part(new THREE.CylinderGeometry(1.4, 1.2, 0.22, 8), darkMat, 7.82);
  part(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 4), darkMat, 8.55);
  tower.position.set(-15, 0, -7);
  scene.add(tower);

  const lights = {
    red: new THREE.MeshBasicMaterial({ color: 0xff3b2e }),
    green: new THREE.MeshBasicMaterial({ color: 0x46e08a }),
    white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  };
  const towerTip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 4), lights.red);
  towerTip.position.y = 9.25;
  tower.add(towerTip);

  /* the hold, drawn faintly where the stack circles */
  const hold = holdTrack();
  const holdPts = hold.pts.map((p) => p.clone().setY(LEVELS[0]));
  const holdLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(holdPts),
    new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.7, gapSize: 0.7, transparent: true, opacity: 0.4 }),
  );
  holdLine.computeLineDistances();
  scene.add(holdLine);

  const stallPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    stallPts.push(V(STALL.x + Math.cos(a) * STALL.r, STALL.y, STALL.z + Math.sin(a) * STALL.r));
  }
  const stallLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(stallPts),
    new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.5, gapSize: 0.5, transparent: true, opacity: 0.55 }),
  );
  stallLine.computeLineDistances();
  scene.add(stallLine);

  /* the branch: amber, from the plane's clearance to the touchdown point */
  const branchMat = new THREE.MeshBasicMaterial({ color: 0xffb21e });
  let branch: THREE.Mesh | null = null;
  let branchShow = 0;
  let branchGone = 0;
  let branchStart = -1;
  let branchRetract = -1;
  let pulseAt = -1;

  /* tyre smoke */
  const puffGeo = new THREE.IcosahedronGeometry(0.2, 0);
  const puffs = Array.from({ length: 12 }, () => {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0, flatShading: true, depthWrite: false });
    const m = new THREE.Mesh(puffGeo, mat);
    m.visible = false;
    scene.add(m);
    return { m, mat, age: 99, vx: 0, vy: 0, vz: 0 };
  });
  let puffNext = 0;
  const puff = (x: number, z: number) => {
    for (let i = 0; i < 3; i++) {
      const p = puffs[puffNext++ % puffs.length];
      p.age = 0;
      p.m.position.set(x + Math.random() * 0.3, 0.12, z + (Math.random() - 0.5) * 0.2);
      p.vx = 0.8 + Math.random() * 0.9;
      p.vy = 0.35 + Math.random() * 0.25;
      p.vz = (Math.random() - 0.5) * 0.5;
      p.m.visible = true;
    }
  };

  /* ---------- planes ---------- */

  const sims: Sim[] = [];
  let queueAt = 0;
  let clock = 0;

  const makeLabel = () => {
    const root = document.createElement("div");
    root.className = cls.label;
    const leader = document.createElement("span");
    leader.className = cls.leader;
    const block = document.createElement("span");
    block.className = cls.block;
    const code = document.createElement("span");
    code.className = cls.code;
    const state = document.createElement("span");
    state.className = cls.state;
    block.append(code, state);
    root.append(leader, block);
    labels.appendChild(root);
    return { root, code, state };
  };

  const dress = (s: Sim, f: FlightRef) => {
    s.f = f;
    s.m.body.color.set(T.body);
    s.m.fin.color.set(T.kind[f.kind]);
    s.label.code.textContent = `${f.code}${f.num}`;
    s.label.root.dataset.kind = f.kind;
  };

  const spawn = (f: FlightRef, mode: Mode): Sim => {
    let s = sims.find((x) => x.mode === "idle");
    if (!s) {
      const m = makePlane(darkMat, lights);
      scene.add(m.root);
      s = {
        m,
        f,
        mode,
        level: 0,
        y: 0,
        hd: 0,
        ang: 0,
        route: null,
        track: null,
        d: 0,
        v: 8,
        pos: V(0, 0, 0),
        heading: 0,
        pitch: 0,
        roll: 0,
        held: 0,
        touched: -1,
        phase: null,
        text: "",
        blink: Math.random() * 2,
        label: makeLabel(),
      };
      sims.push(s);
    }
    Object.assign(s, { mode, route: null, track: null, d: 0, held: 0, touched: -1, phase: null, text: "", roll: 0, pitch: 0 });
    s.m.root.visible = true;
    s.m.gear.visible = mode === "park";
    s.m.beacon.visible = mode !== "park";
    s.label.root.style.display = "";
    delete s.label.root.dataset.focus;
    delete s.label.root.dataset.tone;
    dress(s, f);
    return s;
  };

  const setText = (s: Sim, text: string) => {
    if (s.text === text) return;
    s.text = text;
    print(s.label.state, text, { speed: 30 });
  };

  const nextArrival = () => opts.arrivals[queueAt++ % opts.arrivals.length];

  // The stack: three PRs in review, staggered round the hold.
  const lapOffsets = [0.66, 0.16, 0.42];
  for (let i = 0; i < 3; i++) {
    const s = spawn(nextArrival(), "hold");
    s.level = i;
    s.y = LEVELS[i];
    s.hd = hold.length * lapOffsets[i];
    s.v = 8;
  }

  const stalled = spawn(opts.stalled, "orbit");
  stalled.v = 4.6;
  stalled.ang = 1.1;
  stalled.label.root.dataset.tone = "stop";
  {
    // A pencil ring round the stalled count, like the one on its strip.
    const ring = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    ring.setAttribute("viewBox", "0 0 100 50");
    ring.setAttribute("preserveAspectRatio", "none");
    ring.setAttribute("class", cls.ring);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M58 6C30 4 6 10 5 25s22 21 46 20 46-6 45-21S70 3 40 7");
    ring.appendChild(path);
    stalled.label.state.after(ring);
  }

  opts.parked.forEach((f, i) => {
    const s = spawn(f, "park");
    s.pos.copy(STANDS[i]);
    s.heading = Math.PI / 2;
  });

  let focus: Sim | null = sims.find((s) => s.mode === "hold" && s.level === 0) ?? null;
  let focusPhase: Phase = "holding";
  let landing: Sim | null = null;
  let firstClear = true;

  const emit = () => {
    if (focus) opts.onFocus(focus.f.id, focusPhase);
  };

  const setFocus = (s: Sim | null, phase: Phase) => {
    if (focus && focus !== s) delete focus.label.root.dataset.focus;
    focus = s;
    focusPhase = phase;
    if (s) s.label.root.dataset.focus = "";
    emit();
  };

  const clearPlane = () => {
    const s = focus;
    if (!s || s.mode !== "hold" || landing) return false;
    const h = hold.at(s.hd + 0.6, V(0, 0, 0)).sub(hold.at(s.hd - 0.6, V(0, 0, 0))).normalize();
    const route = landingTrack(s.pos.clone().setY(s.y), h);
    Object.assign(s, { mode: "land" as Mode, route, track: route.track, d: 0 });
    landing = s;
    firstClear = false;
    for (const o of sims) if ((o.mode === "hold" || o.mode === "arrive") && o !== s) o.level = Math.max(0, o.level - 1);
    const a = spawn(nextArrival(), "arrive");
    a.level = 2;
    a.track = arrivalTrack(LEVELS[2]);
    a.v = 9;

    if (branch) {
      branch.geometry.dispose();
      scene.remove(branch);
    }
    branch = new THREE.Mesh(new THREE.TubeGeometry(new TrackCurve(route.track, route.touch), TUBE_SEG, 0.075, TUBE_RAD, false), branchMat);
    branch.geometry.setDrawRange(0, 0);
    scene.add(branch);
    branchStart = clock;
    branchRetract = -1;
    branchShow = 0;
    branchGone = 0;
    setFocus(s, "cleared");
    return true;
  };

  /* ---------- the camera ---------- */

  const target = V(0, 0, 0);
  const base = V(0, 0, 0);
  // How much farther back than the desktop framing the camera sits; fog and tag fading move with it.
  let fogShift = 0;
  const lookDir = V(0, 0, 0);
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

  const frame = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = camera.aspect >= 1.3;
    // Portrait screens look down a little steeper and keep the whole story in frame: the stalled
    // ring and the tower on the left, the hold in the middle, the touchdown on the right.
    lookDir.set(wide ? 0.1 : 0.14, wide ? 0.5 : 0.66, 1).normalize();
    target.set(wide ? 6.5 : -2.5, wide ? 3 : 4.6, wide ? -2.5 : -5.5);
    const halfW = wide ? 32 : 23;
    const halfH = wide ? 12.5 : 13;
    const vf = THREE.MathUtils.degToRad(camera.fov / 2);
    const hf = Math.atan(Math.tan(vf) * camera.aspect);
    const dist = Math.max(halfW / Math.tan(hf), halfH / Math.tan(vf));
    base.copy(target).addScaledVector(lookDir, dist);
    camera.far = dist + 220;
    camera.updateProjectionMatrix();
    // 58 is the desktop framing's distance; a camera pulled back for a portrait screen keeps the same haze.
    fogShift = Math.max(0, dist - 58);
    const fog = scene.fog as THREE.Fog;
    fog.near = FOG_NEAR + fogShift;
    fog.far = FOG_FAR + fogShift;
  };

  /* ---------- theme ---------- */

  const theme = () => {
    T = tokens(host);
    (scene.fog as THREE.Fog).color.set(T.bg);
    hemi.color.set(T.light ? "#ffffff" : "#c9d4e2");
    hemi.groundColor.set(T.light ? "#a9b3bd" : "#1b2129");
    hemi.intensity = T.light ? 1.9 : 1.55;
    sun.intensity = T.light ? 2.3 : 1.7;
    (ground.material as THREE.ShadowMaterial).opacity = T.light ? 0.16 : 0.42;
    gridMat.color.set(T.rule);
    gridMat.opacity = T.light ? 0.42 : 0.3;
    runwayMat.color.set(T.holder);
    laneMat.color.set(T.lane);
    paintMat.color.set(T.paint);
    laneLineMat.color.set(T.rule).lerp(new THREE.Color(T.paint), T.light ? 0 : 0.12);
    branchMat.color.set(T.move);
    towerMat.color.set(T.tower);
    glassMat.color.set(T.glass);
    darkMat.color.set(T.light ? "#283039" : "#0c0f12");
    (holdLine.material as THREE.LineDashedMaterial).color.set(T.light ? "#5a6571" : "#8b96a2");
    (stallLine.material as THREE.LineDashedMaterial).color.set(T.pencil);
    const c = new THREE.Color();
    edgeSpots.forEach(([, , kind], i) => edgeLights.setColorAt(i, c.set(kind === "green" ? T.landed : kind === "red" ? T.pencil : T.edge)));
    if (edgeLights.instanceColor) edgeLights.instanceColor.needsUpdate = true;
    for (const s of sims)
      if (s.mode !== "idle") {
        s.m.body.color.set(T.body);
        s.m.fin.color.set(T.kind[s.f.kind]);
      }
    paintWord();
  };

  /* ---------- the step ---------- */

  const p = V(0, 0, 0);
  const q = V(0, 0, 0);
  const projected = V(0, 0, 0);
  const paintC = new THREE.Color();
  const moveC = new THREE.Color();
  const dimC = new THREE.Color();
  const cTmp = new THREE.Color();

  const orient = (s: Sim, dt: number, ground: boolean, pitchExtra: number) => {
    const dx = s.pos.x - p.x;
    const dz = s.pos.z - p.z;
    const dy = s.pos.y - p.y;
    const horiz = Math.hypot(dx, dz);
    if (horiz > 1e-5) {
      const want = Math.atan2(-dz, dx);
      const before = s.heading;
      s.heading = wrap(s.heading + wrap(want - s.heading) * smooth(9, dt));
      const rate = dt > 0 ? wrap(s.heading - before) / dt : 0;
      const bank = ground ? 0 : THREE.MathUtils.clamp(-rate * 0.75, -0.62, 0.62);
      s.roll += (bank - s.roll) * smooth(4, dt);
      const climb = ground ? 0 : Math.atan2(dy, horiz) * 0.5;
      s.pitch += (climb + pitchExtra - s.pitch) * smooth(5, dt);
    }
    s.m.root.position.set(s.pos.x, s.pos.y + GEAR_H, s.pos.z);
    s.m.root.rotation.set(s.roll, s.heading, s.pitch, "YZX");
  };

  const step = (dt: number) => {
    clock += dt;

    for (const s of sims) {
      if (s.mode === "idle") continue;
      p.copy(s.pos);
      let ground = false;
      let pitchExtra = 0;

      if (s.mode === "hold") {
        s.hd = (s.hd + s.v * dt) % hold.length;
        s.y += (LEVELS[s.level] - s.y) * smooth(0.9, dt);
        hold.at(s.hd, s.pos);
        s.pos.y = s.y;
        setText(s, "IN REVIEW");
      } else if (s.mode === "arrive" && s.track) {
        s.d += s.v * dt;
        s.track.at(s.d, s.pos);
        setText(s, "OPENED");
        if (s.d >= s.track.length) {
          s.mode = "hold";
          s.hd = 0;
          s.y = s.pos.y;
          s.track = null;
        }
      } else if (s.mode === "land" && s.route) {
        const r = s.route;
        const want = s.d < r.fin ? 11 : s.d < r.touch ? 8 : s.d < r.turned ? 1.7 : s.d < r.taxi ? 2.3 : 3.4;
        s.v += (want - s.v) * smooth(s.d < r.touch ? 1.4 : 0.6, dt);
        s.d += s.v * dt;
        r.track.at(s.d, s.pos);
        s.m.gear.visible = s.d > r.fin * 0.55;
        ground = s.d >= r.touch;
        if (s.d < r.touch) {
          const flare = THREE.MathUtils.smoothstep(s.d, r.touch - 7, r.touch);
          pitchExtra = s.d > r.fin ? 0.035 + flare * 0.1 : 0;
        }
        if (s.d < r.fin) {
          setText(s, "APPROVED");
        } else if (s.d < r.touch) {
          setText(s, "MERGING");
          if (focus === s && focusPhase !== "final") setFocus(s, "final");
        } else {
          setText(s, "MERGED");
          if (s.touched < 0) {
            s.touched = clock;
            puff(s.pos.x, -0.34);
            puff(s.pos.x, 0.34);
            branchRetract = clock + 0.35;
            pulseAt = clock;
            if (focus === s) setFocus(s, "landed");
          }
          if (clock - s.touched > 2.4 && landing === s) {
            landing = null;
            const next = sims.find((o) => o.mode === "hold" && o.level === 0) ?? null;
            if (next) next.held = 0;
            setFocus(next, "holding");
          }
          // Off past the tower and into the haze.
          if (s.pos.x < -96) {
            s.mode = "idle";
            s.m.root.visible = false;
            s.label.root.style.display = "none";
          }
        }
      } else if (s.mode === "orbit") {
        s.ang += (s.v / STALL.r) * dt;
        s.pos.set(STALL.x + Math.cos(s.ang) * STALL.r, STALL.y, STALL.z - Math.sin(s.ang) * STALL.r);
        setText(s, `STALLED ${opts.stalled.quiet}D`);
      } else if (s.mode === "park") {
        ground = true;
        setText(s, "DRAFT");
      }

      if (s.mode !== "idle") orient(s, dt, ground, pitchExtra);

      // Beacons blink once a second, strobes double-flash.
      s.blink += dt;
      const b = s.blink % 1.1;
      s.m.beacon.visible = s.mode !== "park" && b < 0.12;
      const st = (s.blink + 0.4) % 1.4;
      const on = s.mode !== "park" && (st < 0.05 || (st > 0.14 && st < 0.19));
      for (const l of s.m.strobes) l.visible = on;
    }

    // The bottom of the stack waits a while, then is cleared without anyone asking.
    if (focus && focus.mode === "hold" && !landing) {
      focus.held += dt;
      if (focus.held > (firstClear ? 3.4 : 5.6) && Math.abs(focus.y - LEVELS[0]) < 0.5) clearPlane();
    }

    // Branch: drawn out ahead of the plane on clearance, folded back into main after touchdown.
    if (branch) {
      branchShow = branchStart >= 0 ? ease((clock - branchStart) / 0.9) : 0;
      branchGone = branchRetract >= 0 ? easeInOut((clock - branchRetract) / 1.25) : 0;
      const a = Math.floor(branchGone * TUBE_SEG);
      const e = Math.floor(branchShow * TUBE_SEG);
      branch.geometry.setDrawRange(a * TUBE_RAD * 6, Math.max(0, e - a) * TUBE_RAD * 6);
      if (branchGone >= 1) {
        branch.geometry.dispose();
        scene.remove(branch);
        branch = null;
      }
    }

    // Approach lights chase toward the threshold; the merge pulse runs down the centreline.
    paintC.set(T.paint);
    moveC.set(T.move);
    dimC.set(T.dim);
    const lit = Math.floor(((clock % 1.05) / 1.05) * (rabbitXs.length + 3));
    for (let i = 0; i < rabbitXs.length; i++) {
      const k = rabbitXs.length - 1 - i;
      rabbit.setColorAt(i, cTmp.copy(k === lit ? paintC : dimC));
    }
    if (rabbit.instanceColor) rabbit.instanceColor.needsUpdate = true;
    if (pulseAt >= 0) {
      const t = clock - pulseAt;
      for (let i = 0; i < dashXs.length; i++) {
        const at = (TOUCH.x - dashXs[i]) / 26;
        const k = at < -0.05 ? 0 : Math.max(0, 1 - Math.abs(t - Math.max(0, at)) / 0.28);
        dashes.setColorAt(i, cTmp.copy(paintC).lerp(moveC, k));
      }
      if (dashes.instanceColor) dashes.instanceColor.needsUpdate = true;
      if (t > 2.2) pulseAt = -1;
    } else {
      for (let i = 0; i < dashXs.length; i++) dashes.setColorAt(i, paintC);
      if (dashes.instanceColor) dashes.instanceColor.needsUpdate = true;
    }

    for (const pf of puffs) {
      if (pf.age > 1.3) {
        pf.m.visible = false;
        continue;
      }
      pf.age += dt;
      const k = pf.age / 1.3;
      pf.m.position.x += pf.vx * dt;
      pf.m.position.y += pf.vy * dt;
      pf.m.position.z += pf.vz * dt;
      pf.m.scale.setScalar(0.5 + ease(k) * 1.7);
      pf.mat.opacity = 0.6 * (1 - k);
    }

    towerTip.visible = clock % 1.6 < 0.8;

    // Camera: drifts a little toward the pointer.
    pointer.sx += (pointer.x - pointer.sx) * smooth(2.2, dt);
    pointer.sy += (pointer.y - pointer.sy) * smooth(2.2, dt);
  };

  // Nothing is drawn until the shaders are built (see the end of createField).
  let compiled = false;
  const render = () => {
    if (!compiled) return;
    camera.position.copy(base).add(q.set(pointer.sx * 3.2, -pointer.sy * 1.6, 0));
    camera.lookAt(target);
    renderer.render(scene, camera);

    // Data blocks follow their planes on screen.
    const w = host.clientWidth;
    const h = host.clientHeight;
    for (const s of sims) {
      if (s.mode === "idle") continue;
      projected.set(s.pos.x, s.pos.y + GEAR_H, s.pos.z).project(camera);
      const x = (projected.x + 1) * 0.5 * w;
      const y = (1 - projected.y) * 0.5 * h;
      const dist = camera.position.distanceTo(s.pos);
      const fade = 1 - THREE.MathUtils.smoothstep(dist - fogShift, FOG_NEAR + 10, FOG_FAR - 30);
      // A tag near the right edge slides left to stay whole; once its plane has left the frame it hides.
      const off = projected.z > 1 || x < 6 || x > w - 8 || y < 48 || y > h || fade < 0.05;
      const lx = Math.min(x, w - 96);
      s.label.root.style.opacity = off ? "0" : fade.toFixed(3);
      s.label.root.style.transform = `translate3d(${lx.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  };

  /* ---------- running ---------- */

  let raf = 0;
  let last = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    render();
  };

  const setRunning = (on: boolean) => {
    if (still) return;
    if (on && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    } else if (!on && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  // Scrolled, not timed: the scroll owes the field some seconds and they are paid out a little each frame,
  // so a flick of the wheel glides instead of jumping and the field coasts to a stop when the page does.
  let owed = 0;
  let paying = 0;
  const pay = () => {
    paying = 0;
    const take = Math.min(owed, 1 / 20);
    owed -= take;
    step(take);
    render();
    if (owed > 1e-4) paying = requestAnimationFrame(pay);
  };
  const drive = (seconds: number) => {
    if (still || raf) return;
    owed = Math.min(owed + seconds, 1.5);
    if (!paying) paying = requestAnimationFrame(pay);
  };

  const advance = (until: () => boolean, max = 40) => {
    for (let i = 0; i < max * 60 && !until(); i++) step(1 / 60);
  };

  // Motion off: the field is a still. Each press moves it on to the next moment worth seeing.
  const stillShot = () => {
    if (focus && focusPhase === "holding") {
      clearPlane();
      const s = focus;
      advance(() => !!s.route && s.d >= s.route.touch - 5.5);
    } else if (focusPhase === "final" || focusPhase === "cleared") {
      const s = focus;
      advance(() => !!s && s.touched >= 0 && clock - s.touched > 1.7);
    } else {
      advance(() => focusPhase === "holding");
      stillShot();
      return;
    }
    render();
  };

  const onPointer = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    pointer.x = THREE.MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    pointer.y = THREE.MathUtils.clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
  };
  if (!still) window.addEventListener("pointermove", onPointer, { passive: true });

  const ro = new ResizeObserver(() => {
    frame();
    if (still || !raf) render();
  });
  ro.observe(host);

  const mo = new MutationObserver(() => {
    theme();
    if (still || !raf) {
      step(0);
      render();
    }
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  theme();
  frame();
  let disposed = false;
  document.fonts?.ready.then(() => {
    if (disposed) return;
    paintWord();
    if (still || !raf) render();
  });

  emit();
  if (still) {
    advance(() => clock > 1.5);
    stillShot();
  } else {
    // A moment's pre-roll so every plane already faces the way it is flying.
    advance(() => clock > 0.6);
  }

  // The shaders build in the background (KHR_parallel_shader_compile), so the page never waits on the GPU
  // for them; the first frame is drawn once they are ready.
  renderer
    .compileAsync(scene, camera)
    .catch(() => scene)
    .then(() => {
      if (disposed) return;
      compiled = true;
      render();
    });

  return {
    clear: () => {
      if (still) {
        stillShot();
        return true;
      }
      return clearPlane();
    },
    setRunning,
    drive,
    dispose: () => {
      disposed = true;
      setRunning(false);
      cancelAnimationFrame(paying);
      window.removeEventListener("pointermove", onPointer);
      ro.disconnect();
      mo.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
      textTex.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labels.replaceChildren();
    },
  };
}
