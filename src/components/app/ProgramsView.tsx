"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PrintText } from "@/components/print/PrintText";
import { fetchOctober } from "@/lib/github";
import { daysUntil, gsocNext, gsocPhase, gsocStations, hacktoberfest, parseMonthDay } from "@/lib/program-dates";
import { matchOrg, tagMatches, words } from "@/lib/interests";
import type { Programs } from "@/lib/programs";
import { useAuth, useSettings } from "@/lib/store";
import { fmtDate } from "@/lib/time";
import { useBoard } from "./BoardProvider";
import p from "./page.module.css";
import s from "./programs.module.css";

type Oct = { total: number; merged: number; open: number; closed: number; items: { id: string; title: string; url: string; repo: string; state: string }[] };

/* SYNTHETIC: shown only on the sample board. */
const SAMPLE_OCT: Oct = {
  total: 4,
  merged: 2,
  open: 1,
  closed: 1,
  items: [
    { id: "o1", title: "Stream rows from cursor in batches", url: "#", repo: "quarry-db/quarry", state: "MERGED" },
    { id: "o2", title: "Add retry jitter to webhook sender", url: "#", repo: "harbor-sh/harbor", state: "MERGED" },
    { id: "o3", title: "Push LIMIT down through views", url: "#", repo: "quarry-db/quarry", state: "OPEN" },
    { id: "o4", title: "CSS-only Tooltip", url: "#", repo: "lattice/lattice-ui", state: "CLOSED" },
  ],
};

const DEV_WORDS = /\b(open[- ]source|github|developer|devtool|api|sdk|cli|terminal|code|coding|agent|database|self-host|framework|library)\b/i;

function Countdown({ label, days, sub, href }: { label: string; days: number | null; sub: string; href?: string }) {
  return (
    <div className={s.cd}>
      <span className={s.cdLabel}>{label}</span>
      <div className={s.cdRow}>
        <PrintText value={days === null ? "--" : String(Math.max(0, days))} length={3} align="right" style={{ fontSize: "29px" }} intro label={days === null ? "" : `${days} days`} />
        <span className={s.cdUnit}>DAYS</span>
      </div>
      <span className={s.cdSub}>
        {sub}
        {href && (
          <a href={href} target="_blank" rel="noreferrer" aria-label={`${label} site`}>
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        )}
      </span>
    </div>
  );
}

