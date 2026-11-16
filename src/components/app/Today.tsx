"use client";

import { CalendarPlus, Check, ChevronDown } from "lucide-react";
import { Bay } from "@/components/kit/Strip";
import type { Thread } from "@/lib/classify";
import { downloadIcs } from "@/lib/ics";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { ChangesList, useChanges } from "./Changes";
import { ComingUpList } from "./ComingUp";
import { useAllDeadlines, useDeadlines } from "./useDeadlines";
import b from "./board.module.css";
import s from "./today.module.css";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* One strip above the bays: what's coming up in the next 14 days, and what changed since you last looked. Folds to a line. */
export function TodayStrip({ onOpen }: { onOpen: (t: Thread) => void }) {
  const coming = useDeadlines();
  const all = useAllDeadlines();
  const changes = useChanges();
  const { todayFolded } = usePrefs();
  if (!coming.length && !changes.items.length) return null;

  const summary = [coming.length ? `${coming.length} coming up` : "", changes.items.length ? plural(changes.items.length, "change", "changes") : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <Bay
      name="Today"
      className={s.panel}
      count={<span className={s.count}>{summary}</span>}
      hint={changes.sample ? "Sample data." : undefined}
      tools={
        <>
          {!todayFolded && changes.items.length > 0 && (
            <button type="button" className={s.tool} onClick={() => changes.handle("all")} title="Mark all handled">
              <Check size={14} aria-hidden="true" />
              <span className={s.toolText}>Mark all handled</span>
            </button>
          )}
          {!todayFolded && coming.length > 0 && (
            <button type="button" className={s.tool} onClick={() => downloadIcs(all)} title="Download every followed date as a calendar file">
              <CalendarPlus size={14} aria-hidden="true" />
              <span className={s.toolText}>Calendar file</span>
            </button>
          )}
          <button type="button" className={b.collapse} aria-expanded={!todayFolded} onClick={() => setPrefs({ todayFolded: !todayFolded })}>
            <ChevronDown size={18} aria-hidden="true" />
            <span className="sr-only">{todayFolded ? "Show Today" : "Fold Today to one line"}</span>
          </button>
        </>
      }
    >
      {!todayFolded && (
        <>
          {coming.length > 0 && (
            <section aria-label="Coming up">
              <h4 className={s.head}>Coming up</h4>
              <ComingUpList items={coming} />
            </section>
          )}
          {changes.items.length > 0 && (
            <section aria-label="Since you last looked">
              <h4 className={s.head}>Since you last looked</h4>
              <ChangesList items={changes.items} handle={changes.handle} onOpen={onOpen} />
            </section>
          )}
        </>
      )}
    </Bay>
  );
}
