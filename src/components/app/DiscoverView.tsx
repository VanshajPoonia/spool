"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Eye, MessageSquare, Star } from "lucide-react";
import { PrintText } from "@/components/print/PrintText";
import { Callsign } from "@/components/kit/Kit";
import { compactStars } from "@/lib/format";
import { assignCodes } from "@/lib/carriers";
import { fetchDiscovery, isLanguage, type FirstIssue, type FoundRepoGql } from "@/lib/github";
import type { Discovery, FirstIssues } from "@/lib/programs";
import { sampleFirstIssues, sampleWatched } from "@/lib/sample-board";
import { toggleShortlist, unwatchIssue, useAuth, useMeta, useSettings, watchIssue } from "@/lib/store";
import { watchKey } from "@/lib/watch";
import { fmtDate } from "@/lib/time";
import { useBoard } from "./BoardProvider";
import { Interests } from "./Interests";
import { WatchPanel } from "./WatchPanel";
import p from "./page.module.css";
import s from "./discover.module.css";

type Repo = { full: string; description: string; url: string; stars: number; created: string; language: string | null; matched: string[] };

function fromGql(r: FoundRepoGql & { matched: string[] }): Repo {
  return {
    full: r.nameWithOwner,
    description: r.description ?? "",
    url: r.url,
    stars: r.stargazerCount,
    created: r.createdAt,
    language: r.primaryLanguage?.name ?? null,
    matched: r.matched,
  };
}

