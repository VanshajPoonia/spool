"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { ChevronDown, Pause, Play, RefreshCw, RotateCcw } from "lucide-react";
import { NAV } from "@/components/app/nav";
import { StateMark, type MarkState } from "@/components/kit/Kit";
import { Bay, StatusIcon, Strip } from "@/components/kit/Strip";
import { printMotion } from "@/components/print/engine";
import { PrintText } from "@/components/print/PrintText";
import { carrier } from "@/lib/carriers";
import { statusLabel } from "@/lib/format";
import { FACES, type Mood } from "@/lib/faces";
import { usePrefs } from "@/lib/prefs";
import { allEvents, DAY_END, DAY_START, hhmm, lastEventAt, SAMPLE_DAY, stateAt, type DayRow, type DayState } from "@/lib/sample-day";
import { dayKind, dayState, dayTicked, STALL_DAYS } from "./dayStrip";
import { useFlip } from "./flip";
import { useInView } from "./mood";
import s from "./sample-window.module.css";

/*
 * The hero's Spool window: the app as it looks, playing a made-up contributor's day.
 * Sidebar, the bay grouped by whose move it is, and the activity of the thread that just moved.
 * A full day plays in 42 seconds; the scrubber under the bay drags through it.
 *
 * SYNTHETIC: every repo, person and event comes from lib/sample-day and is labelled sample data.
 */

const SPEED = (DAY_END - DAY_START) / 42000;
const EVENTS = allEvents();
// With motion off the day holds at a moment with something in each group and a stall in view.
const STILL_AT = 15 * 60 + 20;
const HOLD_AT_END = 3600;
// How long a mouse has to rest on a row before the activity pane follows it.
const DWELL = 1000;

/*
 * A value kept outside React. The day's clock moves about twenty times a second, so only the parts that
 * show the minute read it; the bay and the activity pane render once per event, not once per tick.
 */
type Live<T> = { get: () => T; set: (v: T) => void; sub: (f: () => void) => () => void };

function live<T>(v: T): Live<T> {
  const subs = new Set<() => void>();
  return {
    get: () => v,
    set: (n) => {
      if (Object.is(n, v)) return;
      v = n;
      subs.forEach((f) => f());
    },
    sub: (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
  };
}

function useLive<T>(l: Live<T>) {
  return useSyncExternalStore(l.sub, l.get, l.get);
}

/* How many of the day's events have happened by a given minute. */
function passed(minute: number) {
  let n = 0;
  while (n < EVENTS.length && EVENTS[n].at <= minute) n++;
  return n;
}

const markFor = (tone: string | undefined): MarkState => (tone === "go" ? "go" : tone === "wait" ? "wait" : tone === "stop" ? "stop" : "idle");
const whose = (st: DayState) => (st.next === "YOU" ? "Your move" : st.next === "THEM" ? ((st.quiet ?? 0) >= STALL_DAYS ? "Stalled" : "Their move") : "Done");

/* The face watches the pointer, blinks, dozes when ignored and reacts to the day. */
function useFace(faceRef: React.RefObject<HTMLElement | null>) {
  // the face changes with every glance of the pointer; only the face itself re-renders
  const [face] = useState(() => live<string>(FACES.calm));
  const hold = useRef(0);
  const last = useRef(0);
  const asleep = useRef(false);
  const current = useRef<string>(FACES.calm);

  const show = useCallback(
    (f: string) => {
      current.current = f;
      face.set(f);
    },
    [face],
  );

  const react = useCallback(
    (mood: Mood, ms = 1600) => {
      hold.current = performance.now() + ms;
      show(FACES[mood]);
    },
    [show],
  );

  useEffect(() => {
    last.current = performance.now();
    let moveTimer = 0;
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      last.current = now;
      if (asleep.current) {
        asleep.current = false;
        hold.current = now + 700;
        show(FACES.alarm);
        return;
      }
      if (now < hold.current) return;
      const el = faceRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const next = Math.abs(dx) < 90 && Math.abs(dy) < 90 ? FACES.stars : dx < -160 ? FACES.left : dx > 160 ? FACES.right : FACES.watch;
      if (next !== current.current) show(next);
      window.clearTimeout(moveTimer);
      moveTimer = window.setTimeout(() => {
        if (performance.now() >= hold.current) show(FACES.calm);
      }, 1400);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const blinkLoop = window.setInterval(() => {
      const now = performance.now();
      if (now < hold.current) return;
      if (!asleep.current && now - last.current > 12000) {
        asleep.current = true;
        show(FACES.sleepy);
        return;
      }
      if (current.current === FACES.calm && Math.random() < 0.45) {
        show(FACES.blink);
        window.setTimeout(() => {
          if (current.current === FACES.blink && !asleep.current) show(FACES.calm);
        }, 260);
      }
    }, 1900);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.clearInterval(blinkLoop);
      window.clearTimeout(moveTimer);
    };
  }, [faceRef, show]);

  return { face, react };
}

