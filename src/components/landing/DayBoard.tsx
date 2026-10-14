"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { FlapText } from "@/components/flap/Flap";
import { CarrierTag, Lamp, type LampState } from "@/components/kit/Kit";
import { carrier } from "@/lib/carriers";
import type { Mood } from "@/lib/faces";
import { allEvents, DAY_END, DAY_START, hhmm, lastEventAt, SAMPLE_DAY, stateAt, type DayRow, type DayState, type Next } from "@/lib/sample-day";
import { useInView } from "./mood";
import s from "./dayboard.module.css";

const SPEED = (DAY_END - DAY_START) / 42000; // a full day in 42 seconds
const ORDER: Record<Next, number> = { YOU: 0, THEM: 1, DONE: 2 };
const EVENTS = allEvents();

const DANGLING = new Set(["A", "AN", "THE", "TO", "OF", "ON", "IN", "FOR", "FROM", "WITH", "BY", "AT", "AND", "OR"]);

/* Fit a title to n flap columns at word boundaries, never ending on a dangling preposition. */
export function fitWords(text: string, n: number) {
  const up = text.toUpperCase();
  if (up.length <= n) return up;
  const words: string[] = [];
  for (const w of up.split(" ")) {
    if ([...words, w].join(" ").length > n) break;
    words.push(w);
  }
  while (words.length > 1 && DANGLING.has(words[words.length - 1])) words.pop();
  return words.join(" ") || up.slice(0, n);
}

function lampFor(tone: string | undefined): LampState {
  return tone === "go" ? "go" : tone === "wait" ? "wait" : tone === "stop" ? "stop" : "idle";
}

/*
 * One board row. Memoised: the clock ticks about twenty times a second while the day plays,
 * and a row only re-renders when its own state, freshness or focus changes.
 */
const BoardRow = memo(function BoardRow({
  row,
  st,
  at,
  fresh,
  open,
  dim,
  minute,
  onHover,
  onToggle,
}: {
  row: DayRow;
  st: DayState;
  at: number;
  fresh: boolean;
  open: boolean;
  dim: boolean;
  /** the clock, passed only while the row is open (its history grows with it) */
  minute: number;
  onHover: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      role="row"
      className={s.row}
      data-dim={dim || undefined}
      data-fresh={fresh || undefined}
      data-open={open || undefined}
      onPointerEnter={() => onHover(row.id)}
      onFocus={() => onHover(row.id)}
      onClick={() => onToggle(row.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(row.id);
        }
      }}
      tabIndex={0}
      aria-expanded={open}
      aria-label={`${row.repo} #${row.num}, ${row.title}. Next move: ${st.next === "YOU" ? "you" : st.next === "THEM" ? "them" : "done"}. ${st.status}. Press Enter for its history.`}
    >
      <span className={s.fresh} aria-hidden="true" />
      <FlapText value={hhmm(at)} length={5} decorative />
      <span className={s.carrierCell} key={row.id}>
        <CarrierTag repo={row.repo} />
      </span>
      <span className={s.colThread}>
        <FlapText value={row.board} length={22} decorative />
      </span>
      <span className={s.colNo}>
        <FlapText value={`#${row.num}`} length={6} decorative />
      </span>
      <FlapText value={st.next} length={4} tone={st.next === "THEM" ? "dim" : st.next === "DONE" ? "go" : undefined} decorative />
      <span className={s.status}>
        <Lamp state={lampFor(st.tone)} />
        <FlapText value={st.status} length={12} tone={st.tone} decorative />
      </span>
      <span className={s.mobileTitle}>
        {carrier(row.repo).full} #{row.num} · {row.title}
      </span>
      {open && (
        <ol className={s.log}>
          {row.events
            .filter((e) => e.at <= minute)
            .map((e, k, all) => (
              <li key={e.at} data-now={k === all.length - 1 || undefined}>
                <span className={s.logTime}>{hhmm(e.at)}</span>
                <Lamp state={lampFor(e.state.tone)} />
                <span className={s.logStatus}>{e.state.status}</span>
                <span className={s.logNote}>{e.state.note}</span>
              </li>
            ))}
        </ol>
      )}
    </div>
  );
});

