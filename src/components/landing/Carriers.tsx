"use client";

import { CSSProperties, KeyboardEvent, useRef, useState } from "react";
import { FlapText } from "@/components/flap/Flap";
import { CarrierTag, Lamp, type LampState } from "@/components/kit/Kit";
import { carrier } from "@/lib/carriers";
import { FACES } from "@/lib/faces";
import { FLEET } from "@/lib/sample-threads";
import { useSectionFace } from "./mood";
import { SectionHead } from "./SectionHead";
import sec from "./section.module.css";
import s from "./carriers.module.css";

type Bucket = "merged" | "closed" | "open";

const BUCKETS: { key: Bucket; label: string; lamp: LampState; face: string }[] = [
  { key: "merged", label: "Merged", lamp: "go", face: FACES.glad },
  { key: "closed", label: "Closed", lamp: "stop", face: FACES.sad },
  { key: "open", label: "Still open", lamp: "wait", face: FACES.focus },
];

const EMPTY: Record<Bucket, string> = {
  merged: "Nothing merged here yet.",
  closed: "Nothing closed without merging.",
  open: "Nothing waiting. Every PR here has landed or closed.",
};

// Wide enough for the biggest count in the fleet, so no count carries a blank lead tile.
const COUNT_W = String(Math.max(...FLEET.flatMap((f) => [f.merged.length, f.closed.length, f.open.length]))).length;

/* "4.2D" -> "about 4.2 days"; the sample data writes "NONE YET" when nothing has merged. */
function mergeTime(median: string) {
  const m = median.match(/^([\d.]+)D$/);
  return m ? `${m[1]} days` : null;
}

function sinceText(since: string) {
  const [mon, year] = since.split(" ");
  const d = new Date(`${mon} 1, ${year}`);
  return Number.isNaN(d.getTime()) ? since : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function Carriers() {
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
    <section ref={ref} id="carriers" className={sec.section} aria-labelledby="carriers-title">
      <SectionHead id="carriers-title" title="Every repo gets a carrier code." pict="tail">
        Like an airline, each repo you contribute to gets a two-letter code and a coloured stripe. The tag sits on every row
        of your board, so you can tell repos apart without reading. Pick one below to see its record.
      </SectionHead>

      <div className={`${s.layout} ${sec.rise}`}>
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
                id={`carrier-tab-${i}`}
                aria-selected={i === sel}
                aria-controls="carrier-record"
                tabIndex={i === sel ? 0 : -1}
                className={s.tab}
                style={{ "--c1": fc.livery[0], "--c2": fc.livery[1] } as CSSProperties}
                onClick={() => pick(i)}
              >
                <CarrierTag repo={f.repo} />
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

        <div
          className={`${sec.panel} ${s.record}`}
          id="carrier-record"
          role="tabpanel"
          aria-labelledby={`carrier-tab-${sel}`}
          style={{ "--c1": c.livery[0], "--c2": c.livery[1] } as CSSProperties}
        >
          <header className={s.recordHead}>
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
            {/* keyed so the fin taxis in fresh each time the repo changes */}
            <span key={r.repo} className={s.fin} aria-hidden="true">
              <span>{c.code}</span>
            </span>
          </header>

          <div className={s.bar} aria-hidden="true">
            {BUCKETS.map((b) => (
              <span key={b.key} data-kind={b.key} data-dim={bucket !== b.key || undefined} style={{ flexGrow: r[b.key].length || 0.0001 }} />
            ))}
          </div>

          <div className={s.buckets} role="group" aria-label="Filter threads by outcome">
            {BUCKETS.map((b) => (
              <button
                key={b.key}
                type="button"
                className={s.bucket}
                aria-pressed={bucket === b.key}
                onClick={() => {
                  setBucket(b.key);
                  setFace(b.face);
                }}
              >
                <span className={s.bucketLabel}>
                  <Lamp state={b.lamp} />
                  {b.label}
                </span>
                <FlapText value={String(r[b.key].length)} length={COUNT_W} align="right" size="34px" label={String(r[b.key].length)} opts={{ maxSteps: 6 }} />
              </button>
            ))}
          </div>

          <ul className={s.list} key={`${sel}-${bucket}`} aria-label={`${BUCKETS.find((b) => b.key === bucket)!.label} in ${c.name}, ${list.length} of ${total}`}>
            {list.length === 0 ? (
              <li className={s.empty}>{EMPTY[bucket]}</li>
            ) : (
              list.map((t, i) => (
                <li key={t.num} style={{ "--i": i } as CSSProperties}>
                  <span className={s.num}>#{t.num}</span>
                  <span className={s.title}>{t.title}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
