"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PrintText } from "@/components/print/PrintText";
import { fetchOctober, fetchOctoberPublic, parseLogin, type OctoberPr } from "@/lib/github";
import { daysUntil, gsocNext, gsocPhase, gsocStations, hacktoberfest, parseMonthDay } from "@/lib/program-dates";
import { CATALOG } from "@/lib/catalog";
import { matchOrg, tagMatches, words } from "@/lib/interests";
import type { Programs } from "@/lib/programs";
import { updateSettings, useAuth, useSettings } from "@/lib/store";
import { fmtDate } from "@/lib/time";
import { useBoard } from "./BoardProvider";
import p from "./page.module.css";
import s from "./programs.module.css";

type Oct = { total: number; merged: number; open: number; closed: number; items: OctoberPr[] };

const toOct = (total: number, items: OctoberPr[]): Oct => ({
  total,
  merged: items.filter((i) => i.state === "MERGED").length,
  open: items.filter((i) => i.state === "OPEN").length,
  closed: items.filter((i) => i.state === "CLOSED").length,
  items,
});

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
        <PrintText value={days === null ? "--" : String(Math.max(0, days))} length={3} intro label={days === null ? "" : `${days} days`} />
        <span className={s.cdUnit}>{days === 1 ? "day" : "days"}</span>
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
  const { interests, guestLogin } = useSettings();
  const [onlyRelevant, setOnlyRelevant] = useState(true);
  const [liveOct, setLiveOct] = useState<Oct | null>(null);
  const octYear = now ? (new Date(now).getMonth() >= 9 ? new Date(now).getFullYear() : new Date(now).getFullYear() - 1) : null;
  const [octErr, setOctErr] = useState<string | null>(null);
  const [guestOct, setGuestOct] = useState<{ login: string; oct: Oct } | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestErr, setGuestErr] = useState<string | null>(null);
  // The username already counted this visit, so saving it doesn't trigger a second search.
  const asked = useRef<string | null>(null);

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
        setLiveOct(toOct(r.issueCount, items));
      })
      .catch((e) => setOctErr(e instanceof Error ? e.message : "Couldn't load your October PRs."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, auth?.token, login, !!now]);

  const countGuest = useCallback((name: string, year: number) => {
    asked.current = name;
    setGuestBusy(true);
    setGuestErr(null);
    fetchOctoberPublic(name, year)
      .then((r) => {
        setGuestOct({ login: name, oct: toOct(r.total, r.items) });
        updateSettings({ guestLogin: name });
      })
      .catch((e) => {
        setGuestOct((g) => (g?.login === name ? g : null));
        setGuestErr(e instanceof Error ? e.message : "Couldn't reach GitHub.");
      })
      .finally(() => setGuestBusy(false));
  }, []);

  // A guest who counted before gets the same username counted again on arrival.
  useEffect(() => {
    if (mode !== "guest" || !octYear || !guestLogin || asked.current === guestLogin) return;
    const t = window.setTimeout(() => countGuest(guestLogin, octYear), 0);
    return () => window.clearTimeout(t);
  }, [mode, octYear, guestLogin, countGuest]);

  const submitGuest = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseLogin(draft ?? guestLogin);
    if ("error" in parsed) return setGuestErr(parsed.error);
    if (!octYear) return;
    setDraft(parsed.login);
    countGuest(parsed.login, octYear);
  };

  const oct = mode === "sample" ? SAMPLE_OCT : mode === "guest" ? (guestOct?.oct ?? null) : liveOct;

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
                <p>
                  {mode === "guest" ? "Public PRs you opened that month" : "PRs you opened that month"}
                  {mode === "sample" ? " (sample data)" : ""}. Spool counts them; what qualifies is up to Hacktoberfest&rsquo;s rules.
                </p>
              </div>
            </div>
            {octErr && <p className={p.error}>{octErr}</p>}
            {mode === "guest" ? (
              <>
                <form className={p.form} onSubmit={submitGuest} noValidate>
                  <label className={p.field}>
                    <span className="sr-only">GitHub username</span>
                    <input
                      value={draft ?? guestLogin}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        setGuestErr(null);
                      }}
                      placeholder="Your GitHub username"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      aria-invalid={!!guestErr || undefined}
                      aria-describedby={guestErr ? "oct-error" : undefined}
                    />
                  </label>
                  <button type="submit" className={`${p.btn} ${p.btnSign}`} disabled={guestBusy || !(draft ?? guestLogin).trim()}>
                    {guestBusy ? "Counting" : "Count"}
                  </button>
                  {guestErr && (
                    <p id="oct-error" className={p.formError} role="alert">
                      {guestErr}
                    </p>
                  )}
                </form>
                {!oct && !guestBusy && (
                  <p className={p.muted}>
                    One public search, no token. <Link href="/board/settings">Connect GitHub</Link> to count from your own account.
                  </p>
                )}
                {!oct && guestBusy && (
                  <div className={p.loading}>
                    <span className="shimmer">Counting October PRs…</span>
                  </div>
                )}
              </>
            ) : (
              !oct && !octErr && (
                <div className={p.loading}>
                  <span className="shimmer">Counting your October PRs…</span>
                </div>
              )
            )}
            {oct && (
              <>
                <p className={s.octCounts}>
                  {(
                    [
                      ["opened", oct.total, undefined],
                      ["merged", oct.merged, "go"],
                      ["open", oct.open, undefined],
                      ["closed", oct.closed, "stop"],
                    ] as [string, number, "go" | "stop" | undefined][]
                  ).map(([l, n, tone]) => (
                    <span key={l}>
                      <strong data-tone={tone}>{n}</strong> {l}
                    </span>
                  ))}
                </p>
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
                  {oct.items.length === 0 && (
                    <li className={p.empty}>{mode === "guest" ? `No public PRs from ${guestOct?.login} that October.` : "No PRs opened this October yet."}</li>
                  )}
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

      <div className={`${p.grid2} ${s.more}`}>
        <section className={p.panel}>
          <div className={p.panelHead}>
            <div>
              <h2>More programs</h2>
              <p>Each on its own site. Dates show only where the program publishes them in a form Spool can read; otherwise check the site.</p>
            </div>
          </div>
          <ul className={p.list}>
            {CATALOG.map((c) => (
              <li key={c.id} className={s.program}>
                <div className={p.itemMain}>
                  <span className={s.programHead}>
                    <a href={c.url} target="_blank" rel="noreferrer" className={p.itemTitle}>
                      {c.name}
                    </a>
                    <span className={s.pay} data-pay={c.pay === "Unpaid" ? "no" : "yes"}>
                      {c.pay}
                    </span>
                  </span>
                  <span className={s.what}>{c.what}</span>
                  {c.id === "lfx" && data.lfx.length > 0 ? (
                    <ul className={s.terms}>
                      {data.lfx
                        .filter((t) => !now || t.milestones.some((m) => Date.parse(`${m.end ?? m.start}T23:59:00Z`) >= now))
                        .map((t) => (
                          <li key={t.id}>
                            <a href={t.url} target="_blank" rel="noreferrer">
                              {t.label}
                            </a>
                            <span>{t.milestones.map((m) => `${m.label} ${fmtDate(m.start)}${m.end ? ` to ${fmtDate(m.end)}` : ""}`).join(" · ")}</span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <span className={s.check}>
                      Dates: check the site
                      {c.extra && (
                        <>
                          {" · "}
                          <a href={c.extra.url} target="_blank" rel="noreferrer">
                            {c.extra.label}
                          </a>
                        </>
                      )}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={p.panel}>
          <div className={p.panelHead}>
            <div>
              <h2>Program news</h2>
              <p>GSoC and Season of Docs posts from Google&rsquo;s Open Source blog, plus Outreachy, CNCF mentorship and Summer of Bitcoin, from the last six months.</p>
            </div>
          </div>
          {data.news.length === 0 ? (
            <p className={p.empty}>None of the feeds answered, or nothing new in six months.</p>
          ) : (
            <ul className={p.list}>
              {data.news.map((n) => (
                <li key={n.url} className={s.launch}>
                  <div className={p.itemMain}>
                    <a href={n.url} target="_blank" rel="noreferrer" className={p.itemTitle}>
                      {n.title}
                    </a>
                    <span className={p.itemSub}>{n.source}</span>
                  </div>
                  <span className={p.mono}>{fmtDate(n.published)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
