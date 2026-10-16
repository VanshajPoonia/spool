"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Strip } from "@/components/kit/Strip";
import { PrintText } from "@/components/print/PrintText";
import { assignCodes } from "@/lib/carriers";
import { FACES } from "@/lib/faces";
import { compactStars } from "@/lib/format";
import type { Discovery } from "@/lib/programs";
import { fmtDate } from "@/lib/time";
import { LiveTag } from "./LiveTag";
import { useSectionFace } from "./mood";
import { SectionHead } from "./SectionHead";
import sec from "./section.module.css";
import s from "./inbound.module.css";

const SHOWN = 6;
const MAX_TOPICS = 3;
const TOPICS = ["typescript", "rust", "python", "go", "cli", "ai", "devtools", "database", "react", "wasm"];

export function Inbound({ initial }: { initial: Discovery }) {
  const ref = useRef<HTMLElement>(null);
  const [topics, setTopics] = useState<string[]>(initial.topics);
  const topicsKey = [...topics].sort().join(",");
  const [res, setRes] = useState<{ key: string; data: Discovery; error: string | null }>({
    key: [...initial.topics].sort().join(","),
    data: initial,
    error: initial.live ? null : "GitHub search didn't answer this server just now. Pick a topic to retry.",
  });

  useEffect(() => {
    if (res.key === topicsKey) return;
    const ctrl = new AbortController();
    fetch(`/api/discover?topics=${encodeURIComponent(topicsKey)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Discovery) =>
        setRes({ key: topicsKey, data: d, error: d.live ? null : "GitHub search is rate-limiting this server right now. Showing nothing rather than guessing." }),
      )
      .catch((e) => {
        if (e.name !== "AbortError") setRes((prev) => ({ ...prev, key: topicsKey, error: "Couldn't reach GitHub search. Try another topic in a moment." }));
      });
    return () => ctrl.abort();
  }, [topicsKey, res.key]);

  const loading = res.key !== topicsKey;
  const data = res.data;
  const codes = useMemo(() => assignCodes(data.repos.map((r) => r.full)), [data.repos]);
  const error = loading ? null : res.error;
  const full = topics.length >= MAX_TOPICS;

  useSectionFace(ref, loading ? FACES.focus : error ? FACES.sad : FACES.stars);

  const toggle = (t: string) =>
    setTopics((cur) => (cur.includes(t) ? (cur.length > 1 ? cur.filter((x) => x !== t) : cur) : cur.length < MAX_TOPICS ? [...cur, t] : cur));

  return (
    <section ref={ref} id="inbound" className={sec.section} aria-labelledby="inbound-title">
      <SectionHead id="inbound-title" title="Fresh repos in the topics you follow.">
        Spool searches GitHub for repos created in the last five months in your topics and ranks them by stars, so you find
        projects while they&rsquo;re still small. These strips are live: pick up to three topics and it searches again.
      </SectionHead>

      <div className={s.picker}>
        <p className={s.pickerHead} id="inbound-topics">
          Your topics
          <span className={s.pickerCount}>
            {topics.length} of {MAX_TOPICS} picked
            {full && <span>. Remove one to swap it</span>}
          </span>
        </p>
        <div className={s.topics} role="group" aria-labelledby="inbound-topics">
          {TOPICS.map((t) => {
            const on = topics.includes(t);
            const locked = on && topics.length === 1;
            const blocked = !on && full;
            return (
              <button
                key={t}
                type="button"
                className={s.topic}
                aria-pressed={on}
                aria-disabled={locked || blocked || undefined}
                title={locked ? "Keep at least one topic" : blocked ? "Three topics picked. Remove one first." : undefined}
                onClick={() => toggle(t)}
              >
                {on ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : <Plus size={15} strokeWidth={2.5} aria-hidden="true" />}
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${sec.panel} ${s.results}`} data-shine aria-busy={loading}>
        <div className={s.resultsHead}>
          <p className={s.caption} aria-live="polite">
            {loading ? (
              <span className="shimmer">Searching GitHub…</span>
            ) : (
              `${Math.min(SHOWN, data.repos.length)} newest repos with the most stars in ${topics.join(", ")}`
            )}
          </p>
          <LiveTag>Live from GitHub search</LiveTag>
        </div>
        {error && <p className={s.error}>{error}</p>}

        {/* keyed by the search so a new result set deals in fresh */}
        <ol className={s.grid} key={res.key} data-loading={loading || undefined}>
          {data.repos.slice(0, SHOWN).map((r, i) => {
            const [owner, name] = r.full.split("/");
            const stars = compactStars(r.stars);
            return (
              <li key={r.full} style={{ "--i": i } as CSSProperties}>
                <Strip
                  size="lg"
                  kind="plain"
                  callsign={codes.get(r.full) ?? ""}
                  title={
                    <>
                      <span className={s.owner}>{owner}/</span>
                      {name}
                    </>
                  }
                  note={r.description || "No description."}
                  who={r.language ?? "No language"}
                  age={`Created ${fmtDate(r.created)}`}
                  extra={
                    <span className={s.stars}>
                      <PrintText value={stars} length={stars.length} introOnView introDelay={i * 80} label={`${r.stars} stars`} />
                      <span>stars</span>
                    </span>
                  }
                  href={r.url}
                  external
                  label={`${r.full}, ${r.stars} stars. Opens on GitHub.`}
                />
              </li>
            );
          })}
          {!data.repos.length && !loading && <li className={s.empty}>No repos matched. Try a broader topic.</li>}
        </ol>
      </div>
    </section>
  );
}
