"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { StateMark, type MarkState } from "@/components/kit/Kit";
import { Bay, Strip } from "@/components/kit/Strip";
import { PrintText } from "@/components/print/PrintText";
import { carrier } from "@/lib/carriers";
import type { Mood } from "@/lib/faces";
import { allEvents, DAY_END, DAY_START, hhmm, lastEventAt, SAMPLE_DAY, stateAt, type DayRow, type DayState } from "@/lib/sample-day";
import { dayKind, dayState, dayTicked, STALL_DAYS } from "./dayStrip";
import { useFlip } from "./flip";
import { useInView } from "./mood";
import sec from "./section.module.css";
import s from "./dayboard.module.css";

const SPEED = (DAY_END - DAY_START) / 42000; // a full day in 42 seconds
const EVENTS = allEvents();

function markFor(tone: string | undefined): MarkState {
  return tone === "go" ? "go" : tone === "wait" ? "wait" : tone === "stop" ? "stop" : "idle";
}

/*
 * One strip. Memoised: the clock ticks about twenty times a second while the day plays,
 * and a strip only re-renders when its own state, focus or history changes.
 */
const DayStrip = memo(function DayStrip({
  row,
  st,
  at,
  open,
  dim,
  minute,
  onHover,
  onToggle,
}: {
  row: DayRow;
  st: DayState;
  at: number;
  open: boolean;
  dim: boolean;
  /** the clock, passed only while the strip is open (its history grows with it) */
  minute: number;
  onHover: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const quiet = st.next === "DONE" ? null : (st.quiet ?? 0);
  return (
    <li className={s.item} data-flip={row.id} data-dim={dim || undefined} onPointerEnter={() => onHover(row.id)} onFocus={() => onHover(row.id)}>
      <Strip
        kind={dayKind(row, st)}
        callsign={carrier(row.repo).code}
        num={row.num}
        title={row.title}
        note={st.note}
        who={st.status}
        age={at > DAY_START ? hhmm(at) : "earlier"}
        quiet={quiet}
        state={dayState(st)}
        ticked={dayTicked(st)}
        struck={st.status === "CLOSED"}
        sample
        onClick={() => onToggle(row.id)}
        expanded={open}
        label={`${row.repo} #${row.num}, ${row.title}. ${st.next === "YOU" ? "Your move" : st.next === "THEM" ? "Their move" : "Done"}. ${st.status}. ${st.note}. Press to ${open ? "close" : "open"} its moves.`}
        below={
          open ? (
            <ol className={s.log} aria-label={`Moves on ${row.repo} #${row.num} so far`}>
              {row.events
                .filter((e) => e.at <= minute)
                .map((e, k, all) => (
                  <li key={e.at} data-now={k === all.length - 1 || undefined}>
                    <span className={s.logTime}>{e.at > DAY_START ? hhmm(e.at) : "before"}</span>
                    <StateMark state={markFor(e.state.tone)} />
                    <span className={s.logStatus}>{e.state.status}</span>
                    <span className={s.logNote}>{e.state.note}</span>
                  </li>
                ))}
            </ol>
          ) : undefined
        }
      />
    </li>
  );
});

export function DayBoard({ onEvent }: { onEvent?: (m: Mood, ms?: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const baysRef = useRef<HTMLDivElement>(null);
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

  const slots = useMemo(
    () => SAMPLE_DAY.map((row) => ({ row, st: stateAt(row, minute), at: lastEventAt(row, minute) })).sort((a, b) => b.at - a.at),
    [minute],
  );
  const mine = slots.filter((x) => x.st.next === "YOU");
  const theirs = slots
    .filter((x) => x.st.next !== "YOU")
    .sort((a, b) => {
      const rank = (x: (typeof slots)[number]) => (x.st.next === "DONE" ? 2 : (x.st.quiet ?? 0) >= STALL_DAYS ? 0 : 1);
      return rank(a) - rank(b) || b.at - a.at;
    });
  // Strips slide only when the arrangement changes, not on every tick of the clock.
  const arrangement = `${mine.map((x) => x.row.id).join()}|${theirs.map((x) => x.row.id).join()}|${open ?? ""}`;
  useFlip(baysRef, arrangement);

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
      : { at: DAY_START, repo: "", num: 0, note: "The bay opens at 08:00. Five threads across five repos." };

  const ended = minute >= DAY_END;

  // Opening a strip stops the clock so its history holds still while you read it.
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

  const strip = (x: (typeof slots)[number]) => (
    <DayStrip
      key={x.row.id}
      row={x.row}
      st={x.st}
      at={x.at}
      open={open === x.row.id}
      dim={!!focusId && focusId !== x.row.id}
      minute={open === x.row.id ? minute : 0}
      onHover={setHover}
      onToggle={toggle}
    />
  );

  return (
    <div ref={ref} className={`${sec.panel} ${s.wrap}`}>
      <div className={s.head}>
        <p className={s.title}>
          Today&rsquo;s bay <span className={sec.tag}>Sample data</span>
        </p>
        <p className={s.remark} aria-live="polite">
          <span className={s.remarkTime}>{hhmm(remark.at)}</span>
          {remark.repo && (
            <span className={s.remarkRef}>
              {remark.repo}#{remark.num}
            </span>
          )}
          <span className={s.remarkNote}>{remark.note}</span>
        </p>
      </div>

      <div ref={baysRef} className={s.bays} onPointerLeave={() => setHover(null)}>
        <Bay name="Your move" which="you" as="div" count={<PrintText value={String(mine.length)} length={1} label={`${mine.length} on you`} />}>
          <ul className={s.rack}>{mine.map(strip)}</ul>
          {mine.length === 0 && <p className={s.empty}>Nothing waiting on you.</p>}
        </Bay>
        <Bay
          name="Their move"
          which="them"
          as="div"
          count={<PrintText value={String(theirs.filter((x) => x.st.next !== "DONE").length)} length={1} label={`${theirs.length} on them`} />}
        >
          <ul className={s.rack}>{theirs.map(strip)}</ul>
        </Bay>
      </div>

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
        <span className={s.clock}>
          <PrintText value={hhmm(minute)} length={5} label={`Sample clock ${hhmm(minute)}`} opts={{ speed: 14 }} />
        </span>
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
