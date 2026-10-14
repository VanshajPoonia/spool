"use client";

import { CSSProperties, KeyboardEvent, useRef, useState } from "react";
import { Callsign, StateMark, type MarkState } from "@/components/kit/Kit";
import { Strip, type StripState } from "@/components/kit/Strip";
import { PrintText } from "@/components/print/PrintText";
import { carrier } from "@/lib/carriers";
import { FACES } from "@/lib/faces";
import { FLEET } from "@/lib/sample-threads";
import { useSectionFace } from "./mood";
import { SectionHead } from "./SectionHead";
import sec from "./section.module.css";
import s from "./callsigns.module.css";

type Bucket = "merged" | "closed" | "open";

const BUCKETS: { key: Bucket; label: string; mark: MarkState; face: string; state: StripState }[] = [
  { key: "merged", label: "Merged", mark: "go", face: FACES.glad, state: "done" },
  { key: "closed", label: "Closed", mark: "stop", face: FACES.sad, state: "idle" },
  { key: "open", label: "Still open", mark: "wait", face: FACES.focus, state: "them" },
];

const EMPTY: Record<Bucket, string> = {
  merged: "Nothing merged here yet.",
  closed: "Nothing closed without merging.",
  open: "Nothing waiting. Every PR here has merged or closed.",
};

// Wide enough for the biggest count in the fleet, so counts never change width.
const COUNT_W = String(Math.max(...FLEET.flatMap((f) => [f.merged.length, f.closed.length, f.open.length]))).length;

/* "4.2D" -> "4.2 days"; the sample data writes "NONE YET" when nothing has merged. */
function mergeTime(median: string) {
  const m = median.match(/^([\d.]+)D$/);
  return m ? `${m[1]} days` : null;
}

function sinceText(since: string) {
  const [mon, year] = since.split(" ");
  const d = new Date(`${mon} 1, ${year}`);
  return Number.isNaN(d.getTime()) ? since : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function Callsigns() {
  const ref = useRef<HTMLElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [sel, setSel] = useState(0);
  const [bucket, setBucket] = useState<Bucket>("merged");
  const [face, setFace] = useState<string>(FACES.calm);
  useSectionFace(ref, face);

  const r = FLEET[sel];
  const c = carrier(r.repo);
  const total = r.merged.length + r.closed.length + r.open.length;
  const list = r[bucket];
  const median = mergeTime(r.median);
  const b = BUCKETS.find((x) => x.key === bucket)!;

  const pick = (i: number) => {
    const f = FLEET[i];
    setSel(i);
    setBucket(f.merged.length ? "merged" : "open");
    setFace(FACES.stars);
  };

  // Arrow keys walk the repo list, as a tablist should.
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = (sel + step + FLEET.length) % FLEET.length;
    pick(i);
    tabs.current[i]?.focus();
  };

  return (
    <section ref={ref} id="callsigns" className={sec.section} aria-labelledby="callsigns-title">
      <SectionHead id="callsigns-title" title="Every repo gets a callsign.">
        Each repo you contribute to gets a short code, unique among your repos and the same everywhere it appears. It&rsquo;s
        printed first on every strip, so you can tell repos apart without reading. Pick one to see its record.
      </SectionHead>

      <div className={s.layout}>
        <div className={s.fleet} role="tablist" aria-label="Your repos" aria-orientation="vertical" onKeyDown={onKey}>
          <p className={s.fleetHead}>
            Your repos <span className={sec.tag}>Sample data</span>
          </p>
          {FLEET.map((f, i) => {
            const fc = carrier(f.repo);
            const n = f.merged.length + f.closed.length + f.open.length;
            return (
              <button
                key={f.repo}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`callsign-tab-${i}`}
                aria-selected={i === sel}
                aria-controls="callsign-record"
                tabIndex={i === sel ? 0 : -1}
                className={s.tab}
                onClick={() => pick(i)}
              >
                <Callsign repo={f.repo} />
                <span className={s.tabName}>
                  <strong>{fc.name}</strong>
                  <span>{fc.owner}</span>
                </span>
                <span className={s.tabCount}>
                  {n} <span>PRs</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className={`${sec.panel} ${s.record}`} id="callsign-record" role="tabpanel" aria-labelledby={`callsign-tab-${sel}`}>
          <header className={s.recordHead}>
            <span className={s.bigCode} aria-hidden="true">
              <PrintText value={c.code} length={2} decorative />
            </span>
            <div className={s.recordTitle}>
              <h3>{r.repo}</h3>
              <p>
                {r.opened} pull requests since {sinceText(r.since)}.{" "}
                {median ? (
                  <>
                    Merges land in about <strong>{median}</strong>.
                  </>
                ) : (
                  "Nothing has merged yet."
                )}
              </p>
            </div>
          </header>

          <div className={s.bar} aria-hidden="true">
            {BUCKETS.map((x) => (
              <span key={x.key} data-kind={x.key} data-dim={bucket !== x.key || undefined} style={{ flexGrow: r[x.key].length || 0.0001 }} />
            ))}
          </div>

          <div className={s.buckets} role="group" aria-label="Filter pull requests by outcome">
            {BUCKETS.map((x) => (
              <button
                key={x.key}
                type="button"
                className={s.bucket}
                aria-pressed={bucket === x.key}
                onClick={() => {
                  setBucket(x.key);
                  setFace(x.face);
                }}
              >
                <span className={s.bucketLabel}>
                  <StateMark state={x.mark} />
                  {x.label}
                </span>
                <span className={s.bucketCount}>
                  <PrintText value={String(r[x.key].length)} length={COUNT_W} align="right" label={String(r[x.key].length)} />
                </span>
              </button>
            ))}
          </div>

          <ul className={s.list} key={`${sel}-${bucket}`} aria-label={`${b.label} in ${c.name}, ${list.length} of ${total}`}>
            {list.length === 0 ? (
              <li className={s.empty}>{EMPTY[bucket]}</li>
            ) : (
              list.map((t, i) => (
                <li key={t.num} style={{ "--i": i } as CSSProperties}>
                  <Strip
                    size="sm"
                    kind="pr"
                    callsign={c.code}
                    num={t.num}
                    title={t.title}
                    state={b.state}
                    struck={bucket === "closed"}
                    sample
                  />
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
