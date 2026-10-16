"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { StateMark } from "@/components/kit/Kit";
import { aggregate, fmtDays } from "@/lib/aggregate";
import { carrier } from "@/lib/carriers";
import { statusLabel } from "@/lib/format";
import { ago } from "@/lib/classify";
import { fmtDate } from "@/lib/time";
import { useBoard } from "./BoardProvider";
import p from "./page.module.css";
import s from "./timetable.module.css";

type Bucket = "all" | "merged" | "closed" | "open" | "issues";

export function RepoTimetable() {
  const params = useParams<{ owner: string; name: string }>();
  const full = `${params.owner}/${params.name}`;
  const { history, loadHistory, historyLoading, threads, mode, now, codeFor } = useBoard();
  const [bucket, setBucket] = useState<Bucket>("all");

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const r = useMemo(() => aggregate(history, threads).find((x) => x.repo.toLowerCase() === full.toLowerCase()), [history, threads, full]);
  const c = carrier(full, codeFor(full));

  const list = !r
    ? []
    : bucket === "merged"
      ? r.merged
      : bucket === "closed"
        ? r.closed
        : bucket === "open"
          ? r.open
          : bucket === "issues"
            ? r.issues
            : [...r.items, ...r.issues].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className={p.page}>
      <Link href="/board/repos" className={s.back}>
        <ArrowLeft size={16} aria-hidden="true" /> All repos
      </Link>

      <header className={s.head}>
        <span className={s.code} aria-hidden="true">
          {c.code}
        </span>
        <div className={s.headText}>
          <h1 className={s.title}>
            <span className={s.owner}>{params.owner}/</span>
            {params.name}
          </h1>
          <p>
            {r?.language ? `${r.language} · ` : ""}
            {r?.first ? `You first showed up ${fmtDate(r.first, true)}` : "No history with this repo yet"}
            {" · "}
            <a href={`https://github.com/${full}`} target="_blank" rel="noreferrer">
              Open on GitHub <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </p>
        </div>
      </header>

      {historyLoading && !history ? (
        <div className={p.loading}>
          <span className="shimmer">Reading this repo from GitHub…</span>
        </div>
      ) : !r ? (
        <p className={p.empty}>Spool hasn&rsquo;t seen you in {full}. It appears here once you open a PR or issue there.</p>
      ) : (
        <>
          <div className={s.counts} role="group" aria-label="Filter history">
            {(
              [
                ["all", "Opened", r.opened + r.issues.length, undefined],
                ["merged", "Merged", r.merged.length, "go"],
                ["closed", "Closed", r.closed.length, "stop"],
                ["open", "Open PRs", r.open.length, undefined],
                ["issues", "Issues", r.issues.length, undefined],
              ] as [Bucket, string, number, "go" | "stop" | undefined][]
            ).map(([b, label, n, tone]) => (
              <button key={b} type="button" className={s.count} aria-pressed={bucket === b} onClick={() => setBucket(b)}>
                <span>{label}</span>
                <span className={s.countNum} data-tone={tone}>
                  {n}
                </span>
              </button>
            ))}
            <div className={s.count} data-static="">
              <span>Median to merge</span>
              <span className={s.countNum}>{fmtDays(r.medianDays)}</span>
            </div>
          </div>

          {r.threads.filter((t) => t.next !== "done").length > 0 && (
            <section className={p.panel}>
              <div className={p.panelHead}>
                <h2>Open threads here</h2>
                <p>Live from your board.</p>
              </div>
              <ul className={p.list}>
                {r.threads
                  .filter((t) => t.next !== "done")
                  .map((t) => (
                    <li key={t.id} className={p.item}>
                      <span className={s.numTag}>#{t.num}</span>
                      <div className={p.itemMain}>
                        <a className={p.itemTitle} href={t.url} target="_blank" rel="noreferrer">
                          {t.title}
                        </a>
                        <span className={p.itemSub}>{t.reason}</span>
                      </div>
                      <span className={s.status}>
                        <StateMark state={t.tone ?? "idle"} />
                        {statusLabel(t.status)}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          )}

          <section className={p.panel}>
            <div className={p.panelHead}>
              <h2>Timetable</h2>
              <p>
                {list.length} {bucket === "all" ? "PRs and issues" : bucket === "issues" ? "issues" : `${bucket} PRs`}, newest first
              </p>
            </div>
            {list.length === 0 ? (
              <p className={p.empty}>Nothing here.</p>
            ) : (
              <ol className={s.timetable}>
                {list.map((h) => {
                  const state = h.state === "MERGED" ? "MERGED" : h.state === "CLOSED" ? "CLOSED" : "OPEN";
                  const took = h.mergedAt ? (Date.parse(h.mergedAt) - Date.parse(h.createdAt)) / 86400000 : null;
                  return (
                    <li key={h.id} data-state={state}>
                      <span className={s.date}>{fmtDate(h.createdAt, true)}</span>
                      <span className={s.numTag}>#{h.number}</span>
                      <a href={h.url} target="_blank" rel="noreferrer" className={s.ttTitle}>
                        {h.title}
                      </a>
                      <span className={s.kind}>{h.__typename === "Issue" ? "Issue" : "PR"}</span>
                      <span className={s.state} data-state={state}>
                        {state === "MERGED" ? `Merged in ${fmtDays(took)}` : state === "CLOSED" ? "Closed" : now ? `Open ${ago(h.createdAt, now)}` : "Open"}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
