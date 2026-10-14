"use client";

import { memo, useEffect, useRef, useState } from "react";
import { ArrowUpRight, BellOff, Clock, GitPullRequest, CircleDot, Pin, PinOff } from "lucide-react";
import { FlapText } from "@/components/flap/Flap";
import { CarrierTag, Lamp } from "@/components/kit/Kit";
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

export const ThreadRow = memo(function ThreadRow({ t, code, now, fresh, pinned, snoozedUntil, note, prio, planSt, selected, dim, onSelect }: Props) {
  const Icon = t.kind === "pr" ? GitPullRequest : CircleDot;
  return (
    <li
      className={s.row}
      data-selected={selected || undefined}
      data-dim={dim || undefined}
      data-fresh={fresh || undefined}
      data-id={t.id}
    >
      <button type="button" className={s.rowMain} onClick={() => onSelect(t)} aria-label={`${t.title}, ${t.repo}#${t.num}. ${t.status}. ${t.reason}`}>
        <span className={s.freshTab} aria-hidden="true" />
        <CarrierTag repo={t.repo} code={code} />
        <span className={s.what}>
          <span className={s.title}>
            {pinned && <Pin size={13} className={s.pinMark} aria-hidden="true" />}
            {prio && <PriorityTag p={prio} />}
            {t.title}
          </span>
          <span className={s.meta}>
            <Icon size={13} aria-hidden="true" className={s.kind} data-kind={t.kind} />
            <span className={s.ref}>
              {t.repo}#{t.num}
            </span>
            <span className={s.reason}>{note ? `Note: ${note}` : t.reason}</span>
          </span>
        </span>
        <span className={s.statusCell}>
          <Lamp state={t.tone ?? "idle"} />
          <FlapText value={t.status} length={12} tone={t.tone} />
        </span>
        <span className={s.when}>
          <span className={s.actor}>{t.lastActor ? `@${t.lastActor}` : ""}</span>
          <span className={s.age}>{now ? ago(t.lastAt, now) : ""}</span>
        </span>
      </button>
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
    </li>
  );
});
