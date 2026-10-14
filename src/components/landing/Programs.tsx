"use client";

import { ReactNode, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { Bay, Strip, type StripState } from "@/components/kit/Strip";
import { PrintText } from "@/components/print/PrintText";
import { FACES } from "@/lib/faces";
import type { Programs as ProgramsData } from "@/lib/programs";
import { fmtDate, useNow } from "@/lib/time";
import { daysUntil, gsocNext, gsocPhase, hacktoberfest, parseMonthDay } from "@/lib/program-dates";
import { useSectionFace } from "./mood";
import { SectionHead } from "./SectionHead";
import sec from "./section.module.css";
import s from "./programs.module.css";

type Entry = {
  id: string;
  code: string;
  program: string;
  href: string;
  event: string;
  days: number | null;
  date: string;
  detail: ReactNode;
};

/* The closer the date, the louder the holder's tab. */
function stateFor(days: number | null): StripState {
  if (days === null) return "idle";
  if (days <= 7) return "stalled";
  if (days <= 30) return "you";
  return "them";
}

function DaysBox({ days }: { days: number | null }) {
  const v = days === null ? "--" : String(Math.max(0, days));
  return (
    <span className={s.days}>
      <PrintText key={v.length} value={v} length={v.length} introOnView label={days === null ? "Date not set" : `${v} days`} />
      <span>{days === 1 ? "day" : "days"}</span>
    </span>
  );
}

export function Programs({ data }: { data: ProgramsData }) {
  const ref = useRef<HTMLElement>(null);
  const now = useNow();
  useSectionFace(ref, FACES.stars);

  const g = data.gsoc;
  const next = g && now ? gsocNext(g, now) : null;
  const yc = data.yc;
  const ycDeadline = yc && now ? parseMonthDay(yc.deadline, now, yc.afterDeadline) : null;
  const hf = now ? hacktoberfest(now) : null;
  const launches = [...data.launches].sort((a, b) => b.published.localeCompare(a.published)).slice(0, 5);

  const entries: Entry[] = [];
  if (yc) {
    entries.push({
      id: "yc",
      code: "YC",
      program: "Y Combinator",
      href: yc.applyUrl,
      event: yc.afterDeadline ? `${yc.batch}: late applications` : `${yc.batch}: applications close`,
      days: yc.afterDeadline || !ycDeadline || !now ? null : daysUntil(ycDeadline.toISOString(), now),
      date: yc.afterDeadline ? `Closed ${yc.deadline}` : yc.deadline,
      detail: (
        <>
          Decisions by {yc.decisions}
          {yc.afterDeadline ? ". Late applications are still read." : "."}
        </>
      ),
    });
  }
  entries.push({
    id: "hf",
    code: "HF",
    program: `Hacktoberfest ${hf?.year ?? ""}`.trim(),
    href: "https://hacktoberfest.com",
    event: hf?.live ? `Hacktoberfest ${hf.year} ends` : `Hacktoberfest ${hf?.year ?? ""} starts`.trim(),
    days: hf ? hf.days : null,
    date: hf?.live ? "October 31" : "October 1",
    detail: "Spool counts the PRs you open in October and which ones merge.",
  });
  if (g) {
    entries.push({
      id: "gsoc",
      code: "GS",
      program: `GSoC ${g.year}`,
      href: "https://summerofcode.withgoogle.com/programs",
      event: next ? `GSoC: ${next.label}` : `GSoC ${g.year}: next milestone`,
      days: next && now ? daysUntil(next.date, now) : null,
      date: next ? fmtDate(next.date, true) : now ? `${Number(g.year) + 1} not announced yet` : "",
      detail: <>Phase: {gsocPhase(g.phase).toLowerCase().replace(/^\w/, (m) => m.toUpperCase())}. The whole season is in the next section.</>,
    });
  }
  // Soonest first; unknown dates go last.
  const ordered = now ? [...entries].sort((a, b) => (a.days ?? 1e9) - (b.days ?? 1e9)) : entries;

  return (
    <section ref={ref} id="programs" className={sec.section} aria-labelledby="programs-title">
      <SectionHead id="programs-title" title="Deadlines and launches, on one schedule.">
        The dates open source people plan around: Y Combinator&rsquo;s application deadline, Hacktoberfest and each Google
        Summer of Code milestone, counted down from today, plus what just launched on Product Hunt. All of it is live and
        refreshed every few hours.
      </SectionHead>

      <div className={s.layout}>
        <Bay name="Schedule" which="plain" hint="Soonest first, counted from today" className={s.schedule}>
          <ul className={s.rack}>
            {ordered.map((e) => (
              <li key={e.id}>
                <Strip
                  size="lg"
                  kind="plain"
                  callsign={e.code}
                  title={e.event}
                  note={e.detail}
                  who={e.program}
                  age={e.date}
                  extra={<DaysBox days={e.days} />}
                  state={stateFor(e.days)}
                  href={e.href}
                  external
                  label={`${e.event}, ${e.date}${e.days !== null ? `, in ${e.days} days` : ""}. Opens ${e.program}.`}
                />
              </li>
            ))}
          </ul>
        </Bay>

        <article className={`${sec.panel} ${s.ph}`}>
          <header className={s.moduleHead}>
            <h3>Just launched on Product Hunt</h3>
            <a href="https://www.producthunt.com" target="_blank" rel="noreferrer" className={s.moduleLink}>
              Product Hunt
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </header>
          {launches.length ? (
            <ol className={s.launches}>
              {launches.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noreferrer">
                    <span className={s.lTitle}>{l.title}</span>
                    <span className={s.lTag}>{l.tagline}</span>
                  </a>
                  <span className={s.lDate}>{fmtDate(l.published)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={s.down}>Product Hunt&rsquo;s feed didn&rsquo;t answer just now.</p>
          )}
        </article>
      </div>

      <p className={s.fetched}>
        <span className={`${sec.tag} ${sec.tagLive}`}>Live</span>
        Fetched {fmtDate(data.fetchedAt)} at {data.fetchedAt.slice(11, 16)} UTC from the sources linked on each strip.
      </p>
    </section>
  );
}
