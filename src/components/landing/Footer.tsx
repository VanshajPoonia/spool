"use client";

import Link from "next/link";
import { KeyboardEvent, useMemo, useRef, useState } from "react";
import { FlapText } from "@/components/flap/Flap";
import { CHARSET } from "@/components/flap/engine";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { useSectionFace } from "./mood";
import s from "./footer.module.css";

const COLS = 18;
const ROWS = 3;
// On phones the same message wraps onto a narrower, taller board so the tiles stay legible.
const NCOLS = 9;
const NROWS = 6;

function wrapWords(lines: string[], cols: number, rows: number) {
  const out: string[] = [];
  for (const line of lines) {
    let cur = "";
    for (const w of line.split(" ").filter(Boolean)) {
      if (!cur) cur = w.slice(0, cols);
      else if (`${cur} ${w}`.length <= cols) cur = `${cur} ${w}`;
      else {
        out.push(cur);
        cur = w.slice(0, cols);
      }
    }
    if (cur) out.push(cur);
  }
  while (out.length < rows) out.push("");
  return out.slice(0, rows);
}

function chunk(text: string, cols: number, rows: number) {
  return Array.from({ length: rows }, (_, r) => text.slice(r * cols, (r + 1) * cols));
}

export function Footer({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLElement>(null);
  const prefs = usePrefs();
  const initial = useMemo(() => lines.map((l) => l.toUpperCase().slice(0, COLS)), [lines]);
  const [typed, setTyped] = useState<string | null>(null);
  useSectionFace(ref, "(^_^)");

  const rows = useMemo(() => (typed === null ? initial : chunk(typed, COLS, ROWS)), [typed, initial]);
  const narrow = useMemo(() => (typed === null ? wrapWords(initial, NCOLS, NROWS) : chunk(typed, NCOLS, NROWS)), [typed, initial]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") {
      setTyped(null);
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      setTyped((t) => (t ?? "").slice(0, -1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      setTyped((t) => {
        const cur = t ?? "";
        const pad = COLS - (cur.length % COLS || COLS);
        return (cur + " ".repeat(pad === COLS ? 0 : pad)).slice(0, COLS * ROWS);
      });
      return;
    }
    if (e.key.length !== 1) return;
    const ch = e.key.toUpperCase();
    if (!CHARSET.includes(ch)) return;
    e.preventDefault();
    setTyped((t) => ((t ?? "") + ch).slice(0, COLS * ROWS));
  };

  return (
    <footer ref={ref} className={s.footer}>
      <div className={s.housing}>
        <div
          className={s.board}
          tabIndex={0}
          role="textbox"
          aria-label="Message board. Type to change it; Escape restores it."
          aria-multiline="true"
          onKeyDown={onKey}
          onBlur={() => undefined}
        >
          <div className={s.wide}>
            {rows.map((r, i) => (
              <FlapText key={i} value={r} length={COLS} decorative introOnView={4} opts={{ stagger: 18, maxSteps: 10 }} />
            ))}
          </div>
          <div className={s.narrow}>
            {narrow.map((r, i) => (
              <FlapText key={i} value={r} length={NCOLS} decorative introOnView={4} opts={{ stagger: 18, maxSteps: 10 }} />
            ))}
          </div>
        </div>
        <p className={s.hint}>{typed === null ? "Click the board and type. Escape puts it back." : "Typing on the board. Escape puts it back."}</p>
      </div>

      <div className={s.cols}>
        <div className={s.brand}>
          <span className={s.word}>Spool</span>
          <p>Read-only toward GitHub. Your token stays in this browser.</p>
        </div>
        <nav aria-label="Footer" className={s.links}>
          <Link href="/board">Your board</Link>
          <Link href="/board/repos">Repos</Link>
          <Link href="/board/discover">Discover</Link>
          <Link href="/board/programs">Programs</Link>
          <Link href="/board/settings">Settings</Link>
        </nav>
        <div className={s.toggles}>
          <button type="button" aria-pressed={!prefs.motion} onClick={() => setPrefs({ motion: !prefs.motion })}>
            <span className={s.switch} aria-hidden="true" />
            Reduce motion
          </button>
          <button type="button" aria-pressed={prefs.sound} onClick={() => setPrefs({ sound: !prefs.sound })}>
            <span className={s.switch} aria-hidden="true" />
            Flap sound
          </button>
        </div>
      </div>
      <p className={s.legal}>
        GSoC, Y Combinator, Product Hunt and Hacktoberfest data belong to their sources and are linked where shown. Spool isn&rsquo;t
        affiliated with any of them, or with GitHub.
      </p>
    </footer>
  );
}
