"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { StripLink } from "@/components/kit/Kit";
import { Strip } from "@/components/kit/Strip";
import { PrintText } from "@/components/print/PrintText";
import { assignCodes } from "@/lib/carriers";
import { FACES } from "@/lib/faces";
import { usePrefs } from "@/lib/prefs";
import { daysUntil, gsocPhase, gsocStations } from "@/lib/program-dates";
import type { Gsoc as GsocData } from "@/lib/programs";
import { fmtDate, useNow } from "@/lib/time";
import { useFlip } from "./flip";
import { useSectionFace } from "./mood";
import { SectionHead } from "./SectionHead";
import sec from "./section.module.css";
import s from "./gsoc.module.css";

/*
 * Google Summer of Code, live: the season as one line drawn up to today as you scroll, every
 * stop pickable, your project size placing your evaluations on it, and this year's
 * organisations filtered by the tech you already know.
 */

type Size = "small" | "medium" | "large";

type Stop = {
  key: string;
  short: string;
  label: string;
  start: string;
  end?: string;
  major: boolean;
  text: string;
};

const SAYS: Record<string, string> = {
  prog_announce: "Google announces this year’s program and its timeline.",
  org_application_start: "Open source organisations apply to take part as mentors.",
  org_announce_public: "The accepted organisations go public. Pick a few and start talking to them.",
  contributor_proposals_open: "Contributors can send their project proposals to the organisations.",
  proposal_deadline: "The last moment to submit a proposal.",
  project_announce_public: "Accepted contributor projects are announced.",
  project_work_start: "Coding starts, alongside your mentors.",
  program_end: "The program’s last day.",
};

