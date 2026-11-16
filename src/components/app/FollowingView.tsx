"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Eye, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { Callsign, StateMark, type MarkState } from "@/components/kit/Kit";
import { ago } from "@/lib/classify";
import { fetchFollowing, resolveFollowTarget } from "@/lib/github";
import {
  byRule,
  DEFAULT_LABELS,
  followId,
  isFree,
  MAX_FOLLOWS,
  mergeBatches,
  parseFollow,
  ruleText,
  sampleFollowing,
  type Follow,
  type FollowIssue,
  type FollowRule,
} from "@/lib/follow";
import { addFollow, followCacheStore, removeFollow, seeFollows, skipIssue, unskipIssue, unwatchIssue, useAuth, useMeta, watchIssue } from "@/lib/store";
import { fmtDate } from "@/lib/time";
import { watchKey } from "@/lib/watch";
import { useBoard } from "./BoardProvider";
import p from "./page.module.css";
import s from "./following.module.css";

const FRESH_FOR = 15 * 60000;
const KIND_WORD = { repo: "Repo", org: "Org", maintainer: "Person" };
const RULES: [FollowRule, string][] = [
  ["labels", "With labels"],
  ["maintainers", "Filed by maintainers"],
  ["all", "Every new issue"],
];

function status(i: FollowIssue): { lamp: MarkState; text: string } {
  if (i.pr) return { lamp: "stop", text: `PR #${i.pr.number}` };
  if (i.claim) return { lamp: "wait", text: `@${i.claim.by} asked` };
  return { lamp: "go", text: "Free" };
}

