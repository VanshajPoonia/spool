"use client";

import { CSSProperties, ReactNode, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { FlapText } from "@/components/flap/Flap";
import { Lamp, Pictogram, type LampState } from "@/components/kit/Kit";
import { FACES } from "@/lib/faces";
import type { Programs } from "@/lib/programs";
import { fmtDate, useNow } from "@/lib/time";
import { daysUntil, gsocNext, gsocPhase, gsocStations, hacktoberfest, parseMonthDay } from "@/lib/program-dates";
import { useSectionFace } from "./mood";
import { SectionHead } from "./SectionHead";
import sec from "./section.module.css";
import s from "./programs.module.css";

type Ticket = {
  id: string;
  program: string;
  href: string;
  hrefLabel: string;
  event: string;
  days: number | null;
  date: string;
  detail: ReactNode;
};

function lampFor(days: number | null): LampState {
  if (days === null) return "idle";
  if (days <= 7) return "stop";
  if (days <= 30) return "wait";
  return "go";
}

/* Days left in big flaps. Keyed by width so "--" turning into "120" never leaves blank tiles behind. */
function Days({ days }: { days: number | null }) {
  const v = days === null ? "--" : String(Math.max(0, days));
  return (
    <span className={s.days}>
      <FlapText key={v.length} value={v} length={v.length} introOnView={5} label={days === null ? "" : `${v} days`} opts={{ maxSteps: 8 }} />
      <span className={s.daysUnit}>{days === 1 ? "day" : "days"}</span>
    </span>
  );
}

function TicketCard({ t, first }: { t: Ticket; first: boolean }) {
  return (
    <article className={s.ticket} data-first={first || undefined}>
      <header className={s.ticketPlate}>
        <h3>{t.program}</h3>
        <a href={t.href} target="_blank" rel="noreferrer" className={s.plateLink}>
          {t.hrefLabel}
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </header>
      <div className={s.ticketBody}>
        <p className={s.event}>
          <Lamp state={lampFor(t.days)} />
          {t.event}
          {first && <span className={s.soonest}>Soonest</span>}
        </p>
        <Days days={t.days} />
        <p className={s.date}>{t.date}</p>
      </div>
      <p className={s.stub}>{t.detail}</p>
    </article>
  );
}

export function ProgramsWall({ data }: { data: Programs }) {
  const ref = useRef<HTMLElement>(null);
  const now = useNow();
  useSectionFace(ref, FACES.stars);

  const g = data.gsoc;
  const next = g && now ? gsocNext(g, now) : null;
  const stations = g ? gsocStations(g) : [];
  // Stations sit evenly along the line; "you are here" interpolates between the two it falls between.
  const here = (() => {
    if (!now || stations.length < 2) return null;
    const t = stations.map((st) => Date.parse(st.date));
    if (now <= t[0]) return 0;
    if (now >= t[t.length - 1]) return 1;
    const i = t.findIndex((x, k) => now >= x && now < t[k + 1]);
    return (i + (now - t[i]) / (t[i + 1] - t[i])) / (t.length - 1);
  })();

  const tech = g
    ? Object.entries(
        g.orgs.flatMap((o) => o.tech.map((t) => t.toLowerCase())).reduce<Record<string, number>>((acc, t) => {
          acc[t] = (acc[t] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    : [];

  const yc = data.yc;
  const ycDeadline = yc && now ? parseMonthDay(yc.deadline, now, yc.afterDeadline) : null;
  const hf = now ? hacktoberfest(now) : null;
  const launches = [...data.launches].sort((a, b) => b.published.localeCompare(a.published)).slice(0, 6);

  const tickets: Ticket[] = [];
  if (yc) {
    tickets.push({
      id: "yc",
      program: `Y Combinator`,
      href: yc.applyUrl,
      hrefLabel: "Apply",
      event: yc.afterDeadline ? "Late applications" : "Applications close",
      days: yc.afterDeadline || !ycDeadline || !now ? null : daysUntil(ycDeadline.toISOString(), now),
      date: yc.afterDeadline ? `Closed ${yc.deadline}` : yc.deadline,
      detail: (
        <>
          {yc.batch} batch. Decisions by <strong>{yc.decisions}</strong>
          {yc.afterDeadline ? ". Late applications are still read." : "."}
        </>
      ),
    });
  }
  tickets.push({
    id: "hf",
    program: `Hacktoberfest ${hf?.year ?? ""}`.trim(),
    href: "https://hacktoberfest.com",
    hrefLabel: "Site",
    event: hf?.live ? "Hacktoberfest ends" : "Hacktoberfest starts",
    days: hf ? hf.days : null,
    date: hf?.live ? "October 31" : "October 1",
    detail: "Spool counts the PRs you open in October and which ones merge.",
  });
  if (g) {
    tickets.push({
      id: "gsoc",
      program: `GSoC ${g.year}`,
      href: "https://summerofcode.withgoogle.com/programs",
      hrefLabel: "Program site",
      event: next ? next.label : "Next milestone",
      days: next && now ? daysUntil(next.date, now) : null,
      date: next ? fmtDate(next.date, true) : now ? `${Number(g.year) + 1} not announced yet` : "",
      detail: (
        <>
          Phase: <strong>{gsocPhase(g.phase).toLowerCase().replace(/^\w/, (m) => m.toUpperCase())}</strong>. The full
          timeline is below.
        </>
      ),
    });
  }
  // Soonest first, like a departures board; unknown dates go last.
  const ordered = now ? [...tickets].sort((a, b) => (a.days ?? 1e9) - (b.days ?? 1e9)) : tickets;

  return (
    <section ref={ref} id="programs" className={s.wall} aria-labelledby="programs-title">
      <div className={s.inner}>
        <SectionHead id="programs-title" title="Deadlines and launches, on one wall." pict="clock" className={s.head}>
          The dates open source people plan around: Y Combinator&rsquo;s application deadline, Hacktoberfest and each
          Google Summer of Code milestone, counted down from today, plus what just launched on Product Hunt. All of it is
          live and refreshed every few hours.
        </SectionHead>

        <div className={`${s.tickets} ${sec.rise}`}>
          {ordered.map((t, i) => (
            <TicketCard key={t.id} t={t} first={!!now && i === 0 && t.days !== null} />
          ))}
        </div>

        {g ? (
          <article className={`${s.module} ${s.gsoc} ${sec.rise}`}>
            <header className={s.plate}>
              <h3>Google Summer of Code {g.year}</h3>
              <a href="https://summerofcode.withgoogle.com/programs" target="_blank" rel="noreferrer" className={s.plateLink}>
                Program site
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </header>
            <div className={s.body}>
              <div className={s.route} style={{ "--here": here ?? 0 } as CSSProperties}>
                <div className={s.track} aria-hidden="true">
                  <span className={s.trackDone} />
                  {here !== null && <span className={s.here} />}
                </div>
                <ol className={s.stations}>
                  {stations.map((st, i) => {
                    const pos = i / Math.max(1, stations.length - 1);
                    const passed = now ? Date.parse(st.date) <= now : false;
                    return (
                      <li key={st.name} style={{ "--pos": pos } as CSSProperties} data-passed={passed || undefined} data-next={next?.name === st.name || undefined}>
                        <span className={s.dot} aria-hidden="true" />
                        <span className={s.stName}>{st.short}</span>
                        <span className={s.stDate}>{fmtDate(st.date)}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className={s.orgs}>
                <p className={s.orgCount}>
                  <FlapText value={String(g.orgCount)} length={String(g.orgCount).length} introOnView={6} label={`${g.orgCount}`} />
                  <span>organisations this year. The most common tech among them:</span>
                </p>
                <ul className={s.tags} aria-label="Most common tech among this year's organisations">
                  {tech.map(([t, n]) => (
                    <li key={t}>
                      {t} <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ) : (
          <article className={`${s.module} ${s.gsoc}`}>
            <header className={s.plate}>
              <h3>Google Summer of Code</h3>
            </header>
            <p className={`${s.body} ${s.down}`}>The GSoC program API didn&rsquo;t answer just now. This fills in on the next refresh.</p>
          </article>
        )}

        <article className={`${s.module} ${s.ph} ${sec.rise}`}>
          <header className={s.plate}>
            <h3>Just launched on Product Hunt</h3>
            <a href="https://www.producthunt.com" target="_blank" rel="noreferrer" className={s.plateLink}>
              Product Hunt
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </header>
          <div className={s.body}>
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
          </div>
        </article>

        <p className={s.fetched}>
          <Pictogram name="clock" className={s.fetchedIcon} />
          Fetched {fmtDate(data.fetchedAt)} at {data.fetchedAt.slice(11, 16)} UTC from the sources linked on each card.
        </p>
      </div>
    </section>
  );
}