const SIZES: Size[] = ["small", "medium", "large"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const STEP = 6;

/* Scroll progress of an element through the lower part of the viewport, 0 to 1. */
function progress(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  return Math.min(1, Math.max(0, (vh * 0.92 - r.top) / (vh * 0.58)));
}

/* How far the route has drawn for a given scroll progress; the CSS uses the same curve. */
const drawnAt = (p: number, here: number) => here * Math.min(1, Math.max(0, (p - 0.08) / 0.72));

function DaysBox({ days }: { days: number | null }) {
  const v = days === null ? "--" : String(Math.abs(days));
  const unit = days === null ? "days" : days === 0 ? "today" : days > 0 ? (days === 1 ? "day to go" : "days to go") : days === -1 ? "day ago" : "days ago";
  return (
    <span className={s.days}>
      <PrintText key={v} value={v} length={v.length} intro label={days === null ? "Date not known" : `${v} ${unit}`} />
      <span>{unit}</span>
    </span>
  );
}

export function Gsoc({ data, fetchedAt }: { data: GsocData | null; fetchedAt: string }) {
  const ref = useRef<HTMLElement>(null);
  const routeRef = useRef<HTMLDivElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const rackRef = useRef<HTMLUListElement>(null);
  const now = useNow();
  const { motion } = usePrefs();
  const [reduced, setReduced] = useState(false);
  const still = !motion || reduced;
  const [size, setSize] = useState<Size>("medium");
  const [picked, setPicked] = useState<string | null>(null);
  const [tech, setTech] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(STEP);
  const [reach, setReach] = useState(1);
  useSectionFace(ref, tech || query ? FACES.focus : FACES.glad);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  /* ---------- the season ---------- */

  const majors = useMemo<Stop[]>(
    () =>
      data
        ? gsocStations(data).map((m) => ({ key: m.name, short: m.short, label: m.label, start: m.date, major: true, text: SAYS[m.name] ?? m.label }))
        : [],
    [data],
  );

  const minors = useMemo<Stop[]>(() => {
    if (!data) return [];
    const find = (name: string) => data.milestones.find((m) => m.name === name && m.label.toLowerCase().includes(`(${size} project)`));
    const out: Stop[] = [];
    const mid = [find("midterm_evaluation_start"), find("midterm_evaluation_deadline")];
    if (mid[0]) out.push({ key: "midterm", short: "Midterm", label: `Midterm evaluation, ${size} project`, start: mid[0].date, end: mid[1]?.date, major: false, text: "Your mentors evaluate your work halfway through." });
    const fin = [find("final_submission_start"), find("final_submission_deadline")];
    if (fin[0]) out.push({ key: "final", short: "Final week", label: `Final submission, ${size} project`, start: fin[0].date, end: fin[1]?.date, major: false, text: "You hand in your final work and evaluate your mentors." });
    const done = find("project_completion");
    if (done) out.push({ key: "done", short: "Done", label: `Project completion, ${size} project`, start: done.date, major: false, text: `The last day of a ${size} project.` });
    return out;
  }, [data, size]);

  const t0 = majors.length ? Date.parse(majors[0].start) : 0;
  const t1 = majors.length ? Date.parse(majors[majors.length - 1].start) : 1;
  const xOf = (iso: string) => Math.min(1, Math.max(0, (Date.parse(iso) - t0) / Math.max(1, t1 - t0)));

  // Every stop in date order, for the phone's list and for picking the next one.
  const all = useMemo(() => [...majors, ...minors].sort((a, b) => a.start.localeCompare(b.start)), [majors, minors]);
  const indexOf = (k: string) => all.findIndex((x) => x.key === k) / Math.max(1, all.length - 1);

  const here = now && majors.length ? Math.min(1, Math.max(0, (now - t0) / Math.max(1, t1 - t0))) : null;
  const hereI = (() => {
    if (!now || all.length < 2) return null;
    const t = all.map((x) => Date.parse(x.start));
    if (now <= t[0]) return 0;
    if (now >= t[t.length - 1]) return 1;
    const i = t.findIndex((x, k) => now >= x && now < t[k + 1]);
    return (i + (now - t[i]) / (t[i + 1] - t[i])) / (t.length - 1);
  })();

  const months = useMemo(() => {
    if (!majors.length) return [];
    const out: { x: number; m: string }[] = [];
    const d = new Date(t0);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
    while (d.getTime() < t1) {
      out.push({ x: (d.getTime() - t0) / (t1 - t0), m: MONTHS[d.getUTCMonth()] });
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
    return out;
  }, [majors.length, t0, t1]);

  const xs = useMemo(() => all.map((x) => Math.min(1, Math.max(0, (Date.parse(x.start) - t0) / Math.max(1, t1 - t0)))), [all, t0, t1]);

  const nextKey = now ? all.find((x) => Date.parse(x.end ?? x.start) >= now)?.key : undefined;
  const selKey = picked && all.some((x) => x.key === picked) ? picked : (nextKey ?? all[0]?.key);
  const sel = all.find((x) => x.key === selKey);

  // Scroll draws the line: the CSS reads --p; React only hears about it when another stop is reached.
  useEffect(() => {
    const route = routeRef.current;
    const explore = exploreRef.current;
    if (still || !route || !explore) {
      route?.style.removeProperty("--p");
      explore?.style.removeProperty("--p");
      return;
    }
    let raf = 0;
    let passed = -1;
    const read = () => {
      raf = 0;
      const p = progress(route);
      route.style.setProperty("--p", p.toFixed(4));
      explore.style.setProperty("--p", progress(explore).toFixed(4));
      if (here !== null) {
        // Re-render only when the line passes another stop.
        const d = drawnAt(p, here) + 0.0005;
        const n = xs.filter((x) => x <= d).length;
        if (n !== passed) {
          passed = n;
          setReach(d);
        }
      }
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [still, here, xs]);

  /* ---------- the organisations ---------- */

  const orgs = useMemo(() => [...(data?.orgs ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [data]);
  const codes = useMemo(() => assignCodes(orgs.map((o) => o.name)), [orgs]);
  const top = useMemo(() => {
    const count: Record<string, number> = {};
    for (const o of orgs) for (const t of new Set(o.tech.map((x) => x.toLowerCase()))) count[t] = (count[t] ?? 0) + 1;
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10);
  }, [orgs]);
  const max = top[0]?.[1] ?? 1;

  const q = query.trim().toLowerCase();
  const matches = orgs.filter(
    (o) =>
      (!tech || o.tech.some((t) => t.toLowerCase() === tech)) &&
      (!q || [o.name, o.tagline, ...o.tech, ...o.topics].some((f) => f.toLowerCase().includes(q))),
  );
  const shown = matches.slice(0, limit);
  useFlip(rackRef, `${tech}|${q}|${limit}`);

  const pickTech = (t: string) => {
    setTech((cur) => (cur === t ? null : t));
    setLimit(STEP);
  };

  if (!data) {
    return (
      <section ref={ref} id="gsoc" className={sec.section} aria-labelledby="gsoc-title">
        <SectionHead id="gsoc-title" title="Google Summer of Code, stop by stop.">
          The GSoC program API didn&rsquo;t answer just now. The season and this year&rsquo;s organisations fill in on the next refresh.
        </SectionHead>
      </section>
    );
  }

  const days = sel && now ? daysUntil(sel.start, now) : null;
  const inWindow = sel?.end && now ? Date.parse(sel.start) <= now && now <= Date.parse(sel.end) : false;
  const selDate = sel ? (sel.end ? `${fmtDate(sel.start)} to ${fmtDate(sel.end)}` : fmtDate(sel.start, true)) : "";
  const countText = tech && q ? `organisations list ${tech} and match “${query.trim()}”` : tech ? `organisations list ${tech}` : q ? `organisations match “${query.trim()}”` : "organisations this year";

  const stop = (x: Stop, lane: string) => {
    const past = now ? Date.parse(x.start) <= now : false;
    const reached = past && (still || xOf(x.start) <= reach);
    const xx = xOf(x.start);
    return (
      <li
        key={x.key}
        className={s.stop}
        data-major={x.major || undefined}
        data-minor={!x.major || undefined}
        data-lane={lane}
        data-past={past || undefined}
        data-next={x.key === nextKey || undefined}
        data-sel={x.key === selKey || undefined}
        data-edge={xx < 0.06 ? "start" : xx > 0.94 ? "end" : undefined}
        style={{ "--x": xx, "--x2": x.end ? xOf(x.end) : xx, "--i": indexOf(x.key) } as CSSProperties}
      >
        {!x.major && <span className={s.band} aria-hidden="true" />}
        <button type="button" className={s.stopBtn} onClick={() => setPicked(x.key)} aria-pressed={x.key === selKey} aria-label={`${x.label}, ${x.end ? `${fmtDate(x.start)} to ${fmtDate(x.end)}` : fmtDate(x.start, true)}`}>
          <span className={s.dot} aria-hidden="true" />
          <span className={s.stopName}>{x.short}</span>
          <span className={s.stopDate}>
            {reached ? <PrintText key="on" value={fmtDate(x.start)} intro={!still} decorative /> : <span>{fmtDate(x.start)}</span>}
          </span>
        </button>
      </li>
    );
  };

  return (
    <section ref={ref} id="gsoc" className={sec.section} aria-labelledby="gsoc-title">
      <SectionHead id="gsoc-title" title={`Google Summer of Code ${data.year}, stop by stop.`}>
        The whole season on one line, drawn up to today as you scroll. Pick a stop for its date, set your project size to place
        your evaluations on the line, and filter this year&rsquo;s {data.orgCount} organisations by the tech you already know.
      </SectionHead>

      <div className={`${sec.panel} ${s.season}`}>
        <header className={s.seasonHead}>
          <span className={s.phase}>
            <span className={s.phaseLabel}>Now</span>
            <PrintText value={gsocPhase(data.phase)} length={10} label={`Phase: ${gsocPhase(data.phase).toLowerCase()}`} />
          </span>
          <div className={s.seg} role="group" aria-label="Project size">
            {SIZES.map((z) => (
              <button key={z} type="button" aria-pressed={size === z} onClick={() => setSize(z)}>
                {z[0].toUpperCase() + z.slice(1)}
              </button>
            ))}
          </div>
          <a href="https://summerofcode.withgoogle.com/programs" target="_blank" rel="noreferrer" className={s.siteLink}>
            Program site
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </header>

        <div
          ref={routeRef}
          className={s.route}
          data-still={still || undefined}
          style={{ "--here": here ?? 0, "--here-i": hereI ?? 0 } as CSSProperties}
        >
          <div className={s.months} aria-hidden="true">
            {months.map((m) => (
              <span key={`${m.m}${m.x}`} style={{ "--x": m.x } as CSSProperties}>
                {m.m}
              </span>
            ))}
          </div>
          <div className={s.track} aria-hidden="true">
            <span className={s.trackDone} />
            {here !== null && (
              <span className={s.here}>
                <span className={s.hereTag}>Today</span>
              </span>
            )}
          </div>
          <ol className={s.stops} aria-label={`GSoC ${data.year} timeline`}>
            {all.map((x) => stop(x, x.major ? (majors.indexOf(x) % 2 ? "above" : "below") : "minor"))}
          </ol>
        </div>

        {sel && (
          <div className={s.detail}>
            <Strip
              key={sel.key + size}
              className={s.detailStrip}
              size="lg"
              kind="plain"
              callsign="GS"
              num={data.year}
              title={sel.label}
              note={sel.text}
              who={inWindow ? "Open now" : days !== null && days < 0 ? "Passed" : "Coming up"}
              age={selDate}
              extra={<DaysBox days={inWindow ? 0 : days} />}
              state={days === null ? "idle" : inWindow ? "you" : days < 0 ? "done" : days <= 7 ? "stalled" : days <= 30 ? "you" : "them"}
              label={`${sel.label}: ${selDate}. ${sel.text}`}
            />
          </div>
        )}
      </div>

      <div ref={exploreRef} className={s.explore}>
        <div className={`${sec.panel} ${s.techs}`}>
          <p className={s.count}>
            <PrintText value={String(matches.length)} length={String(data.orgCount).length} introOnView label={`${matches.length}`} />
            <span>{countText}</span>
          </p>
          <ul className={s.bars} aria-label="Most common tech among this year’s organisations">
            {top.map(([t, n], i) => (
              <li key={t} style={{ "--share": n / max, "--i": i } as CSSProperties}>
                <button type="button" className={s.bar} aria-pressed={tech === t} onClick={() => pickTech(t)}>
                  <span className={s.barName}>{t}</span>
                  <span className={s.barTrack} aria-hidden="true">
                    <span className={s.barFill} />
                  </span>
                  <span className={s.barNum}>{n}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className={s.hint}>{tech ? "Pick it again to clear the filter." : "Pick a bar to see who uses it."}</p>
        </div>

        <div className={s.orgs}>
          <label className={s.search}>
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search organisations</span>
            <input
              type="search"
              value={query}
              placeholder={`Search ${data.orgCount} organisations, tech or topics`}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(STEP);
              }}
            />
          </label>
          {shown.length ? (
            <ul ref={rackRef} className={s.rack}>
              {shown.map((o, i) => (
                <li key={o.slug} data-flip={o.slug} style={{ "--n": i % STEP } as CSSProperties}>
                  <Strip
                    kind="plain"
                    callsign={codes.get(o.name) ?? o.name.slice(0, 2).toUpperCase()}
                    title={o.name}
                    note={o.tagline}
                    who={o.tech.slice(0, 3).join(" · ")}
                    href={o.url}
                    external
                    label={`${o.name}: ${o.tagline}. Opens its GSoC page.`}
                    aside={
                      o.ideas ? (
                        <a className={s.ideas} href={o.ideas} target="_blank" rel="noreferrer" aria-label={`${o.name} project ideas`}>
                          Ideas
                          <ArrowUpRight size={13} aria-hidden="true" />
                        </a>
                      ) : undefined
                    }
                    asideOverlay
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.empty}>No organisation {tech ? `using ${tech} ` : ""}matches &ldquo;{query.trim()}&rdquo;. Try a language or a topic.</p>
          )}
          <div className={s.orgActions}>
            {matches.length > limit && (
              <button type="button" className={s.more} onClick={() => setLimit((l) => l + STEP)}>
                Show {Math.min(STEP, matches.length - limit)} more of {matches.length}
              </button>
            )}
            <StripLink href="/board/programs/gsoc" variant="quiet">
              Every org, with past years
            </StripLink>
          </div>
        </div>
      </div>

      <p className={s.fetched}>
        <span className={`${sec.tag} ${sec.tagLive}`}>Live</span>
        From the GSoC program site, fetched {fmtDate(fetchedAt)} at {fetchedAt.slice(11, 16)} UTC.
      </p>
    </section>
  );
}