/*
 * Hover that waits to be meant. Rows slide under a resting pointer while the page scrolls, and a finger that
 * lands to scroll is a touch, not a choice; neither should pull the activity pane off the day. A mouse has to
 * rest on one row for a second with the page still. Touch never hovers: a tap picks the row instead.
 */
function useHoverIntent(onIntent: (id: string | null) => void) {
  const timer = useRef(0);
  const want = useRef<string | null>(null);

  const arm = useCallback(() => {
    window.clearTimeout(timer.current);
    if (want.current) timer.current = window.setTimeout(() => onIntent(want.current), DWELL);
  }, [onIntent]);

  // any scroll on the page starts the wait again
  useEffect(() => {
    document.addEventListener("scroll", arm, { passive: true, capture: true });
    return () => {
      document.removeEventListener("scroll", arm, { capture: true });
      window.clearTimeout(timer.current);
    };
  }, [arm]);

  const enter = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      want.current = id;
      arm();
    },
    [arm],
  );

  // leaving a row stops the wait; the pane keeps what it shows until the pointer leaves the bay
  const leave = useCallback(() => {
    want.current = null;
    window.clearTimeout(timer.current);
  }, []);

  const out = useCallback(() => {
    leave();
    onIntent(null);
  }, [leave, onIntent]);

  return { enter, leave, out };
}

function Face({ face }: { face: Live<string> }) {
  return <PrintText value={useLive(face)} length={5} decorative opts={{ speed: 34 }} />;
}

/* The parts that follow the minute itself: the clock, the sync line and the scrubber. */
function useMinute(clock: Live<number>, held: boolean) {
  const m = useLive(clock);
  return held ? STILL_AT : m;
}

function ClockFace({ clock, held }: { clock: Live<number>; held: boolean }) {
  const m = useMinute(clock, held);
  return <PrintText value={hhmm(m)} length={5} label={`Sample clock ${hhmm(m)}`} opts={{ speed: 14 }} />;
}

function Synced({ clock, held }: { clock: Live<number>; held: boolean }) {
  return <>Synced {hhmm(useMinute(clock, held))}</>;
}

function Scrubber({ clock, held, onScrub }: { clock: Live<number>; held: boolean; onScrub: (v: number) => void }) {
  const m = useMinute(clock, held);

  // On a touch screen the range itself ignores fingers (see the CSS): a thumb crossing the track on its way
  // down the page would otherwise jump the day and stop it. The track takes over, and scrubs only once the
  // finger has clearly moved sideways; anything else is left to the page as a scroll.
  const touch = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "touch") return;
    const el = e.currentTarget;
    const x0 = e.clientX;
    const y0 = e.clientY;
    let on = false;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      if (!on) {
        const dx = Math.abs(ev.clientX - x0);
        const dy = Math.abs(ev.clientY - y0);
        if (dy > 8 && dy >= dx) return stop();
        if (dx < 8) return;
        on = true;
      }
      const r = el.getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
      onScrub(Math.round(DAY_START + f * (DAY_END - DAY_START)));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  return (
    <div className={s.scrub}>
      <span className={s.scrubLabel}>08:00</span>
      <div className={s.track} onPointerDown={touch}>
        <input
          type="range"
          min={DAY_START}
          max={DAY_END}
          step={1}
          value={m}
          onChange={(e) => onScrub(Number(e.target.value))}
          aria-label="Scrub through the sample day"
          style={{ "--p": `${((m - DAY_START) / (DAY_END - DAY_START)) * 100}%` } as CSSProperties}
        />
        <div className={s.ticks} aria-hidden="true">
          {EVENTS.map((e, i) => (
            <span key={i} data-passed={e.at <= m || undefined} style={{ left: `${((e.at - DAY_START) / (DAY_END - DAY_START)) * 100}%` }} />
          ))}
        </div>
      </div>
      <span className={s.scrubLabel}>23:00</span>
    </div>
  );
}

type Slot = { row: DayRow; st: DayState; at: number };

type RowProps = {
  x: Slot;
  picked: boolean;
  onPick: (id: string) => void;
  onEnter: (id: string, e: React.PointerEvent) => void;
  onLeave: () => void;
};

