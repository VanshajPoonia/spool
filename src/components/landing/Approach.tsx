"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlaneLanding } from "lucide-react";
import { StripButton } from "@/components/kit/Kit";
import { Strip } from "@/components/kit/Strip";
import { PrintText } from "@/components/print/PrintText";
import { assignCodes, carrier } from "@/lib/carriers";
import { FACES } from "@/lib/faces";
import { usePrefs } from "@/lib/prefs";
import { ARRIVALS, PARKED, STALLED_FLIGHT, type SampleFlight } from "@/lib/sample-flights";
import type { Field, FlightRef, Phase } from "./field/field";
import { useFlip } from "./flip";
import { useInView, useSectionFace } from "./mood";
import { onScrollFrame } from "./scroll";
import { SectionHead } from "./SectionHead";
import sec from "./section.module.css";
import s from "./approach.module.css";

/*
 * The airfield: PRs as flights, review as the hold, the merge as a landing on MAIN.
 * The 3D field loads only as the section comes near; the strip below it says the same thing in words.
 * The planes fly as the page scrolls and hold when it stops. A landing someone asks for plays out on its own.
 */

// How many pixels of scroll move the field on by a second.
const PX_PER_SECOND = 110;

const ALL = [...ARRIVALS, STALLED_FLIGHT, ...PARKED];
const CODES = assignCodes(ALL.map((f) => f.repo));
const BY_ID = new Map(ALL.map((f) => [f.id, f]));
const ref = (f: SampleFlight): FlightRef => ({ id: f.id, code: CODES.get(f.repo)!, num: f.num, kind: f.kind, livery: carrier(f.repo).livery });

const PHASES: { key: Phase; atc: string; git: string }[] = [
  { key: "holding", atc: "Holding", git: "In review" },
  { key: "cleared", atc: "Cleared", git: "Approved" },
  { key: "final", atc: "Final", git: "Merge queue" },
  { key: "landed", atc: "Landed", git: "Merged" },
];

const FACE: Record<Phase, string> = { holding: FACES.watch, cleared: FACES.focus, final: FACES.focus, landed: FACES.stars };

function note(f: SampleFlight, phase: Phase) {
  if (phase === "holding") return f.kind === "review" ? `You approved. Waiting on ${f.reviewer}.` : `Waiting on ${f.reviewer} to review.`;
  if (phase === "cleared") return f.kind === "review" ? "The second approval is in. Checks are green." : `${f.reviewer.startsWith("@") ? f.reviewer : "The reviewer"} approved. Checks are green.`;
  if (phase === "final") return "In the merge queue for one last run of the checks.";
  return "Merged into main. The branch is gone.";
}

const STATUS: Record<Phase, string> = { holding: "IN REVIEW", cleared: "APPROVED", final: "MERGING", landed: "MERGED" };

type View = { id: string; phase: Phase; serial: number };
type Landed = { id: string; serial: number };

