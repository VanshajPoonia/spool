"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { ArrowUpRight, GitFork, Star } from "lucide-react";
import { PrintText } from "@/components/print/PrintText";
import { Callsign } from "@/components/kit/Kit";
import { aggregate, fmtDays } from "@/lib/aggregate";
import { ago } from "@/lib/classify";
import { useBoard } from "./BoardProvider";
import p from "./page.module.css";
import s from "./repos.module.css";

export function ReposView() {
  const { history, loadHistory, historyLoading, historyError, threads, mode, now, codeFor } = useBoard();

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const stats = useMemo(() => aggregate(history, threads), [history, threads]);
  const contributed = stats.filter((r) => r.opened > 0 || r.threads.length > 0);
  const totals = useMemo(() => {
    const merged = contributed.reduce((n, r) => n + r.merged.length, 0);
    const closed = contributed.reduce((n, r) => n + r.closed.length, 0);
    const open = contributed.reduce((n, r) => n + r.open.length, 0);
    return { merged, closed, open, repos: contributed.length };
  }, [contributed]);

  return (
    <div className={p.page}>
      <div className={p.head}>
        <div>
          <h1 className={p.h1}>Repos</h1>
          <p className={p.lede}>
            Every repo you&rsquo;ve opened a PR or issue in, with what merged and how long it took. Based on your latest{" "}
            {history ? Math.min(100, history.prs.length) : 100} PRs and {history ? Math.min(60, history.issues.length) : 60} issues.
          </p>
        </div>
        <div className={s.totals}>
          <div>
            <span>Repos</span>
            <PrintText value={String(totals.repos)} length={3} align="right" style={{ fontSize: "21px" }} />
          </div>
          <div>
            <span>Merged</span>
            <PrintText value={String(totals.merged)} length={3} align="right" style={{ fontSize: "21px" }} tone="go" />
          </div>
          <div>
            <span>Open</span>
            <PrintText value={String(totals.open)} length={3} align="right" style={{ fontSize: "21px" }} />
          </div>
        </div>
      </div>

      {historyError && (
        <p className={p.error} role="alert">
          {historyError}{" "}
          <button type="button" className={p.btn} onClick={() => loadHistory(true)}>
            Try again
          </button>
        </p>
      )}

      <section className={p.panel}>
        <div className={p.panelHead}>
          <h2>Where you contribute</h2>
          <p>Sorted by latest activity. Pick a repo for its timetable.</p>
        </div>
        {historyLoading && !history ? (
          <div className={p.loading}>
            <PrintText value="LOADING" length={7} style={{ fontSize: "21px" }} intro decorative />
          </div>
        ) : contributed.length === 0 ? (
          <p className={p.empty}>No PRs or issues found yet.</p>
        ) : (
          <div className={s.table} role="table" aria-label="Repos you contribute to">
            <div className={s.labels} role="row">
              <span role="columnheader">Repo</span>
              <span role="columnheader">Opened</span>
              <span role="columnheader">Outcome</span>
              <span role="columnheader">Merge rate</span>
              <span role="columnheader">Median to merge</span>
              <span role="columnheader">Now</span>
              <span role="columnheader">Last activity</span>
            </div>
            {contributed.map((r) => {
              const [owner, name] = r.repo.split("/");
              const total = r.merged.length + r.closed.length + r.open.length;
              return (
                <Link key={r.repo} href={`/board/repos/${owner}/${name}`} className={s.row} role="row">
                  <span className={s.repo} role="cell">
                    <Callsign repo={r.repo} code={codeFor(r.repo)} />
                    <span className={s.repoName}>
                      <strong>{name}</strong>
                      <span>
                        {owner}
                        {r.language ? ` · ${r.language}` : ""}
                      </span>
                    </span>
                  </span>
                  <span role="cell" className={s.num}>
                    {r.opened}
                  </span>
                  <span role="cell" className={s.outcome}>
                    {total > 0 ? (
                      <span className={s.bar} aria-label={`${r.merged.length} merged, ${r.closed.length} closed, ${r.open.length} open`}>
                        <span data-k="m" style={{ flexGrow: r.merged.length }} />
                        <span data-k="c" style={{ flexGrow: r.closed.length }} />
                        <span data-k="o" style={{ flexGrow: r.open.length }} />
                      </span>
                    ) : (
                      <span className={p.muted}>Issues only</span>
                    )}
                    <span className={s.outcomeText}>
                      {r.merged.length}/{r.closed.length}/{r.open.length}
                    </span>
                  </span>
                  <span role="cell" className={s.num}>
                    {r.mergeRate === null ? "—" : `${Math.round(r.mergeRate * 100)}%`}
                  </span>
                  <span role="cell" className={s.num}>
                    {fmtDays(r.medianDays)}
                  </span>
                  <span role="cell" className={s.now}>
                    {r.onYou > 0 && <span data-k="you">{r.onYou} on you</span>}
                    {r.onThem > 0 && <span>{r.onThem} on them</span>}
                    {r.onYou === 0 && r.onThem === 0 && <span className={p.muted}>Quiet</span>}
                  </span>
                  <span role="cell" className={s.last}>
                    {r.last && now ? `${ago(r.last, now)} ago` : "—"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {history && history.own.length > 0 && (
        <section className={p.panel}>
          <div className={p.panelHead}>
            <h2>Your own repos</h2>
            <p>Open PRs here are other people waiting on you; they show up on your board as incoming.</p>
          </div>
          <ul className={s.own}>
            {history.own.map((r) => (
              <li key={r.nameWithOwner}>
                <Callsign repo={r.nameWithOwner} code={codeFor(r.nameWithOwner)} />
                <div className={p.itemMain}>
                  <a href={r.url} target="_blank" rel="noreferrer" className={p.itemTitle}>
                    {r.nameWithOwner.split("/")[1]}
                    <ArrowUpRight size={14} className={s.ext} aria-hidden="true" />
                  </a>
                  <span className={p.itemSub}>{r.description ?? "No description"}</span>
                </div>
                <span className={s.ownStat} title="Stars">
                  <Star size={14} aria-hidden="true" /> {r.stargazerCount}
                </span>
                <span className={s.ownStat} title="Forks">
                  <GitFork size={14} aria-hidden="true" /> {r.forkCount}
                </span>
                <span className={s.ownStat}>{r.issues.totalCount} issues</span>
                <span className={s.ownStat} data-hot={r.pullRequests.totalCount > 0 || undefined}>
                  {r.pullRequests.totalCount} PRs
                </span>
                <span className={s.last}>{now ? `pushed ${ago(r.pushedAt, now)} ago` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