export function ProgramsView({ data }: { data: Programs }) {
  const { mode, now, login } = useBoard();
  const auth = useAuth();
  const { interests } = useSettings();
  const [onlyRelevant, setOnlyRelevant] = useState(true);
  const [liveOct, setLiveOct] = useState<Oct | null>(null);
  const octYear = now ? (new Date(now).getMonth() >= 9 ? new Date(now).getFullYear() : new Date(now).getFullYear() - 1) : null;
  const [octErr, setOctErr] = useState<string | null>(null);

  const g = data.gsoc;
  const yc = data.yc;
  const hf = now ? hacktoberfest(now) : null;
  const next = g && now ? gsocNext(g, now) : null;
  const ycDeadline = yc && now ? parseMonthDay(yc.deadline, now, yc.afterDeadline) : null;

  useEffect(() => {
    if (!now) return;
    const year = octYear!;
    if (mode !== "live" || !auth || !login) return;
    fetchOctober(auth.token, login, year)
      .then((r) => {
        const items = r.nodes.filter((n) => n?.id).map((n) => ({ id: n.id, title: n.title, url: n.url, repo: n.repository.nameWithOwner, state: n.state }));
        setLiveOct({
          total: r.issueCount,
          merged: items.filter((i) => i.state === "MERGED").length,
          open: items.filter((i) => i.state === "OPEN").length,
          closed: items.filter((i) => i.state === "CLOSED").length,
          items,
        });
      })
      .catch((e) => setOctErr(e instanceof Error ? e.message : "Couldn't load your October PRs."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, auth?.token, login, !!now]);

  const oct = mode === "sample" ? SAMPLE_OCT : liveOct;

  const orgs = useMemo(() => {
    if (!g) return [];
    return g.orgs
      .map((o) => ({ o, m: matchOrg(o, interests) }))
      .filter(({ m }) => m.length > 0)
      .sort((a, b) => b.m.length - a.m.length || a.o.name.localeCompare(b.o.name));
  }, [g, interests]);

  const launches = useMemo(() => {
    const ls = [...data.launches].sort((a, b) => b.published.localeCompare(a.published));
    if (!onlyRelevant) return ls;
    return ls.filter((l) => {
      const text = `${l.title} ${l.tagline}`;
      const w = words(text);
      return DEV_WORDS.test(text) || interests.some((i) => w.includes(i));
    });
  }, [data.launches, onlyRelevant, interests]);

  return (
    <div className={p.page}>
      <div className={p.head}>
        <div>
          <h1 className={p.h1}>Programs</h1>
          <p className={p.lede}>
            Live from the GSoC program API, Y Combinator&rsquo;s apply page and Product Hunt&rsquo;s feed. Fetched {fmtDate(data.fetchedAt)} at{" "}
            {data.fetchedAt.slice(11, 16)} UTC; refreshed every few hours.
          </p>
        </div>
      </div>

      <div className={s.cds}>
        <Countdown
          label={yc ? `YC ${yc.batch}` : "Y Combinator"}
          days={ycDeadline && now ? daysUntil(ycDeadline.toISOString(), now) : null}
          sub={yc ? `${yc.afterDeadline ? "Late apps after" : "Apply by"} ${yc.deadline} · decisions ${yc.decisions}` : "Apply page unavailable"}
          href={yc?.applyUrl}
        />
        <Countdown
          label={g ? `GSoC ${g.year}: ${next?.label ?? "ended"}` : "GSoC"}
          days={next && now ? daysUntil(next.date, now) : null}
          sub={next ? `on ${fmtDate(next.date, true)}` : g ? `${Number(g.year) + 1} not announced yet` : "API unavailable"}
          href="https://summerofcode.withgoogle.com"
        />
        <Countdown
          label={`Hacktoberfest ${hf?.year ?? ""}`}
          days={hf?.days ?? null}
          sub={hf?.live ? "left, ends Oct 31" : "until it starts Oct 1"}
          href="https://hacktoberfest.com"
        />
      </div>

      <div className={p.grid2}>
        <section className={p.panel}>
          <div className={p.panelHead}>
            <div>
              <h2>Google Summer of Code {g?.year}</h2>
              <p>{g ? `${g.orgCount} organisations · phase: ${gsocPhase(g.phase).toLowerCase()}` : "The program API didn't answer."}</p>
            </div>
            <a className={p.btn} href="https://summerofcode.withgoogle.com/programs" target="_blank" rel="noreferrer">
              Program site <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
          {g && (
            <>
              <ol className={s.stations}>
                {gsocStations(g).map((st) => {
                  const passed = now ? Date.parse(st.date) <= now : false;
                  return (
                    <li key={st.name} data-passed={passed || undefined} data-next={next?.name === st.name || undefined}>
                      <span className={s.dot} aria-hidden="true" />
                      <span>{st.short}</span>
                      <span className={s.stDate}>{fmtDate(st.date, true)}</span>
                    </li>
                  );
                })}
              </ol>
              <div className={s.orgHead}>
                <h3>Best matches for your interests</h3>
                <Link href="/board/programs/gsoc" className={p.btn}>
                  Browse all {g.orgCount} organisations <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
              {orgs.length === 0 ? (
                <p className={p.empty}>No organisation lists your interests ({interests.join(", ") || "none set"}). Browse all of them instead.</p>
              ) : (
                <ul className={s.orgs}>
                  {orgs.slice(0, 6).map(({ o, m }) => (
                    <li key={o.slug}>
                      <div className={p.itemMain}>
                        <a href={o.url} target="_blank" rel="noreferrer" className={p.itemTitle}>
                          {o.name}
                        </a>
                        <span className={p.itemSub}>{o.tagline}</span>
                        <span className={s.tech}>
                          {o.tech.slice(0, 6).map((t) => (
                            <span key={t} data-m={m.some((x) => tagMatches(t, x)) || undefined}>
                              {t}
                            </span>
                          ))}
                        </span>
                      </div>
                      {o.ideas && (
                        <a href={o.ideas} target="_blank" rel="noreferrer" className={s.ideas}>
                          Ideas
                        </a>
                      )}
                    </li>
                  ))}
                  {orgs.length > 6 && (
                    <li className={p.muted}>
                      <Link href="/board/programs/gsoc">{orgs.length - 6} more match. See them with filters, links and years in GSoC.</Link>
                    </li>
                  )}
                </ul>
              )}
            </>
          )}
        </section>

        <div className={s.col}>
          <section className={p.panel}>
            <div className={p.panelHead}>
              <div>
                <h2>Your October{octYear ? ` ${octYear}` : ""}</h2>
                <p>PRs you opened that month{mode === "sample" ? " (sample data)" : ""}. Spool counts them; what qualifies is up to Hacktoberfest&rsquo;s rules.</p>
              </div>
            </div>
            {octErr && <p className={p.error}>{octErr}</p>}
            {mode === "guest" ? (
              <p className={p.empty}>
                Counting your own PRs needs GitHub. <Link href="/board/settings">Connect a read-only token</Link> and they show up here.
              </p>
            ) : (
              !oct && !octErr && <div className={p.loading}><PrintText value="COUNTING" length={8} style={{ fontSize: "17px" }} intro decorative /></div>
            )}
            {oct && (
              <>
                <div className={s.octCounts}>
                  {(
                    [
                      ["Opened", oct.total, undefined],
                      ["Merged", oct.merged, "go"],
                      ["Open", oct.open, undefined],
                      ["Closed", oct.closed, "stop"],
                    ] as [string, number, "go" | "stop" | undefined][]
                  ).map(([l, n, tone]) => (
                    <div key={l}>
                      <span>{l}</span>
                      <PrintText value={String(n)} length={2} align="right" style={{ fontSize: "22px" }} tone={tone} intro />
                    </div>
                  ))}
                </div>
                <ul className={p.list}>
                  {oct.items.slice(0, 12).map((i) => (
                    <li key={i.id} className={s.octItem} data-state={i.state}>
                      <a href={i.url} target="_blank" rel="noreferrer" className={p.itemTitle}>
                        {i.title}
                      </a>
                      <span className={p.mono}>{i.repo}</span>
                      <span className={s.octState}>{i.state.toLowerCase()}</span>
                    </li>
                  ))}
                  {oct.items.length === 0 && <li className={p.empty}>No PRs opened this October yet.</li>}
                </ul>
              </>
            )}
          </section>

          <section className={p.panel}>
            <div className={p.panelHead}>
              <div>
                <h2>Recent on Product Hunt</h2>
                <p>{onlyRelevant ? "Developer launches and your interests" : "Everything in the feed"}</p>
              </div>
              <button type="button" className={p.btn} aria-pressed={onlyRelevant} onClick={() => setOnlyRelevant((v) => !v)}>
                {onlyRelevant ? "Show all" : "Only relevant"}
              </button>
            </div>
            {launches.length === 0 ? (
              <p className={p.empty}>{data.launches.length ? "Nothing in the feed matches right now." : "The feed didn't answer."}</p>
            ) : (
              <ul className={p.list}>
                {launches.slice(0, 12).map((l) => (
                  <li key={l.url} className={s.launch}>
                    <div className={p.itemMain}>
                      <a href={l.url} target="_blank" rel="noreferrer" className={p.itemTitle}>
                        {l.title}
                      </a>
                      <span className={p.itemSub}>{l.tagline}</span>
                    </div>
                    <span className={p.mono}>{fmtDate(l.published)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
