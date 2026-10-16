"use client";

import { memo, useEffect, useRef, useState } from "react";
import { ArrowUpRight, BellOff, Clock, Pin, PinOff } from "lucide-react";
import { StateMark } from "@/components/kit/Kit";
import { Strip, type StripKind, type StripState } from "@/components/kit/Strip";
import { carrier } from "@/lib/carriers";
import { statusLabel } from "@/lib/format";
import { ago, type Thread } from "@/lib/classify";
import { threadKey, type Prio } from "@/lib/plan";
import { snooze, togglePin, type PlanStore } from "@/lib/store";
import { PriorityMenu, PriorityTag } from "./Priority";
import s from "./board.module.css";

export const SNOOZES: { label: string; days: number }[] = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
  { label: "In 2 weeks", days: 14 },
];

export function SnoozeMenu({ id, onDone, snoozedUntil }: { id: string; onDone?: () => void; snoozedUntil?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <div className={s.snooze} ref={ref}>
      <button
        type="button"
        className={s.iconBtn}
        aria-haspopup="menu"
        aria-expanded={open}
        title={snoozedUntil ? "Snoozed. Change or wake it" : "Snooze"}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <Clock size={16} aria-hidden="true" />
        <span className="sr-only">Snooze</span>
      </button>
      {open && (
        <div className={s.menu} role="menu" onClick={(e) => e.stopPropagation()}>
          {SNOOZES.map((o) => (
            <button
              key={o.days}
              type="button"
              role="menuitem"
              onClick={() => {
                snooze(id, o.days);
                setOpen(false);
                onDone?.();
              }}
            >
              {o.label}
            </button>
          ))}
          {snoozedUntil && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                snooze(id, null);
                setOpen(false);
              }}
            >
              <BellOff size={14} aria-hidden="true" /> Wake it now
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type Props = {
  t: Thread;
  code?: string;
  now: number;
  fresh: boolean;
  pinned: boolean;
  snoozedUntil?: string;
  note?: string;
  prio: Prio | null;
  planSt: PlanStore;
  selected: boolean;
  dim: boolean;
  onSelect: (t: Thread) => void;
};

/* What the strip's paper says about the thread: a review asked of you is pink, threads you only talk on are green. */
export function stripKind(t: Thread): StripKind {
  if (t.next === "watch") return "talk";
  if (t.kind === "pr" && t.sources.includes("review") && t.next === "you") return "review";
  return t.kind;
}

export function stripState(t: Thread): StripState {
  if (t.next === "done") return "done";
  if (t.next === "you") return "you";
  if (t.next === "them") return t.tone === "wait" ? "stalled" : "them";
  return "idle";
}

export const ThreadRow = memo(function ThreadRow({ t, code, now, fresh, pinned, snoozedUntil, note, prio, planSt, selected, dim, onSelect }: Props) {
  return (
    <Strip
      as="li"
      className={s.row}
      data={{
        "data-id": t.id,
        "data-selected": selected ? "" : undefined,
        "data-dim": dim ? "" : undefined,
        "data-fresh": fresh ? "" : undefined,
        "data-pinned": pinned ? "" : undefined,
      }}
      kind={stripKind(t)}
      callsign={code ?? carrier(t.repo).code}
      num={t.num}
      title={
        <>
          {pinned && <Pin size={13} className={s.pinMark} aria-hidden="true" />}
          <PriorityTag p={prio} />
          {t.title}
        </>
      }
      note={
        <>
          <span className={s.status}>
            <StateMark state={t.tone ?? "idle"} />
            {statusLabel(t.status)}
          </span>
          {note ? `Note: ${note}` : t.reason}
        </>
      }
      who={t.lastActor ? `@${t.lastActor}` : undefined}
      age={now ? ago(t.lastAt, now) : undefined}
      quiet={t.next === "done" || t.quietDays < 1 ? null : t.quietDays}
      state={stripState(t)}
      struck={t.state === "closed"}
      onClick={() => onSelect(t)}
      expanded={selected}
      asideOverlay
      label={`${t.title}, ${t.repo}#${t.num}. ${t.status}. ${t.reason}. Quiet ${t.quietDays} days.`}
      aside={
        <span className={s.actions}>
          <PriorityMenu st={planSt} k={threadKey(t.id)} p={prio} label={`${t.repo}#${t.num}`} />
          <button
            type="button"
            className={s.iconBtn}
            onClick={() => togglePin(t.id)}
            title={pinned ? "Unpin" : "Pin to the top"}
            aria-pressed={pinned}
          >
            {pinned ? <PinOff size={16} aria-hidden="true" /> : <Pin size={16} aria-hidden="true" />}
            <span className="sr-only">{pinned ? "Unpin" : "Pin"}</span>
          </button>
          {t.next !== "done" && <SnoozeMenu id={t.id} snoozedUntil={snoozedUntil} />}
          <a className={s.iconBtn} href={t.url} target="_blank" rel="noreferrer" title="Open on GitHub">
            <ArrowUpRight size={16} aria-hidden="true" />
            <span className="sr-only">Open on GitHub</span>
          </a>
        </span>
      }
    />
  );
});