/* One row. The bay re-renders at every event; a row only when its own state, time or pick changes. */
const Row = memo(function Row({ x, picked, onPick, onEnter, onLeave }: RowProps) {
  const { row, st, at } = x;
  return (
    <li data-flip={row.id} className={s.item} data-picked={picked || undefined} onPointerEnter={(e) => onEnter(row.id, e)} onPointerLeave={onLeave}>
      <Strip
        kind={dayKind(row, st)}
        callsign={carrier(row.repo).code}
        num={row.num}
        title={row.title}
        note={st.note}
        who={statusLabel(st.status)}
        age={at > DAY_START ? hhmm(at) : "Earlier"}
        quiet={st.next === "DONE" || !st.quiet ? null : st.quiet}
        state={dayState(st)}
        ticked={dayTicked(st)}
        struck={st.status === "CLOSED"}
        sample
        onClick={() => onPick(row.id)}
        expanded={picked}
        label={`${row.repo} #${row.num}, ${row.title}. ${whose(st)}. ${statusLabel(st.status)}. Shows its activity.`}
      />
    </li>
  );
}, (a: RowProps, b: RowProps) => a.x.st === b.x.st && a.x.at === b.x.at && a.picked === b.picked && a.onPick === b.onPick);

export function SampleWindow() {
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLSpanElement>(null);
  const { face, react } = useFace(faceRef);
  const { visible } = useInView(ref, "0px");
  const { motion } = usePrefs();
  const [reduced, setReduced] = useState(false);
  const still = !motion || reduced;

  const [clock] = useState(() => live(DAY_START));
  const [playing, setPlaying] = useState(true);
  // With motion off the day rests at a full moment until the visitor plays or scrubs it.
  const [manual, setManual] = useState(false);
  const held = still && !manual;
  const running = playing && !held;
  // The window itself only follows how many events have happened, and whether the day is over.
  const liveCount = useSyncExternalStore(clock.sub, () => passed(clock.get()), () => passed(DAY_START));
  const liveEnded = useSyncExternalStore(clock.sub, () => clock.get() >= DAY_END, () => false);
  const count = held ? passed(STILL_AT) : liveCount;
  const ended = !held && liveEnded;
  const latest = count ? EVENTS[count - 1] : null;
  // Nothing changes between events, so the bay is drawn as it stands at the latest one.
  const at = held ? STILL_AT : (latest?.at ?? DAY_START);
  const [picked, setPicked] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const intent = useHoverIntent(setHover);
  const exact = useRef(DAY_START);
  const prev = useRef(0);
  const touched = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // The clock runs only while the window is on screen.
  useEffect(() => {
    if (!running || !visible) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      exact.current = Math.min(DAY_END, exact.current + (now - last) * SPEED);
      last = now;
      clock.set(Math.floor(exact.current));
      if (exact.current >= DAY_END) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running, visible, clock]);

  // Left alone, the day starts over after a short hold at its end.
  useEffect(() => {
    if (!ended || touched.current || still || !visible) return;
    const id = window.setTimeout(() => {
      exact.current = DAY_START;
      prev.current = 0;
      clock.set(DAY_START);
      setPicked(null);
      setPlaying(true);
    }, HOLD_AT_END);
    return () => window.clearTimeout(id);
  }, [ended, still, visible, clock]);

  // Moving forward past an event: the face reacts and the row that moved flashes its status circle.
  useEffect(() => {
    const from = prev.current;
    prev.current = count;
    if (count <= from || !latest) return;
    if (latest.state.mood) react(latest.state.mood, 1500);
    if (!printMotion()) return;
    const icon = listRef.current?.querySelector<SVGElement>(`[data-flip="${latest.row.id}"] svg[data-state]`);
    icon?.animate(
      [
        { filter: "brightness(1)", transform: "scale(1)" },
        { filter: "brightness(1.7)", transform: "scale(1.22)", offset: 0.14 },
        { filter: "brightness(1)", transform: "scale(1)" },
      ],
      { duration: 900, delay: 380, easing: "cubic-bezier(0.215, 0.61, 0.355, 1)" },
    );
  }, [count, latest, react]);

  const slots = useMemo<Slot[]>(
    () => SAMPLE_DAY.map((row) => ({ row, st: stateAt(row, at), at: lastEventAt(row, at) })).sort((a, b) => b.at - a.at),
    [at],
  );
  const mine = slots.filter((x) => x.st.next === "YOU");
  const theirs = slots
    .filter((x) => x.st.next !== "YOU")
    .sort((a, b) => {
      const rank = (x: Slot) => (x.st.next === "DONE" ? 2 : (x.st.quiet ?? 0) >= STALL_DAYS ? 0 : 1);
      return rank(a) - rank(b) || b.at - a.at;
    });
  // Rows slide only when the arrangement changes, not on every tick.
  useFlip(listRef, `${mine.map((x) => x.row.id).join()}|${theirs.map((x) => x.row.id).join()}`);

  const focusId = hover ?? picked ?? latest?.row.id ?? "lt-881";
  const focus = slots.find((x) => x.row.id === focusId)!;
  const focusCode = carrier(focus.row.repo).code;
  const history = focus.row.events.filter((e) => e.at <= at);
  const repos = useMemo(() => SAMPLE_DAY.map((r) => ({ id: r.id, c: carrier(r.repo) })), []);

  const pick = useCallback((id: string) => {
    touched.current = true;
    setPicked((p) => (p === id ? null : id));
  }, []);

  const scrub = (v: number) => {
    touched.current = true;
    setManual(true);
    setPlaying(false);
    exact.current = v;
    prev.current = passed(v);
    clock.set(v);
  };

  const toggle = () => {
    touched.current = true;
    if (held || ended) {
      // play from the held moment, or from the top once the day is over
      const from = ended ? DAY_START : STILL_AT;
      exact.current = from;
      prev.current = passed(from);
      clock.set(from);
      setManual(true);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  const strip = (x: Slot) => <Row key={x.row.id} x={x} picked={picked === x.row.id} onPick={pick} onEnter={intent.enter} onLeave={intent.leave} />;

  return (
    <div ref={ref} className={s.window} data-shine>
      {/* the sidebar, drawn as the app draws it; decorative, the real one lives at /board */}
      <aside className={s.side} aria-hidden="true">
        <div className={s.workspace}>
          <span className={s.face} ref={faceRef}>
            <Face face={face} />
          </span>
          <span className={s.wsName}>Spool</span>
          <ChevronDown size={14} className={s.wsCaret} />
        </div>
        <ul className={s.nav}>
          {NAV.slice(0, 5).map((n, i) => (
            <li key={n.href} data-on={i === 0 || undefined}>
              <n.icon size={15} strokeWidth={1.8} />
              <span>{n.label}</span>
              {i === 0 && mine.length > 0 && <span className={s.navCount}>{mine.length}</span>}
            </li>
          ))}
        </ul>
        <p className={s.sideHead}>Your repos</p>
        <ul className={s.repos}>
          {repos.map((r) => (
            <li key={r.id} data-on={r.id === focusId || undefined}>
              <span className={s.repoCode}>{r.c.code}</span>
              <span className={s.repoName}>{r.c.name}</span>
            </li>
          ))}
        </ul>
        <p className={s.synced}>
          <RefreshCw size={12} strokeWidth={2} />
          <Synced clock={clock} held={held} />
        </p>
      </aside>

      <div className={s.main}>
        <div className={s.bar}>
          <h2 className={s.barTitle}>Your bay</h2>
          <span className={s.sample}>Sample day</span>
          <span className={s.clock}>
            <ClockFace clock={clock} held={held} />
          </span>
          <button
            type="button"
            className={s.play}
            onClick={toggle}
            aria-label={ended ? "Replay the sample day" : running ? "Pause the sample day" : "Play the sample day"}
          >
            {ended ? <RotateCcw size={14} /> : running ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>

        <div ref={listRef} className={s.list} onPointerLeave={intent.out}>
          <Bay name="Your move" which="you" as="div" count={<PrintText value={String(mine.length)} length={1} label={`${mine.length} on you`} />} hint="They answered. You owe the next word.">
            <ul className={s.rack}>{mine.map(strip)}</ul>
            {mine.length === 0 && <p className={s.empty}>Nothing waiting on you right now.</p>}
          </Bay>
          <Bay
            name="Their move"
            which="them"
            as="div"
            count={<PrintText value={String(theirs.filter((x) => x.st.next !== "DONE").length)} length={1} label={`${theirs.length} on them`} />}
            hint="You sent it off. Silence is counted in days."
          >
            <ul className={s.rack}>{theirs.map(strip)}</ul>
          </Bay>
        </div>

        <Scrubber clock={clock} held={held} onScrub={scrub} />
      </div>

      {/* the thread that just moved, or the one under the pointer */}
      <section className={s.detail} aria-label="Thread activity" aria-live="off">
        <p className={s.detailId}>
          {focusCode}-{focus.row.num}
          <span className={s.detailRepo}>{focus.row.repo}</span>
        </p>
        <h3 className={s.detailTitle}>{focus.row.title}</h3>
        <p className={s.detailState} data-state={dayState(focus.st)}>
          <StatusIcon state={dayState(focus.st)} />
          {whose(focus.st)}
          {focus.st.next !== "DONE" && !!focus.st.quiet && <span className={s.detailQuiet}>{focus.st.quiet}d quiet</span>}
        </p>
        <p className={s.detailHead}>Activity</p>
        <ol className={s.log} key={focus.row.id}>
          {history.map((e, k) => (
            <li key={e.at} data-now={k === history.length - 1 || undefined}>
              <StateMark state={markFor(e.state.tone)} />
              <span className={s.logBody}>
                <span className={s.logStatus}>{statusLabel(e.state.status)}</span>
                <span className={s.logNote}>{e.state.note}</span>
              </span>
              <span className={s.logTime}>{e.at > DAY_START ? hhmm(e.at) : "Before"}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
