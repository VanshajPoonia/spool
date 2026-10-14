"use client";

import Link from "next/link";
import { CSSProperties, memo, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { FlapText, type Tone } from "@/components/flap/Flap";
import { Pictogram } from "@/components/kit/Kit";
import { carrier } from "@/lib/carriers";
import { FACES } from "@/lib/faces";
import { usePrefs } from "@/lib/prefs";
import { SAMPLE_DAY } from "@/lib/sample-day";
import { fitWords } from "./DayBoard";
import { useSectionFace } from "./mood";
import { SectionHead } from "./SectionHead";
import { glideTo } from "./SmoothScroll";
import sec from "./section.module.css";
import s from "./build.module.css";

/*
 * How a thread becomes a row: one row of the departures board, built in 3D as you scroll.
 * The parts lie flat on a sign-yellow assembly mat, then lift off in five steps, one for each
 * thing Spool works out about a thread. Every flap tile clatters to its letter as it lands.
 *
 * SYNTHETIC: the row is quarry #2417 from the sample day, at 10:41 when changes were requested.
 */
const ROW = SAMPLE_DAY.find((r) => r.id === "qy-2417")!;
const AT = ROW.events.find((e) => e.state.status === "CHANGES REQ")!.state;
const CARRIER = carrier(ROW.repo);
const TITLE = fitWords(ROW.board, 11);

const STEPS = [
  {
    name: "The thread",
    text: "Spool asks GitHub for every open PR and issue you’re part of: yours, ones assigned to you, review requests, mentions and threads you commented on.",
    face: FACES.focus,
  },
  {
    name: "The carrier",
    text: "The repo gets a two-letter code and a coloured stripe, so you can tell repos apart without reading.",
    face: FACES.watch,
  },
  {
    name: "The title",
    text: "The thread’s title goes on the flaps, cut at a word break so it fits the board.",
    face: FACES.glad,
  },
  {
    name: "Who moves next",
    text: "The last comment, review or check run decides whose move it is: yours, or theirs.",
    face: FACES.right,
  },
  {
    name: "The status",
    text: "The lamp and status say why it’s there: changes requested, checks failing, in review. Quiet past your limit, it reads DELAYED.",
    face: FACES.alarm,
  },
] as const;

const LETTERS = "ABCDE";

/* Scroll timeline, as fractions of the pinned stretch: a short look at the kit, five steps, then the finished row. */
const INTRO = 0.05;
const STEP = 0.17;
const LIVE = INTRO + STEP * 5;

/* ---------- the kit ---------- */

type V3 = readonly [number, number, number];
type Kind = "back" | "shelf" | "cap" | "tag" | "tile" | "lamp";
type Part = {
  id: string;
  kind: Kind;
  /** which step lifts it, and when within that step */
  step: number;
  win: readonly [number, number];
  /** width (x), depth (y), height (z) */
  size: V3;
  /** lying in the kit */
  from: V3;
  fromR: V3;
  /** fitted in the row, upright */
  to: V3;
  lift: number;
  ch?: string;
  tone?: Tone;
};

/*
 * World units are CSS pixels. x runs along the row, y toward the viewer, z up.
 * The finished row stands at the back of the mat; the kit lies in front of it.
 */
const TILE: V3 = [26, 8, 40];
const PITCH = 29;
const ROW_Y = -104;
const TILE_Z = 27;
const FLAT: V3 = [90, 0, 0];
const ON_SIDE: V3 = [0, 90, 0];
const UPRIGHT: V3 = [0, 0, 0];

function tiles(text: string, step: number, tone: Tone, toX: number, fromX: number, fromY: number, stagger: number, dur: number, start = 0) {
  return Array.from(text, (ch, i): Part => ({
    id: `${step}-${i}`,
    kind: "tile",
    step,
    win: [start + i * stagger, start + i * stagger + dur],
    size: TILE,
    from: [fromX + i * 30, fromY, TILE[1] / 2],
    fromR: FLAT,
    to: [toX + i * PITCH, ROW_Y, TILE_Z],
    lift: 84 + (i % 3) * 14,
    ch,
    tone,
  }));
}

const PARTS: Part[] = [
  // A: the shelf comes off the pile first, the back stands up behind it, the end caps close the row.
  { id: "shelf", kind: "shelf", step: 0, win: [0, 0.42], size: [900, 28, 6], from: [0, -12, 11], fromR: UPRIGHT, to: [0, -98, 3], lift: 70 },
  { id: "back", kind: "back", step: 0, win: [0.14, 0.6], size: [900, 8, 80], from: [0, -30, 4], fromR: FLAT, to: [0, -116, 40], lift: 96 },
  { id: "capL", kind: "cap", step: 0, win: [0.36, 0.78], size: [12, 36, 80], from: [-395, 62, 6], fromR: ON_SIDE, to: [-456, -102, 40], lift: 80 },
  { id: "capR", kind: "cap", step: 0, win: [0.44, 0.86], size: [12, 36, 80], from: [-485, 62, 6], fromR: ON_SIDE, to: [456, -102, 40], lift: 120 },
  // B
  { id: "tag", kind: "tag", step: 1, win: [0.05, 0.7], size: [64, 6, 30], from: [-300, 62, 3], fromR: FLAT, to: [-402, ROW_Y, TILE_Z], lift: 90 },
  // C, D, E
  ...tiles(TITLE, 2, undefined, -337, -200, 62, 0.05, 0.3),
  ...tiles(AT.next, 3, undefined, 3, 160, 62, 0.14, 0.4, 0.08),
  { id: "lamp", kind: "lamp", step: 4, win: [0, 0.34], size: [14, 10, 14], from: [-290, 132, 7], fromR: UPRIGHT, to: [99, ROW_Y, TILE_Z], lift: 70 },
  ...tiles(AT.status, 4, AT.tone, 135, -200, 132, 0.045, 0.28, 0.2),
];

/* the column heads printed along the top of the back panel, in its own coordinates */
const HEADS = [
  { label: "REPO", x: 32 },
  { label: "THREAD", x: 100 },
  { label: "NEXT", x: 440 },
  { label: "STATUS", x: 542 },
];

/* the mat, and the letter printed beside each part of the kit (mat coordinates: origin at its back left corner) */
const MAT = { x: -530, y: -170, w: 1060, d: 370, h: 8 };
const CALLOUTS = [
  { x: 38, y: 140 },
  { x: 230, y: 198 },
  { x: 294, y: 232 },
  { x: 656, y: 232 },
  { x: 200, y: 302 },
];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const stepAt = (p: number) => (p >= LIVE ? 5 : Math.min(4, Math.max(0, Math.floor((p - INTRO) / STEP))));

function progressOf(part: Part, p: number) {
  const u = (p - (INTRO + part.step * STEP)) / STEP;
  return clamp01((u - part.win[0]) / (part.win[1] - part.win[0]));
}

/* Each part travels on an arc and turns upright a little before it lands. */
function poseOf(part: Part, t: number) {
  const e = ease(t);
  const r = ease(clamp01(t * 1.3));
  const at = (i: number) => part.from[i] + (part.to[i] - part.from[i]) * e;
  const rot = (i: number) => part.fromR[i] * (1 - r);
  const z = at(2) + part.lift * Math.sin(Math.PI * e);
  return `translate3d(${at(0).toFixed(1)}px, ${at(1).toFixed(1)}px, ${z.toFixed(1)}px) rotateX(${rot(0).toFixed(2)}deg) rotateY(${rot(1).toFixed(2)}deg)`;
}

/* ---------- boxes from six faces ---------- */

const SIDES = ["top", "bottom", "front", "back", "left", "right"] as const;
type Side = (typeof SIDES)[number];

function faceStyle(side: Side, [w, d, h]: V3): CSSProperties {
  const px = (n: number) => `${n}px`;
  switch (side) {
    case "top":
      return { width: w, height: d, transform: `translate3d(${px(-w / 2)}, ${px(-d / 2)}, ${px(h / 2)})` };
    case "bottom":
      return { width: w, height: d, transform: `translate3d(${px(-w / 2)}, ${px(d / 2)}, ${px(-h / 2)}) rotateX(180deg)` };
    case "front":
      return { width: w, height: h, transform: `translate3d(${px(-w / 2)}, ${px(d / 2)}, ${px(h / 2)}) rotateX(-90deg)` };
    case "back":
      return { width: w, height: h, transform: `translate3d(${px(w / 2)}, ${px(-d / 2)}, ${px(h / 2)}) rotateZ(180deg) rotateX(-90deg)` };
    case "left":
      return { width: d, height: h, transform: `translate3d(${px(-w / 2)}, ${px(-d / 2)}, ${px(h / 2)}) rotateZ(90deg) rotateX(-90deg)` };
    case "right":
      return { width: d, height: h, transform: `translate3d(${px(w / 2)}, ${px(d / 2)}, ${px(h / 2)}) rotateZ(-90deg) rotateX(-90deg)` };
  }
}

function Box({ size, front, top }: { size: V3; front?: ReactNode; top?: ReactNode }) {
  return SIDES.map((side) => (
    <div key={side} className={s.face} data-f={side} style={faceStyle(side, size)}>
      {side === "front" ? front : side === "top" ? top : null}
    </div>
  ));
}

const START = PARTS.map((part) => poseOf(part, 0));

const PartView = memo(function PartView({ part, index, on, bind }: { part: Part; index: number; on: boolean; bind: (i: number, el: HTMLDivElement | null) => void }) {
  let front: ReactNode = null;
  if (part.kind === "tile") {
    front = <FlapText value={on ? part.ch! : " "} length={1} size={`${TILE[2]}px`} ratio={TILE[0] / TILE[2]} tone={part.tone} decorative opts={{ maxSteps: 8, step: 44 }} />;
  } else if (part.kind === "back") {
    front = HEADS.map((h) => (
      <span key={h.label} className={s.head} style={{ left: h.x }}>
        {h.label}
      </span>
    ));
  } else if (part.kind === "tag") {
    front = (
      <span className={s.tag} style={{ "--c1": CARRIER.livery[0], "--c2": CARRIER.livery[1] } as CSSProperties}>
        <span className={s.fin} />
        <span className={s.code}>{CARRIER.code}</span>
      </span>
    );
  } else if (part.kind === "lamp") {
    front = <span className={s.bulb} data-tone={part.tone ?? AT.tone} data-on={on || undefined} />;
  } else if (part.kind === "cap") {
    front = (
      <>
        <span className={s.screw} />
        <span className={s.screw} />
      </>
    );
  }
  return (
    <div ref={(el) => bind(index, el)} className={s.part} data-kind={part.kind} style={{ transform: START[index] }}>
      <Box size={part.size} front={front} />
    </div>
  );
});

function Mat({ bindCallout, shadowRef }: { bindCallout: (i: number, el: HTMLSpanElement | null) => void; shadowRef: React.RefObject<HTMLSpanElement | null> }) {
  const print = (
    <>
      <span className={s.footprint} style={{ left: -462 - MAT.x, top: -120 - MAT.y, width: 924, height: 36 }} />
      <span ref={shadowRef} className={s.rowShadow} style={{ left: -470 - MAT.x, top: -132 - MAT.y, width: 940, height: 60 }} />
      {CALLOUTS.map((c, i) => (
        <span key={i} ref={(el) => bindCallout(i, el)} className={s.callout} style={{ left: c.x - 12, top: c.y - 12 }}>
          {LETTERS[i]}
        </span>
      ))}
      <span className={s.matPrint} style={{ right: 22, bottom: 16 }}>
        SPOOL · ROW KIT · 1 ROW
      </span>
    </>
  );
  return (
    <div className={s.part} data-kind="mat" style={{ transform: `translate3d(${MAT.x + MAT.w / 2}px, ${MAT.y + MAT.d / 2}px, ${-MAT.h / 2}px)` }}>
      <Box size={[MAT.w, MAT.d, MAT.h]} top={print} />
    </div>
  );
}

/* ---------- the section ---------- */

export function BuildRow() {
  const ref = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLSpanElement>(null);
  const partEls = useRef<(HTMLDivElement | null)[]>([]);
  const calloutEls = useRef<(HTMLSpanElement | null)[]>([]);
  const bind = useCallback((i: number, el: HTMLDivElement | null) => {
    partEls.current[i] = el;
  }, []);
  const bindCallout = useCallback((i: number, el: HTMLSpanElement | null) => {
    calloutEls.current[i] = el;
  }, []);

  const { motion } = usePrefs();
  const [still, setStill] = useState(false);
  const [step, setStep] = useState(0);
  const [landed, setLanded] = useState(() => "0".repeat(PARTS.length));
  const live = step === 5;
  useSectionFace(ref, live ? FACES.stars : STEPS[step].face);

  // Reduced motion, or the page's motion switch, shows the finished row with no pinned scroll.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(!motion || mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [motion]);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const camera = cameraRef.current;
    if (!track || !stage || !camera) return;

    // A tall, narrow stage (phones) looks along a steeper diagonal so the long row uses its height.
    let fit = { a: 0.6, b: 0.75, rz: -22 };
    const measure = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      fit = w / h < 1.2 ? { a: Math.min(w / 940, h / 620), b: Math.min(w / 960, h / 460), rz: -40 } : { a: Math.min(w / 1100, h / 600), b: Math.min(w / 990, h / 400), rz: -22 };
    };
    measure();

    const lastPose: string[] = [];
    let lastLanded = "";
    let lastStep = -1;
    const tilt = { x: 0, y: 0, tx: 0, ty: 0 };

    const apply = (p: number) => {
      let bits = "";
      PARTS.forEach((part, i) => {
        const t = progressOf(part, p);
        const pose = poseOf(part, t);
        const el = partEls.current[i];
        if (el && pose !== lastPose[i]) {
          el.style.transform = pose;
          lastPose[i] = pose;
        }
        bits += t >= 0.999 ? "1" : "0";
      });
      if (bits !== lastLanded) {
        lastLanded = bits;
        setLanded(bits);
      }
      const st = stepAt(p);
      if (st !== lastStep) {
        lastStep = st;
        setStep(st);
      }

      // The camera circles a little while the kit goes together, then leans in to read the finished row.
      const orbit = ease(clamp01(p / LIVE));
      const push = ease(clamp01((p - LIVE + 0.03) / 0.1));
      const k = fit.a + (fit.b - fit.a) * push;
      const rx = 52 + 6 * orbit + 8 * push + tilt.y * 3;
      const rz = fit.rz + 8 * orbit + 7 * push + tilt.x * 5;
      const fy = 20 - 36 * orbit - 70 * push;
      const fz = 26 * push;
      camera.style.transform = `scale3d(${k.toFixed(4)}, ${k.toFixed(4)}, ${k.toFixed(4)}) rotateX(${rx.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) translate3d(0px, ${(-fy).toFixed(1)}px, ${(-fz).toFixed(1)}px)`;

      sideRef.current?.style.setProperty("--p", p.toFixed(4));
      calloutEls.current.forEach((el, i) => {
        if (el) el.style.opacity = String(1 - clamp01((p - (INTRO + i * STEP)) / (STEP * 0.6)));
      });
      if (shadowRef.current) shadowRef.current.style.opacity = String(clamp01((p - INTRO) / (LIVE - INTRO)));
    };

    if (still) {
      apply(1);
      const onResize = () => {
        measure();
        apply(1);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    let raf = 0;
    let near = false;
    const progress = () => {
      const r = track.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      return travel > 0 ? clamp01(-r.top / travel) : 1;
    };
    const frame = () => {
      raf = 0;
      tilt.x += (tilt.tx - tilt.x) * 0.08;
      tilt.y += (tilt.ty - tilt.y) * 0.08;
      apply(progress());
      if (near && (Math.abs(tilt.tx - tilt.x) > 0.002 || Math.abs(tilt.ty - tilt.y) > 0.002)) request();
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        near = e.isIntersecting;
        if (near) request();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(track);
    const onScroll = () => {
      if (near) request();
    };
    const onResize = () => {
      measure();
      request();
    };
    // On a mouse, the scene leans a few degrees toward the pointer.
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = stage.getBoundingClientRect();
      tilt.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      tilt.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      request();
    };
    const onLeave = () => {
      tilt.tx = 0;
      tilt.ty = 0;
      request();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    stage.addEventListener("pointermove", onPointer);
    stage.addEventListener("pointerleave", onLeave);
    request();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      stage.removeEventListener("pointermove", onPointer);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, [still]);

  // Jump to the moment a step's parts have all landed; the glide plays the build on the way.
  const jump = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const r = track.getBoundingClientRect();
    const top = r.top + window.scrollY;
    const travel = r.height - window.innerHeight;
    glideTo(top + travel * (i === 5 ? LIVE + 0.06 : INTRO + STEP * (i + 0.94)));
  };

  const shown = still ? 5 : step;
  const letter = LETTERS[Math.min(shown, 4)];

  return (
    <section ref={ref} id="how-it-works" className={`${sec.section} ${s.section}`} data-still={still || undefined} aria-labelledby="build-title">
      <SectionHead id="build-title" title="How a thread becomes a row." pict="spool">
        Spool reads each thread from GitHub and works out five things before it gets a row on your board.{" "}
        {still ? "Here is one row, built." : "Keep scrolling to build one."}
      </SectionHead>

      <div ref={trackRef} className={s.track}>
        <div className={s.sticky}>
          <div ref={sideRef} className={s.side}>
            <div className={s.now}>
              <FlapText value={letter} length={1} size="64px" tone={live || still ? "sign" : undefined} decorative opts={{ maxSteps: 6, step: 52 }} />
              <div className={s.nowText}>
                <p className={s.nowName} aria-live="polite">
                  {live || still ? "On the board" : STEPS[shown].name}
                </p>
                <p className={s.nowOf}>{live || still ? "All five parts in place" : `Part ${shown + 1} of 5`}</p>
              </div>
            </div>

            <ol className={s.parts}>
              {STEPS.map((st, i) => {
                const state = i < shown ? "done" : i === shown ? "now" : "next";
                const body = (
                  <>
                    <span className={s.mark}>{LETTERS[i]}</span>
                    <span className={s.partText}>
                      <strong>{st.name}</strong>
                      <span className={s.desc}>
                        <span>{st.text}</span>
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={st.name} data-state={state}>
                    {still ? (
                      <div className={s.partRow}>{body}</div>
                    ) : (
                      <button type="button" className={s.partRow} onClick={() => jump(i)} aria-current={state === "now" ? "step" : undefined}>
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
            <p className={s.mobileText}>{live || still ? "The row takes its place on the board, sorted by who moves next." : STEPS[shown].text}</p>

            <div className={s.rail} aria-hidden="true">
              <span className={s.railFill} />
              {STEPS.map((_, i) => (
                <span key={i} className={s.tick} style={{ left: `${(INTRO + STEP * (i + 1)) * 100}%` }} />
              ))}
            </div>

            <Link href="/board?demo=1" className={s.more}>
              See the whole sample board
              <Pictogram name="arrow" className={s.moreIcon} />
            </Link>
          </div>

          <div ref={stageRef} className={s.stage}>
            <div className={s.scene} aria-hidden="true">
              <div ref={cameraRef} className={s.camera}>
                <Mat bindCallout={bindCallout} shadowRef={shadowRef} />
                {PARTS.map((part, i) => (
                  <PartView key={part.id} part={part} index={i} on={landed[i] === "1"} bind={bind} />
                ))}
              </div>
            </div>
            <p className={s.caption} data-live={live || still || undefined}>
              <span className={sec.tag}>Sample row</span>
              <span>
                <span className="data">
                  {ROW.repo}#{ROW.num}
                </span>{" "}
                {AT.note}.
              </span>
            </p>
            <p className="sr-only">
              The finished sample row reads: {CARRIER.code}, {TITLE}, next move {AT.next}, status {AT.status}.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
