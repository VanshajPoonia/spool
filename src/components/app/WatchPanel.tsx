"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EyeOff, RefreshCw } from "lucide-react";
import { CarrierTag, Lamp } from "@/components/kit/Kit";
import { fetchWatched, fetchWatchedPublic, GUEST_CALLS_PER_ISSUE } from "@/lib/github";
import { sampleWatched } from "@/lib/sample-board";
import { readMeta, seeWatched, unwatchIssue, useAuth, useMeta, useUsage, watchCacheStore, watchIssue, windowLeft } from "@/lib/store";
import { fmtDate } from "@/lib/time";
import { parseIssueRef, watchKey, watchStatus, type WatchedIssue, type WatchItem, type WatchStatus } from "@/lib/watch";
import { useBoard } from "./BoardProvider";
import p from "./page.module.css";
import s from "./watch.module.css";

const RANK: Record<WatchStatus["kind"], number> = { asked: 0, pr: 1, assigned: 2, free: 3, closed: 4, missing: 5 };

type Row = { key: string; item: WatchItem; status: WatchStatus | null };

const FRESH_FOR = { live: 2 * 60000, guest: 15 * 60000 };

export function WatchPanel({ codeFor }: { codeFor: (repo: string) => string | undefined }) {
  const { mode, login, now } = useBoard();
  const auth = useAuth();
  const meta = useMeta();
  const cache = watchCacheStore.use();
  const usage = useUsage();
  const [ref, setRef] = useState("");
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Whose results the cache holds: your login, or "guest" for unauthenticated checks.
  const who = mode === "live" ? (auth?.login ?? null) : mode === "guest" ? "guest" : null;
  const token = mode === "live" ? (auth?.token ?? null) : null;
  const items = useMemo(() => Object.entries(meta.watch).sort((a, b) => b[1].addedAt.localeCompare(a[1].addedAt)), [meta.watch]);
  const itemsKey = items.map(([k]) => k).join(",");
  const issues = useMemo(() => (cache.who === who ? cache.issues : {}), [cache, who]);
  const at = cache.who === who ? cache.at : null;

  const fetchSome = useCallback(
    (list: { repo: string; number: number }[]) => (token ? fetchWatched(token, list) : fetchWatchedPublic(list)),
    [token],
  );

  /* Check the given keys; `all` replaces the whole cache and restamps "Checked". */
  const check = useCallback(
    async (keys: string[], all: boolean) => {
      const watch = readMeta().watch;
      const list = keys.filter((k) => watch[k]);
      if (!who || !list.length) return;
      setBusy(true);
      setError(null);
      try {
        const got = await fetchSome(list.map((k) => watch[k]));
        watchCacheStore.update((c) => {
          const next: Record<string, WatchedIssue | null> = all || c.who !== who ? {} : { ...c.issues };
          list.forEach((k, i) => (next[k] = got[i]));
          const stamp = all || c.who !== who || !c.at ? new Date().toISOString() : c.at;
          return { who, at: stamp, issues: next };
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't check your watched issues.");
      } finally {
        setBusy(false);
      }
    },
    [who, fetchSome],
  );

  // On arrival: reuse a recent check, and only ask GitHub about issues it hasn't seen yet.
  useEffect(() => {
    if (!who || !items.length || (mode !== "live" && mode !== "guest")) return;
    const c = watchCacheStore.read();
    const mine = c.who === who;
    const fresh = mine && !!c.at && Date.now() - Date.parse(c.at) < FRESH_FOR[mode];
    const keys = items.map(([k]) => k);
    const t = window.setTimeout(() => {
      if (!fresh) void check(keys, true);
      else {
        const missing = keys.filter((k) => !(k in c.issues));
        if (missing.length) void check(missing, false);
      }
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [who, itemsKey, mode]);

  const rows: Row[] = useMemo(() => {
    if (mode === "sample") {
      return sampleWatched(now || undefined).map(({ item, issue }) => ({ key: watchKey(item.repo, item.number), item, status: watchStatus(issue, item, login) }));
    }
    return items
      .map(([key, item]) => ({ key, item, status: key in issues ? watchStatus(issues[key], item, login) : null }))
      .sort((a, b) => {
        if (!a.status || !b.status) return 0;
        return (b.status.newComments > 0 ? 1 : 0) - (a.status.newComments > 0 ? 1 : 0) || RANK[a.status.kind] - RANK[b.status.kind];
      });
  }, [mode, now, login, items, issues]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseIssueRef(ref);
    if ("error" in parsed) return setFormError(parsed.error);
    const key = watchKey(parsed.repo, parsed.number);
    if (meta.watch[key]) return setFormError("You're already watching that one.");
    if (!who) return;
    setAdding(true);
    setFormError(null);
    try {
      const [issue] = await fetchSome([parsed]);
      if (!issue) setFormError(`GitHub couldn't find that issue. It may be deleted, a pull request, or private${token ? " to this token" : ""}.`);
      else {
        // Keep this answer, so adding an issue doesn't trigger a second check of it.
        watchCacheStore.update((c) => ({ who, at: c.who === who && c.at ? c.at : new Date().toISOString(), issues: { ...(c.who === who ? c.issues : {}), [key]: issue } }));
        watchIssue({ repo: parsed.repo, number: parsed.number, title: issue.title, url: issue.url });
        setRef("");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't reach GitHub.");
    } finally {
      setAdding(false);
    }
  };

  const allowance = mode === "guest" && now ? windowLeft(usage["guest:core"], now) : null;

  const changed = rows.filter((r) => r.status && (r.status.newComments > 0 || r.status.kind === "asked")).length;

  return (
    <section className={p.panel} aria-busy={busy}>
      <div className={p.panelHead}>
        <div>
          <h2>Issues you&rsquo;re watching</h2>
          <p>
            Issues you might take. Spool checks whether each is still free, whether someone asked for it, and whether a PR or an assignee
            got there first.
          </p>
        </div>
        {mode === "sample" ? (
          <span className={p.tag}>Sample data</span>
        ) : (
          items.length > 0 && (
            <button type="button" className={p.btn} onClick={() => void check(items.map(([k]) => k), true)} disabled={busy} title="Check again">
              <RefreshCw size={14} className={busy ? s.spin : undefined} aria-hidden="true" />
              {busy ? "Checking" : at ? `Checked ${fmtDate(at)} ${at.slice(11, 16)} UTC` : "Check"}
            </button>
          )
        )}
      </div>

      {mode !== "sample" ? (
        <form className={s.form} onSubmit={add} noValidate>
          <label className={s.field}>
            <span className="sr-only">Issue link</span>
            <input
              value={ref}
              onChange={(e) => {
                setRef(e.target.value);
                setFormError(null);
              }}
              placeholder="Paste an issue link, or owner/repo#123"
              aria-invalid={!!formError || undefined}
              aria-describedby={formError ? "watch-error" : undefined}
            />
          </label>
          <button type="submit" className={`${p.btn} ${p.btnSign}`} disabled={adding || !ref.trim()}>
            {adding ? "Checking" : "Watch"}
          </button>
          {formError && (
            <p id="watch-error" className={s.formError} role="alert">
              {formError}
            </p>
          )}
        </form>
      ) : (
        <p className={p.muted}>On the sample board these are invented. Leave sample data to watch real issues, with or without a token.</p>
      )}

      {mode === "guest" && (
        <p className={s.allowance}>
          <span>
            As a guest, each check costs {GUEST_CALLS_PER_ISSUE} of GitHub&rsquo;s {allowance?.limit ?? 60} hourly calls per issue
            {allowance ? `; ${allowance.remaining} left until ${new Date(allowance.resetAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}.
          </span>{" "}
          <Link href="/board/settings">Connect GitHub for 5,000 an hour</Link>
        </p>
      )}

      {error && <p className={p.error}>{error}</p>}

      {rows.length === 0 ? (
        <p className={p.empty}>Nothing watched yet. Paste an issue link above, or use the eye on any good first issue below.</p>
      ) : (
        <>
          {changed > 0 && (
            <p className={s.summary}>
              {changed === 1 ? "1 issue has" : `${changed} issues have`} something new since you last looked.
            </p>
          )}
          <ul className={s.list}>
            {rows.map(({ key, item, status }) => (
              <li key={key} className={s.row} data-kind={status?.kind}>
                <span className={s.lamp}>{status ? <Lamp state={status.lamp} /> : <span className={s.pending} aria-hidden="true" />}</span>
                <CarrierTag repo={item.repo} size="sm" code={codeFor(item.repo)} />
                <div className={s.main}>
                  <a href={item.url} target="_blank" rel="noreferrer" className={s.title} onClick={() => mode !== "sample" && seeWatched(key, issues[key]?.title ?? undefined)}>
                    {item.title}
                  </a>
                  <span className={s.sub}>
                    {item.repo}#{item.number} · watching since {fmtDate(item.addedAt)}
                  </span>
                </div>
                <div className={s.status}>
                  {status ? (
                    <>
                      <strong>{status.label}</strong>
                      {status.detail &&
                        (status.href ? (
                          <a href={status.href} target="_blank" rel="noreferrer">
                            {status.detail}
                          </a>
                        ) : (
                          <span>{status.detail}</span>
                        ))}
                    </>
                  ) : (
                    <span>{busy ? "Checking…" : "Not checked yet"}</span>
                  )}
                </div>
                <span className={s.fresh}>{status && status.newComments > 0 ? `${status.newComments} new` : ""}</span>
                {mode !== "sample" ? (
                  <button type="button" className={p.iconBtn} onClick={() => unwatchIssue(key)} title="Stop watching">
                    <EyeOff size={16} aria-hidden="true" />
                    <span className="sr-only">Stop watching {item.title}</span>
                  </button>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
