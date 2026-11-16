"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { sampleChanges, type Change } from "@/lib/changes";
import { ago, type Thread } from "@/lib/classify";
import { changesStore, handleChanges } from "@/lib/store";
import { useBoard } from "./BoardProvider";
import s from "./changes.module.css";

/* What changed on GitHub since your last visit, until you mark it handled. */
export function useChanges() {
  const { mode, login, threads, now } = useBoard();
  const box = changesStore.use();
  // The sample list is invented and lasts only for the page, like the sample plan.
  const [sampleHandled, setSampleHandled] = useState<Set<string>>(() => new Set());

  const items: Change[] = useMemo(() => {
    if (mode === "sample") return now ? sampleChanges(threads, now).filter((c) => !sampleHandled.has(c.id)) : [];
    if (mode !== "live" || box.login !== login) return [];
    return Object.values(box.items).sort((a, c) => c.at.localeCompare(a.at));
  }, [mode, now, threads, sampleHandled, box, login]);

  const handle = (ids: string[] | "all") => {
    if (mode === "sample") setSampleHandled((h) => new Set([...h, ...(ids === "all" ? items.map((c) => c.id) : ids)]));
    else handleChanges(ids);
  };
  return { items, handle, sample: mode === "sample" };
}

export function ChangesList({ items, handle, onOpen }: { items: Change[]; handle: (ids: string[]) => void; onOpen: (t: Thread) => void }) {
  const { threads, now, codeFor } = useBoard();
  return (
    <ul className={s.list}>
      {items.map((c) => {
        const t = threads.find((x) => x.id === c.id);
        const ref = `${codeFor(c.repo) ?? c.repo}-${c.num}`;
        return (
          <li key={c.id} className={s.item} data-kind={c.kind}>
            <span className={s.label}>
              <span className={s.dot} aria-hidden="true" />
              {c.label}
              {c.count > 1 && <span className={s.more}>+{c.count - 1} more</span>}
            </span>
            <div className={s.main}>
              {t ? (
                <button type="button" className={s.title} onClick={() => onOpen(t)}>
                  <span className={s.ref}>{ref}</span>
                  {c.title}
                </button>
              ) : (
                <a className={s.title} href={c.url} target="_blank" rel="noreferrer">
                  <span className={s.ref}>{ref}</span>
                  {c.title}
                  <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              )}
              <span className={s.text}>{c.text}</span>
            </div>
            <span className={s.when}>{now ? ago(c.at, now) : ""}</span>
            <button type="button" className={s.done} onClick={() => handle([c.id])} title="Mark handled">
              <Check size={16} aria-hidden="true" />
              <span className="sr-only">Mark {c.repo}#{c.num} handled</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
