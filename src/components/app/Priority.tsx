"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Flag } from "lucide-react";
import { PRIOS, type Prio } from "@/lib/plan";
import { setPrio, type PlanStore } from "@/lib/store";
import s from "./priority.module.css";

/* Priority as Linear draws it: three bars, as many lit as the priority is high. Grey, never a fill. */
export function PriorityTag({ p, full }: { p: Prio | null; full?: boolean }) {
  // no priority: three short dashes in the same slot, as Linear draws it, so titles still line up
  // and the mark can't be read as a low level
  if (p === null) {
    return (
      <span className={s.tag} data-p="none" title="No priority">
        <svg className={s.bars} viewBox="0 0 16 16" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <rect key={i} x={1.5 + i * 4.75} y="7.25" width="3.5" height="1.5" rx="0.75" />
          ))}
        </svg>
      </span>
    );
  }
  const lit = 4 - p;
  return (
    <span className={s.tag} data-p={p} title={`${PRIOS[p].short} ${PRIOS[p].label}: ${PRIOS[p].hint}`}>
      <svg className={s.bars} viewBox="0 0 16 16" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <rect key={i} x={2 + i * 4.5} y={10 - i * 3.5} width="3" height={4 + i * 3.5} rx="1" data-lit={i < lit || undefined} />
        ))}
      </svg>
      <span className={full ? s.word : "sr-only"}>{full ? PRIOS[p].label : `${PRIOS[p].short} ${PRIOS[p].label}`}</span>
    </span>
  );
}

/* A priority you can set from anywhere a thread or card shows up. Keys 1, 2, 3 and 0 do the same on the board. */
export function PriorityMenu({
  st,
  k,
  p,
  label,
  full,
  align = "right",
}: {
  st: PlanStore;
  k: string;
  p: Prio | null;
  /** what the priority is for, for screen readers */
  label: string;
  full?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  const pick = (next: Prio | null) => {
    setPrio(st, k, next);
    setOpen(false);
  };

  return (
    <div className={s.wrap} ref={ref}>
      <button
        type="button"
        className={s.trigger}
        data-set={p ?? undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={p ? `Priority ${PRIOS[p].short} ${PRIOS[p].label} for ${label}. Change` : `Set a priority for ${label}`}
        title={p ? `${PRIOS[p].short} ${PRIOS[p].label}. Change priority` : "Set a priority"}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {p ? <PriorityTag p={p} full={full} /> : <Flag size={15} aria-hidden="true" />}
      </button>
      {open && (
        <div className={s.menu} data-align={align} role="menu" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          {([1, 2, 3] as Prio[]).map((n) => (
            <button key={n} type="button" role="menuitemradio" aria-checked={p === n} onClick={() => pick(n)}>
              <PriorityTag p={n} />
              <span className={s.itemText}>
                <strong>{PRIOS[n].label}</strong>
                <span>{PRIOS[n].hint}</span>
              </span>
              {p === n && <Check size={14} aria-hidden="true" className={s.check} />}
            </button>
          ))}
          <button type="button" role="menuitemradio" aria-checked={p === null} onClick={() => pick(null)}>
            <span className={s.none}>
              <Flag size={13} aria-hidden="true" />
            </span>
            <span className={s.itemText}>
              <strong>No priority</strong>
            </span>
            {p === null && <Check size={14} aria-hidden="true" className={s.check} />}
          </button>
        </div>
      )}
    </div>
  );
}