export function DiscoverView() {
  const { mode } = useBoard();
  const auth = useAuth();
  const { interests } = useSettings();
  const meta = useMeta();
  const reqKey = `${interests.join(",")}|${mode}|${auth?.token ?? ""}`;
  const [result, setResult] = useState<{ key: string; repos: Repo[]; issues: FirstIssue[]; error: string | null } | null>(null);

  useEffect(() => {
    if (!interests.length || mode === "none") return;
    let alive = true;
    const run = async () => {
      try {
        if (mode === "live" && auth) {
          const d = await fetchDiscovery(auth.token, interests);
          if (alive) setResult({ key: reqKey, repos: d.repos.map(fromGql), issues: d.issues, error: null });
        } else {
          // Without a token, searches go through Spool's server, cached for an hour, so they don't spend your own GitHub allowance.
          const langs = interests.filter(isLanguage);
          const [d, fi] = await Promise.all([
            fetch(`/api/discover?topics=${encodeURIComponent([...interests].slice(0, 4).sort().join(","))}`).then((r) => r.json() as Promise<Discovery>),
            mode === "sample"
              ? null
              : fetch(`/api/first-issues?langs=${encodeURIComponent((langs.length ? langs : ["typescript", "python"]).slice(0, 3).join(","))}`).then(
                  (r) => r.json() as Promise<FirstIssues>,
                ),
          ]);
          if (!alive) return;
          setResult({
            key: reqKey,
            repos: (d.repos ?? []).map((r) => ({ ...r, matched: interests.filter((i) => r.topics.includes(i) || r.language?.toLowerCase() === i) })),
            issues: fi ? (fi.issues ?? []) : sampleFirstIssues(),
            error: d.live === false || fi?.live === false ? "GitHub search is rate-limiting right now; try again in a minute." : null,
          });
        }
      } catch (e) {
        if (alive)
          setResult((prev) => ({ key: reqKey, repos: prev?.repos ?? [], issues: prev?.issues ?? [], error: e instanceof Error ? e.message : "Search failed." }));
      }
    };
    void run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqKey]);

  const loading = interests.length > 0 && result?.key !== reqKey;
  const empty = !interests.length;
  const repos = useMemo<Repo[] | null>(() => (empty ? [] : (result?.repos ?? null)), [empty, result]);
  const issues = useMemo<FirstIssue[] | null>(() => (empty ? [] : (result?.issues ?? null)), [empty, result]);
  const error = result?.key === reqKey ? result.error : null;

  const shortlist = useMemo(() => Object.values(meta.shortlist).sort((a, b) => b.addedAt.localeCompare(a.addedAt)), [meta.shortlist]);
  const codes = useMemo(
    () =>
      assignCodes([
        ...(repos ?? []).map((r) => r.full),
        ...(issues ?? []).map((i) => i.repository.nameWithOwner),
        ...shortlist.map((r) => r.full),
        ...(mode === "sample" ? sampleWatched().map((w) => w.item.repo) : Object.values(meta.watch).map((w) => w.repo)),
      ]),
    [repos, issues, shortlist, mode, meta.watch],
  );

  return (
    <div className={p.page}>
      <div className={p.head}>
        <div>
          <h1 className={p.h1}>Discover</h1>
          <p className={p.lede}>
            Young repos picking up stars in your languages and topics, and good first issues nobody has claimed. Watch an issue you might
            take, and save repos worth a look to your shortlist.
          </p>
        </div>
      </div>

      <WatchPanel codeFor={(r) => codes.get(r)} />

      <section className={p.panel}>
        <div className={p.panelHead}>
          <h2>Your interests</h2>
          <p>Also used to match GSoC orgs and launches on the Programs tab.</p>
        </div>
        <div className={s.interests}>
          <Interests />
        </div>
      </section>

      {error && <p className={p.error}>{error}</p>}

      <div className={p.grid2}>
        <section className={p.panel} aria-busy={loading}>
          <div className={p.panelHead}>
            <div>
              <h2>New routes</h2>
              <p>Created in the last 150 days, by stars</p>
            </div>
            <span className={`${p.tag} ${p.tagLive}`}>Live from GitHub</span>
          </div>
          {!repos ? (
            <div className={p.loading}>
              <span className="shimmer">Searching GitHub…</span>
            </div>
          ) : repos.length === 0 ? (
            <p className={p.empty}>{interests.length ? "No young repos matched. Try a broader topic." : "Add an interest to start."}</p>
          ) : (
            <ul className={p.list} data-loading={loading || undefined}>
              {repos.map((r) => {
                const saved = !!meta.shortlist[r.full];
                return (
                  <li key={r.full} className={s.repo}>
                    <Callsign repo={r.full} code={codes.get(r.full)} />
                    <div className={p.itemMain}>
                      <a href={r.url} target="_blank" rel="noreferrer" className={p.itemTitle}>
                        {r.full}
                      </a>
                      <span className={p.itemSub}>{r.description || "No description."}</span>
                      <span className={s.matched}>
                        {r.language && <span>{r.language}</span>}
                        {r.matched.map((m) => (
                          <span key={m} data-m="">
                            {m}
                          </span>
                        ))}
                        <span>since {fmtDate(r.created)}</span>
                      </span>
                    </div>
                    <span className={s.stars}>
                      <PrintText value={compactStars(r.stars)} length={5} align="right" style={{ fontSize: "14px" }} label={`${r.stars} stars`} />
                    </span>
                    <button type="button" className={p.iconBtn} aria-pressed={saved} onClick={() => toggleShortlist(r.full, r.url)} title={saved ? "Remove from shortlist" : "Add to shortlist"}>
                      <Star size={16} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
                      <span className="sr-only">{saved ? "Remove from shortlist" : "Add to shortlist"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={p.panel}>
          <div className={p.panelHead}>
            <div>
              <h2>Good first issues</h2>
              <p>Unassigned, opened in the last 45 days, in repos with 30+ stars{mode === "guest" ? ". Refreshed hourly for guests" : ""}</p>
            </div>
            {mode === "sample" ? <span className={p.tag}>Sample data</span> : <span className={`${p.tag} ${p.tagLive}`}>Live from GitHub</span>}
          </div>
          {!issues ? (
            <div className={p.loading}>
              <span className="shimmer">Searching GitHub…</span>
            </div>
          ) : issues.length === 0 ? (
            <p className={p.empty}>No unclaimed good first issues in your languages right now.</p>
          ) : (
            <ul className={p.list}>
              {issues.map((i) => (
                <li key={i.id} className={`${p.item} ${s.issue}`}>
                  <Callsign repo={i.repository.nameWithOwner} size="sm" code={codes.get(i.repository.nameWithOwner)} />
                  <div className={p.itemMain}>
                    <a href={i.url} target="_blank" rel="noreferrer" className={p.itemTitle}>
                      {i.title}
                    </a>
                    <span className={p.itemSub}>
                      {i.repository.nameWithOwner}#{i.number} · {i.repository.primaryLanguage?.name ?? "—"} · {compactStars(i.repository.stargazerCount)} stars ·{" "}
                      {fmtDate(i.createdAt)}
                    </span>
                  </div>
                  <span className={s.comments} title="Comments">
                    <MessageSquare size={14} aria-hidden="true" /> {i.comments.totalCount}
                  </span>
                  {mode !== "sample" &&
                    (() => {
                      const key = watchKey(i.repository.nameWithOwner, i.number);
                      const on = !!meta.watch[key];
                      return (
                        <button
                          type="button"
                          className={p.iconBtn}
                          aria-pressed={on}
                          title={on ? "Stop watching" : "Watch this issue"}
                          onClick={() => (on ? unwatchIssue(key) : watchIssue({ repo: i.repository.nameWithOwner, number: i.number, title: i.title, url: i.url }))}
                        >
                          <Eye size={16} aria-hidden="true" />
                          <span className="sr-only">{on ? `Stop watching ${i.title}` : `Watch ${i.title}`}</span>
                        </button>
                      );
                    })()}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className={p.panel}>
        <div className={p.panelHead}>
          <h2>Shortlist</h2>
          <p>Saved in this browser.</p>
        </div>
        {shortlist.length === 0 ? (
          <p className={p.empty}>Star a repo above to keep it here.</p>
        ) : (
          <ul className={s.short}>
            {shortlist.map((r) => (
              <li key={r.full}>
                <Callsign repo={r.full} size="sm" code={codes.get(r.full)} />
                <a href={r.url} target="_blank" rel="noreferrer">
                  {r.full}
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
                <button type="button" className={p.iconBtn} onClick={() => toggleShortlist(r.full, r.url)} aria-label={`Remove ${r.full}`}>
                  <Star size={14} fill="currentColor" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