export function FollowingView() {
  const { mode, login, now, codeFor } = useBoard();
  const auth = useAuth();
  const meta = useMeta();
  const cache = followCacheStore.use();
  const sample = useMemo(() => (mode === "sample" && now ? sampleFollowing(now) : null), [mode, now]);

  const follows: Follow[] = useMemo(
    () => (sample ? sample.follows : Object.values(meta.follows).sort((a, b) => a.addedAt.localeCompare(b.addedAt))),
    [sample, meta.follows],
  );
  const mine = cache.login === login;
  const feed = useMemo(() => (sample ? { at: null, results: sample.feed, failed: [] as string[] } : mine ? cache.feed : null), [sample, mine, cache.feed]);
  const scan = useMemo(() => (sample ? { at: null, results: sample.scan, failed: [] as string[] } : mine ? cache.scan : null), [sample, mine, cache.scan]);

  const [busy, setBusy] = useState<"feed" | "scan" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyFree, setOnlyFree] = useState(true);

  const run = useCallback(
    async (which: "feed" | "scan", list: Follow[], merge = false) => {
      if (mode !== "live" || !auth || !login || !list.length) return;
      setBusy(which);
      setError(null);
      try {
        const r = await fetchFollowing(auth.token, login, list, which === "scan");
        followCacheStore.update((c) => {
          const base = c.login === login && merge ? c[which] : null;
          return { ...(c.login === login ? c : { feed: null, scan: null }), login, [which]: { at: r.at, results: { ...base?.results, ...r.results }, failed: r.failed } };
        });
        if (r.failed.length) setError(`GitHub didn't answer for ${r.failed.length === 1 ? "one follow" : `${r.failed.length} follows`}. Try again in a minute.`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't reach GitHub.");
      } finally {
        setBusy(null);
      }
    },
    [mode, auth, login],
  );

  // On arrival: reuse a check under 15 minutes old, and only ask about follows it hasn't seen.
  const followKey = follows.map((f) => `${f.id}:${f.rule}:${f.labels.join(",")}`).join("|");
  useEffect(() => {
    if (mode !== "live" || !follows.length) return;
    const c = followCacheStore.read();
    const fresh = c.login === login && c.feed && Date.now() - Date.parse(c.feed.at) < FRESH_FOR;
    const missing = follows.filter((f) => !(c.login === login && c.feed?.results[f.id]));
    const t = window.setTimeout(() => {
      if (!fresh) void run("feed", follows);
      else if (missing.length) void run("feed", missing, true);
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, login, followKey]);

  const skipped = meta.skipped;
  const shape = useCallback(
    (f: Follow, list: FollowIssue[]) => byRule(f, list).filter((i) => !skipped[watchKey(i.repo, i.number)]),
    [skipped],
  );

  // New issues across every follow, newest first, with one row per batch filed across many repos.
  const all = useMemo(() => {
    if (!feed) return [];
    const seen = new Set<string>();
    const out: (FollowIssue & { follow: Follow; isNew: boolean })[] = [];
    for (const f of follows) {
      for (const i of mergeBatches(shape(f, feed.results[f.id] ?? []))) {
        if (seen.has(i.id)) continue;
        seen.add(i.id);
        out.push({ ...i, follow: f, isNew: i.createdAt > f.seenAt });
      }
    }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [feed, follows, shape]);
  const shown = onlyFree ? all.filter(isFree) : all;
  const newCount = (f: Follow) => all.filter((i) => i.follow.id === f.id && i.isNew).length;

  const scanned = useMemo(() => {
    if (!scan) return [];
    return follows
      .filter((f) => f.kind !== "maintainer" && scan.results[f.id])
      .map((f) => ({ f, issues: mergeBatches(scan.results[f.id].filter((i) => isFree(i) && !skipped[watchKey(i.repo, i.number)])) }));
  }, [scan, follows, skipped]);

  /* ---------- adding a follow ---------- */

  const [target, setTarget] = useState("");
  const [rule, setRule] = useState<FollowRule>("labels");
  const [labels, setLabels] = useState(DEFAULT_LABELS.join(", "));
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseFollow(target);
    if ("error" in parsed) return setFormError(parsed.error);
    if (meta.follows[followId(parsed.kind, parsed.target)]) return setFormError("You already follow that.");
    if (follows.length >= MAX_FOLLOWS) return setFormError(`Spool keeps ${MAX_FOLLOWS} follows at most, so a check stays inside GitHub's search limits.`);
    const ls = labels
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    if (parsed.kind !== "maintainer" && rule === "labels" && !ls.length) return setFormError("Add at least one label, or pick another rule.");
    if (!auth) return;
    setAdding(true);
    setFormError(null);
    try {
      const found = await resolveFollowTarget(auth.token, parsed.kind, parsed.target);
      if ("error" in found) return setFormError(found.error);
      const id = followId(parsed.kind, found.target);
      if (meta.follows[id]) return setFormError("You already follow that.");
      const at = new Date().toISOString();
      // A new follow starts with what's already there counted as seen; the page's own check fetches it.
      addFollow({ id, kind: parsed.kind, target: found.target, rule: parsed.kind === "maintainer" ? "all" : rule, labels: parsed.kind === "maintainer" ? [] : ls, addedAt: at, seenAt: at });
      setTarget("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't reach GitHub.");
    } finally {
      setAdding(false);
    }
  };

  /* ---------- skipping ---------- */

  const [skipping, setSkipping] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const confirmSkip = (i: FollowIssue) => {
    skipIssue({ repo: i.repo, number: i.number, title: i.title, url: i.url, reason: reason.trim() || "No reason given" });
    setSkipping(null);
    setReason("");
  };

  const row = (i: FollowIssue & { isNew?: boolean; follow?: Follow }) => {
    const st = status(i);
    const key = watchKey(i.repo, i.number);
    const watched = !!meta.watch[key];
    return (
      <li key={i.id} className={s.row} data-new={i.isNew || undefined}>
        <span className={s.lamp} title={st.text}>
          <StateMark state={st.lamp} />
        </span>
        <Callsign repo={i.repo} size="sm" code={codeFor(i.repo)} />
        <div className={p.itemMain}>
          <a href={i.url} target="_blank" rel="noreferrer" className={p.itemTitle}>
            {i.title}
          </a>
          <span className={p.itemSub}>
            {i.repo}#{i.number} · {i.author ? `@${i.author}` : "someone"}
            {i.maintainer ? " (maintainer)" : ""} · {fmtDate(i.createdAt)}
            {i.labels.length ? ` · ${i.labels.slice(0, 3).join(", ")}` : ""}
          </span>
          {skipping === i.id && (
            <form
              className={s.skip}
              onSubmit={(e) => {
                e.preventDefault();
                confirmSkip(i);
              }}
            >
              <label className={p.field}>
                <span className="sr-only">Why skip it</span>
                <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why skip it? It won't come back." onKeyDown={(e) => e.key === "Escape" && setSkipping(null)} />
              </label>
              <button type="submit" className={p.btn}>
                Skip
              </button>
            </form>
          )}
        </div>
        <span className={s.state} data-lamp={st.lamp}>
          {st.text}
          {i.alsoIn ? <span className={s.batch}> · +{i.alsoIn} repos</span> : null}
        </span>
        <span className={s.actions}>
          {mode !== "sample" && (
            <>
              <button
                type="button"
                className={p.iconBtn}
                aria-pressed={watched}
                title={watched ? "Stop watching" : "Watch it on Discover"}
                onClick={() => (watched ? unwatchIssue(key) : watchIssue({ repo: i.repo, number: i.number, title: i.title, url: i.url }))}
              >
                <Eye size={16} aria-hidden="true" />
                <span className="sr-only">{watched ? `Stop watching ${i.title}` : `Watch ${i.title}`}</span>
              </button>
              <button
                type="button"
                className={p.iconBtn}
                title="Skip it, with a reason"
                onClick={() => {
                  setSkipping((cur) => (cur === i.id ? null : i.id));
                  setReason("");
                }}
              >
                <X size={16} aria-hidden="true" />
                <span className="sr-only">Skip {i.title}</span>
              </button>
            </>
          )}
        </span>
      </li>
    );
  };

  const skippedList = Object.entries(skipped).sort((a, b) => b[1].at.localeCompare(a[1].at));
  const hidden = all.length - shown.length;

  return (
    <div className={p.page}>
      <div className={p.head}>
        <div>
          <h1 className={p.h1}>Following</h1>
          <p className={p.lede}>
            Repos, orgs and maintainers you keep an eye on. New issues by the rule you set, and a scan for free ones of any age. Spool checks while it&rsquo;s open, from
            your browser.
          </p>
        </div>
      </div>

      <section className={p.panel}>
        <div className={p.panelHead}>
          <div>
            <h2>What you follow</h2>
            <p>
              {follows.length} of {MAX_FOLLOWS}. Each one is a search, so a check costs a few of GitHub&rsquo;s search calls.
            </p>
          </div>
          {mode === "sample" && <span className={p.tag}>Sample data</span>}
        </div>
        {mode === "sample" ? (
          <p className={p.muted}>On the sample board these follows are invented. Leave sample data and connect GitHub to follow real ones.</p>
        ) : (
          <form className={s.addForm} onSubmit={add} noValidate>
            <label className={p.field}>
              <span className="sr-only">Repo, org or person</span>
              <input
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value);
                  setFormError(null);
                }}
                placeholder="owner/repo, an org, or @maintainer"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={!!formError || undefined}
                aria-describedby={formError ? "follow-error" : undefined}
              />
            </label>
            {!target.trim().startsWith("@") && (
              <>
                <label className={s.select}>
                  <span className="sr-only">Which new issues count</span>
                  <select value={rule} onChange={(e) => setRule(e.target.value as FollowRule)}>
                    {RULES.map(([r, label]) => (
                      <option key={r} value={r}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {rule === "labels" && (
                  <label className={`${p.field} ${s.labels}`}>
                    <span className="sr-only">Labels, separated by commas</span>
                    <input value={labels} onChange={(e) => setLabels(e.target.value)} placeholder="good first issue, help wanted" spellCheck={false} />
                  </label>
                )}
              </>
            )}
            <button type="submit" className={`${p.btn} ${p.btnSign}`} disabled={!target.trim() || adding}>
              {adding ? "Checking" : "Follow"}
            </button>
            {formError && (
              <p id="follow-error" className={p.formError} role="alert">
                {formError}
              </p>
            )}
          </form>
        )}
        {follows.length === 0 ? (
          <p className={p.empty}>Nothing followed yet. Add a repo you contribute to, the org behind it, or a maintainer who files good issues.</p>
        ) : (
          <ul className={s.follows}>
            {follows.map((f) => {
              const n = newCount(f);
              const href = `https://github.com/${f.kind === "repo" ? `${f.target}/issues` : f.target}`;
              return (
                <li key={f.id}>
                  <span className={s.kind}>{KIND_WORD[f.kind]}</span>
                  <a href={href} target="_blank" rel="noreferrer" className={s.target}>
                    {f.kind === "maintainer" ? `@${f.target}` : f.target}
                  </a>
                  <span className={s.rule}>{ruleText(f)}</span>
                  <span className={s.newCount}>{n ? `${n} new` : ""}</span>
                  {f.kind === "repo" ? (
                    <Link href={`/board/repos/${f.target}`} className={p.iconBtn} title="Can an outsider land work here?">
                      <ShieldCheck size={16} aria-hidden="true" />
                      <span className="sr-only">Check {f.target}</span>
                    </Link>
                  ) : (
                    <span />
                  )}
                  {mode !== "sample" && (
                    <button type="button" className={p.iconBtn} title="Stop following" onClick={() => removeFollow(f.id)}>
                      <X size={16} aria-hidden="true" />
                      <span className="sr-only">Stop following {f.target}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {follows.length > 0 && (
        <section className={p.panel} aria-busy={busy === "feed"}>
          <div className={p.panelHead}>
            <div>
              <h2>New issues</h2>
              <p>
                Open, unassigned and without a linked PR, newest first.{" "}
                {feed?.at && now ? `Checked ${ago(feed.at, now)} ago.` : mode === "sample" ? "Sample data." : ""}
              </p>
            </div>
            <div className={s.tools}>
              <button type="button" className={p.btn} aria-pressed={onlyFree} onClick={() => setOnlyFree((v) => !v)}>
                {onlyFree ? "Show all" : "Only free"}
              </button>
              {mode !== "sample" && (
                <>
                  <button type="button" className={p.btn} onClick={seeFollows} disabled={!all.some((i) => i.isNew)}>
                    Mark all seen
                  </button>
                  <button type="button" className={p.btn} onClick={() => void run("feed", follows)} disabled={!!busy} title="Check again">
                    <RefreshCw size={14} className={busy === "feed" ? s.spin : undefined} aria-hidden="true" />
                    <span className="sr-only">Check again</span>
                  </button>
                </>
              )}
            </div>
          </div>
          {error && <p className={p.error}>{error}</p>}
          {!feed ? (
            <div className={p.loading}>
              <span className="shimmer">Searching what you follow…</span>
            </div>
          ) : shown.length === 0 ? (
            <p className={p.empty}>{all.length ? "Nothing free right now. Every new issue has someone asking or a PR." : "No open, unassigned issues match your rules right now."}</p>
          ) : (
            <ul className={s.list}>{shown.map(row)}</ul>
          )}
          {hidden > 0 && (
            <p className={p.muted}>
              {hidden} more {hidden === 1 ? "has" : "have"} someone asking or a PR.{" "}
              <button type="button" className={s.link} onClick={() => setOnlyFree(false)}>
                Show all
              </button>
            </p>
          )}
        </section>
      )}

      {follows.some((f) => f.kind !== "maintainer") && (
        <section className={p.panel} aria-busy={busy === "scan"}>
          <div className={p.panelHead}>
            <div>
              <h2>Free issues, any age</h2>
              <p>
                Ignores your rules: any label, recently active first, with nobody asking in the last 21 days and no PR.{" "}
                {scan?.at && now ? `Scanned ${ago(scan.at, now)} ago.` : ""}
              </p>
            </div>
            {mode !== "sample" && (
              <button type="button" className={p.btn} onClick={() => void run("scan", follows)} disabled={!!busy}>
                <Search size={14} aria-hidden="true" />
                {busy === "scan" ? "Scanning" : scan ? "Scan again" : "Scan for free issues"}
              </button>
            )}
          </div>
          {!scan ? (
            <p className={p.empty}>Scan the repos and orgs you follow for older issues nobody has taken.</p>
          ) : (
            scanned.map(({ f, issues }) => (
              <div key={f.id} className={s.scanGroup}>
                <h3>
                  {f.target} <span>{issues.length} free</span>
                </h3>
                {issues.length ? <ul className={s.list}>{issues.map(row)}</ul> : <p className={p.empty}>Nothing free in the most active 30.</p>}
              </div>
            ))
          )}
        </section>
      )}

      {skippedList.length > 0 && (
        <section className={p.panel}>
          <details className={s.skipped}>
            <summary>
              <h2>Skipped</h2>
              <span>{skippedList.length}</span>
            </summary>
            <ul className={p.list}>
              {skippedList.map(([key, it]) => (
                <li key={key} className={`${p.item} ${s.skippedRow}`}>
                  <div className={p.itemMain}>
                    <a href={it.url} target="_blank" rel="noreferrer" className={p.itemTitle}>
                      {it.title}
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </a>
                    <span className={p.itemSub}>
                      {it.repo}#{it.number} · {it.reason} · {fmtDate(it.at)}
                    </span>
                  </div>
                  <button type="button" className={p.btn} onClick={() => unskipIssue(key)}>
                    Bring back
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}