export function Approach() {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<Field | null>(null);
  const { motion } = usePrefs();
  const [reduced, setReduced] = useState(false);
  const still = !motion || reduced;
  const { visible } = useInView(sceneRef, "0px");
  const [near, setNear] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [status, setStatus] = useState<"idle" | "ready" | "failed">("idle");
  const [gen, setGen] = useState(0);
  // a landing someone asked for runs on the clock; the rest of the time the scroll drives the field
  const [flying, setFlying] = useState(false);
  const [view, setView] = useState<View>({ id: ARRIVALS[0].id, phase: "holding", serial: 0 });
  const [landed, setLanded] = useState<Landed[]>([]);
  const [say, setSay] = useState("");
  const viewRef = useRef(view);
  const asked = useRef<string | null>(null);

  const flight = BY_ID.get(view.id) ?? ARRIVALS[0];
  useSectionFace(sectionRef, FACE[view.phase]);
  useFlip(deckRef, `${view.serial}:${landed.length}:${landed[0]?.serial ?? ""}`);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    const vis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => {
      mq.removeEventListener("change", on);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  // Load three.js and build the field while the visitor is still reading the top of the page: together they
  // take a few hundred milliseconds, and doing that as the field scrolls in would stall the scroll.
  useEffect(() => {
    let idle = 0;
    const load = () =>
      void import("./field/field")
        .then(() => setNear(true))
        .catch(() => {});
    const timer = window.setTimeout(() => {
      if ("requestIdleCallback" in window) idle = window.requestIdleCallback(load, { timeout: 4000 });
      else load();
    }, 2000);
    return () => {
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback(idle);
    };
  }, []);

  // Or a screen before it arrives, if the visitor gets there first.
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        setNear(true);
      },
      { rootMargin: "700px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onFocus = useCallback((id: string, phase: Phase) => {
    const prev = viewRef.current;
    // The strip that just landed moves down into the landed bay when the next one takes its place.
    const serial = prev.id === id ? prev.serial : prev.serial + 1;
    if (prev.id !== id && prev.phase === "landed") setLanded((l) => [{ id: prev.id, serial: prev.serial }, ...l].slice(0, 3));
    const next = { id, phase, serial };
    viewRef.current = next;
    setView(next);
    if (asked.current === id) {
      const f = BY_ID.get(id);
      const name = f ? `${f.repo} #${f.num}` : "The PR";
      if (phase === "cleared") setSay(`Cleared. ${name} is leaving the hold.`);
      if (phase === "final") setSay(`${name} is on final.`);
      if (phase === "landed") {
        setSay(`${name} landed. Merged into main.`);
        asked.current = null;
        window.setTimeout(() => setFlying(false), 1600);
      }
    }
  }, []);

  useEffect(() => {
    if (!near) return;
    let dead = false;
    let field: Field | null = null;
    import("./field/field")
      .then((m) => {
        if (dead || !sceneRef.current || !labelsRef.current) return;
        try {
          field = m.createField(sceneRef.current, labelsRef.current, {
            arrivals: ARRIVALS.map(ref),
            stalled: { ...ref(STALLED_FLIGHT), quiet: STALLED_FLIGHT.quiet },
            parked: PARKED.map(ref),
            still,
            cls: { label: s.label, leader: s.leader, block: s.block, code: s.code, state: s.state, ring: s.ring },
            onFocus,
          });
          fieldRef.current = field;
          setStatus("ready");
          setGen((g) => g + 1);
        } catch {
          setStatus("failed");
        }
      })
      .catch(() => setStatus("failed"));
    return () => {
      dead = true;
      field?.dispose();
      fieldRef.current = null;
    };
  }, [near, still, onFocus]);

  useEffect(() => {
    fieldRef.current?.setRunning(status === "ready" && visible && flying && !hidden);
  }, [status, gen, visible, flying, hidden]);

  // Every pixel the page scrolls, either way, moves the planes on while the field is in view.
  useEffect(() => {
    const field = fieldRef.current;
    if (status !== "ready" || !field || still || flying || !visible) return;
    let lastY = window.scrollY;
    return onScrollFrame(() => {
      const y = window.scrollY;
      const d = Math.abs(y - lastY);
      lastY = y;
      if (d) return () => field.drive(d / PX_PER_SECOND);
    });
  }, [status, gen, still, flying, visible]);

  // Without WebGL the strip still walks through the landing, one press at a time.
  const stepByHand = () => {
    const at = PHASES.findIndex((p) => p.key === view.phase);
    if (at < PHASES.length - 1) onFocus(view.id, PHASES[at + 1].key);
    else {
      const i = ARRIVALS.findIndex((f) => f.id === view.id);
      onFocus(ARRIVALS[(i + 1) % ARRIVALS.length].id, "holding");
    }
  };

  const press = () => {
    asked.current = view.id;
    if (status === "failed") return stepByHand();
    if (!still) setFlying(true);
    fieldRef.current?.clear();
  };

  const manual = still || status === "failed";
  const ready = status === "ready" || status === "failed";
  const canPress = ready && (manual || view.phase === "holding");
  const action = manual
    ? view.phase === "holding"
      ? `Clear #${flight.num} to land`
      : view.phase === "landed"
        ? "Bring in the next one"
        : `Land #${flight.num}`
    : view.phase === "holding"
      ? `Clear #${flight.num} to land`
      : view.phase === "landed"
        ? "Landed"
        : view.phase === "final"
          ? "On final"
          : "Cleared to land";

  const now = PHASES.findIndex((p) => p.key === view.phase);
  const code = CODES.get(flight.repo)!;
  const landedRows = useMemo(() => landed.map((l) => ({ ...l, f: BY_ID.get(l.id)! })), [landed]);

  return (
    <section ref={sectionRef} id="the-field" className={sec.section} aria-labelledby="field-title">
      <SectionHead id="field-title" title="A PR in review is a flight in the hold.">
        Spool keeps track the way a control tower does. Every PR flies under its repo&rsquo;s callsign and its own number.
        While it waits for review it circles in the stack; approval clears it, and the merge puts it down on <strong>main</strong>.
        Spool never merges anything itself: it notes the landing when GitHub reports it.
      </SectionHead>

      <div className={s.stage}>
        <div
          ref={sceneRef}
          className={s.scene}
          role="img"
          aria-label="A sample airfield in 3D. PRs circle in a stacked hold while they wait for review. The one at the bottom is cleared, follows an amber branch down to the runway called main, and lands. That landing is the merge."
          data-status={status}
        >
          <div ref={labelsRef} className={s.labels} aria-hidden="true" />
          {status !== "ready" && (
            <p className={s.sceneNote} aria-hidden={status !== "failed"}>
              {status === "failed" ? "This browser can’t draw the 3D field, so here is its strip on its own." : <PrintText value="TOWER COMING ON" decorative />}
            </p>
          )}
        </div>
        <div className={s.tools}>
          <span className={sec.tag}>Sample data</span>
          {!still && status === "ready" && <span className={s.hint}>Scroll to fly</span>}
        </div>
      </div>

      <div ref={deckRef} className={`${sec.panel} ${s.deck}`} data-shine>
        <ol className={s.rail} aria-label="How a PR lands">
          {PHASES.map((p, i) => (
            <li key={p.key} className={s.plate} data-key={p.key} data-now={i === now || undefined} data-past={i < now || undefined} aria-current={i === now ? "step" : undefined}>
              <span className={s.plateAtc}>{p.atc}</span>
              <span className={s.plateGit}>{p.git}</span>
            </li>
          ))}
        </ol>

        <div className={s.desk}>
          <div className={s.next}>
            <span className={s.deskName}>{view.phase === "landed" ? "Just landed" : view.phase === "holding" ? "Next to land" : "Landing now"}</span>
            <Strip
              key={view.serial}
              data={{ "data-flip": `f${view.serial}` }}
              size="lg"
              kind={flight.kind}
              callsign={code}
              num={flight.num}
              title={flight.title}
              note={note(flight, view.phase)}
              who={<PrintText value={STATUS[view.phase]} length={9} decorative />}
              state={view.phase === "landed" ? "done" : "them"}
              ticked={view.phase === "landed"}
              sample
              label={`${flight.repo} #${flight.num}, ${flight.title}. ${STATUS[view.phase].toLowerCase()}. Sample data.`}
            />
          </div>
          <StripButton className={s.press} onClick={press} disabled={!canPress} icon={<PlaneLanding size={18} strokeWidth={2.1} />}>
            {action}
          </StripButton>
        </div>

        <div className={s.landed}>
          <span className={s.deskName}>Landed</span>
          {landedRows.length === 0 ? (
            <p className={s.empty}>Nothing has landed yet. The bottom of the stack is next.</p>
          ) : (
            <ul className={s.rack}>
              {landedRows.map((l) => (
                <li key={l.serial} data-flip={`f${l.serial}`}>
                  <Strip
                    size="sm"
                    kind={l.f.kind}
                    callsign={CODES.get(l.f.repo)!}
                    num={l.f.num}
                    title={l.f.title}
                    who="MERGED"
                    state="done"
                    ticked
                    sample
                    label={`${l.f.repo} #${l.f.num}, ${l.f.title}. Merged. Sample data.`}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className={s.caption}>
          Every plane is one PR. Its tail carries the kind&rsquo;s colour, the same as the dot on its row: violet for your PRs,
          pink for one you reviewed, grey for drafts parked at the stand. The one circling alone, ringed in red, has been stalled
          for {STALLED_FLIGHT.quiet} days.
        </p>
        <p className="sr-only" aria-live="polite">
          {say}
        </p>
      </div>
    </section>
  );
}