export function DayBoard({ onEvent }: { onEvent?: (m: Mood, ms?: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { visible } = useInView(ref, "0px");
  const [minute, setMinute] = useState(DAY_START);
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const exact = useRef(DAY_START);
  const prev = useRef(DAY_START);
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    if (!playing || !visible) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      exact.current = Math.min(DAY_END, exact.current + (now - last) * SPEED);
      last = now;
      const m = Math.floor(exact.current);
      setMinute((cur) => (cur === m ? cur : m));
      if (exact.current >= DAY_END) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, visible]);

  // Fire the face for events the clock just passed (forward only).
  useEffect(() => {
    const from = prev.current;
    prev.current = minute;
    if (minute <= from) return;
    const passed = EVENTS.filter((e) => e.at > from && e.at <= minute && e.state.mood);
    const latest = passed[passed.length - 1];
    if (latest?.state.mood) onEventRef.current?.(latest.state.mood, 1800);
  }, [minute]);

  const slots = useMemo(() => {
    return SAMPLE_DAY.map((row) => ({ row, st: stateAt(row, minute), at: lastEventAt(row, minute) })).sort(
      (a, b) => ORDER[a.st.next] - ORDER[b.st.next] || b.at - a.at,
    );
  }, [minute]);

  const latest = useMemo(() => {
    let e = null as (typeof EVENTS)[number] | null;
    for (const ev of EVENTS) if (ev.at <= minute) e = ev;
    return e;
  }, [minute]);

  const focusId = hover ?? open;
  const focus = focusId ? slots.find((x) => x.row.id === focusId) : null;
  const remark = focus
    ? { at: focus.at, repo: focus.row.repo, num: focus.row.num, note: focus.st.note }
    : latest
      ? { at: latest.at, repo: latest.row.repo, num: latest.row.num, note: latest.state.note }
      : { at: DAY_START, repo: "", num: 0, note: "Board opens at 08:00. Five threads across five repos." };

  const onYou = slots.filter((x) => x.st.next === "YOU").length;
  const ended = minute >= DAY_END;

  // Opening a row stops the clock so its history holds still while you read it.
  const toggle = useCallback((id: string) => {
    setPlaying(false);
    setOpen((o) => (o === id ? null : id));
  }, []);

  const scrub = (v: number) => {
    setPlaying(false);
    exact.current = v;
    prev.current = v;
    setMinute(v);
  };

  return (
    <div ref={ref} className={s.wrap}>
      <div className={s.head}>
        <div className={s.title}>
          <span className={s.titleMain}>Today&rsquo;s board</span>
          <span className={s.sample}>Sample data</span>
        </div>
        <div className={s.counts} aria-live="polite">
          <span>
            On you <FlapText value={String(onYou)} length={1} size="22px" />
          </span>
          <span>
            On them <FlapText value={String(slots.filter((x) => x.st.next === "THEM").length)} length={1} size="22px" />
          </span>
        </div>
      </div>

      <div className={s.board} role="table" aria-label="Sample board of open threads" onPointerLeave={() => setHover(null)}>
        <div className={s.labels} role="row">
          <span role="columnheader">Time</span>
          <span role="columnheader">Repo</span>
          <span role="columnheader" className={s.colThread}>
            Thread
          </span>
          <span role="columnheader" className={s.colNo}>
            No.
          </span>
          <span role="columnheader">Next</span>
          <span role="columnheader">Status</span>
        </div>
        {slots.map((x, i) => (
          <BoardRow
            key={i}
            row={x.row}
            st={x.st}
            at={x.at}
            fresh={minute - x.at < 75 && x.at > DAY_START}
            open={open === x.row.id}
            dim={!!focusId && focusId !== x.row.id}
            minute={open === x.row.id ? minute : 0}
            onHover={setHover}
            onToggle={toggle}
          />
        ))}
      </div>

      <p className={s.remark} aria-live="polite">
        <span className={s.remarkTime}>{hhmm(remark.at)}</span>
        {remark.repo && (
          <span className={s.remarkRef}>
            {remark.repo}#{remark.num}
          </span>
        )}
        <span className={s.remarkNote} key={remark.note}>
          {remark.note}
        </span>
      </p>

      <div className={s.scrub}>
        <button
          type="button"
          className={s.play}
          onClick={() => {
            if (ended) {
              exact.current = DAY_START;
              prev.current = DAY_START;
              setMinute(DAY_START);
            }
            setOpen(null);
            setPlaying((p) => !p || ended);
          }}
          aria-label={ended ? "Replay the sample day" : playing ? "Pause the sample day" : "Play the sample day"}
        >
          {ended ? <RotateCcw size={18} /> : playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <FlapText value={hhmm(minute)} length={5} size="26px" label={`Sample clock ${hhmm(minute)}`} opts={{ step: 34, maxSteps: 3, stagger: 0 }} />
        <div className={s.track}>
          <input
            type="range"
            min={DAY_START}
            max={DAY_END}
            step={1}
            value={minute}
            onChange={(e) => scrub(Number(e.target.value))}
            aria-label="Scrub through the sample day"
            style={{ "--p": `${((minute - DAY_START) / (DAY_END - DAY_START)) * 100}%` } as React.CSSProperties}
          />
          <div className={s.ticks} aria-hidden="true">
            {EVENTS.map((e, i) => (
              <span
                key={i}
                className={s.tick}
                data-passed={e.at <= minute || undefined}
                style={{ left: `${((e.at - DAY_START) / (DAY_END - DAY_START)) * 100}%` }}
              />
            ))}
          </div>
          <div className={s.hours} aria-hidden="true">
            {[8, 11, 14, 17, 20, 23].map((hr) => (
              <span key={hr} style={{ left: `${((hr * 60 - DAY_START) / (DAY_END - DAY_START)) * 100}%` }}>
                {String(hr).padStart(2, "0")}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
