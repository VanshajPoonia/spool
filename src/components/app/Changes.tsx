"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Check, ChevronDown } from "lucide-react";
import { Bay } from "@/components/kit/Strip";
import { sampleChanges, type Change } from "@/lib/changes";
import { ago, type Thread } from "@/lib/classify";
import { changesStore, handleChanges } from "@/lib/store";
import { useBoard } from "./BoardProvider";
import b from "./board.module.css";
import s from "./changes.module.css";

/* What changed on GitHub since your last visit, above the bays, until you mark it handled. */
export function ChangesPanel({ onOpen }: { onOpen: (t: Thread) => void }) {
  const { mode, login, threads, now, codeFor } = useBoard();
  const box = changesStore.use();
  const [open, setOpen] = useState(true);
  // The sample list is invented and lasts only for the page, like the sample plan.
  const [sampleHandled, setSampleHandled] = useState<Set<string>>(() => new Set());

  const items: Change[] = useMemo(() => {
    if (mode === "sample") return now ? sampleChanges(threads, now).filter((c) => !sampleHandled.has(c.id)) : [];
    if (mode !== "live" || box.login !== login) return [];
    return Object.values(box.items).sort((a, c) => c.at.localeCompare(a.at));
  }, [mode, now, threads, sampleHandled, box, login]);

  if (!items.length) return null;

  const handle = (ids: string[] | "all") => {
    if (mode === "sample") setSampleHandled((h) => new Set([...h, ...(ids === "all" ? items.map((c) => c.id) : ids)]));
    else handleChanges(ids);
  };

  return (
    <Bay
      name="Since you last looked"
      className={s.panel}
      count={<span className={s.count}>{items.length}</span>}
      hint={mode === "sample" ? "Sample changes, invented for the sample board." : "What changed on GitHub since your last visit."}
      tools={
        <>
          <button type="button" className={s.all} onClick={() => handle("all")}>
            <Check size={14} aria-hidden="true" />
            Mark all handled
          </button>
          <button type="button" className={b.collapse} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <ChevronDown size={18} aria-hidden="true" />
            <span className="sr-only">{open ? "Collapse" : "Expand"}</span>
          </button>
        </>
      }
    >
      {open && (
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
      )}
    </Bay>
  );
}
