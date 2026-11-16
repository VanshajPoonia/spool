"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { StateMark, type MarkState } from "@/components/kit/Kit";
import { ago } from "@/lib/classify";
import { fetchRepoCheck } from "@/lib/github";
import { fmtHours, openPrsByOwner, sampleRepoCheck, type RepoCheck } from "@/lib/outsider";
import { repoCheckStore, saveRepoCheck, useAuth, useSettings } from "@/lib/store";
import { useBoard } from "./BoardProvider";
import p from "./page.module.css";
import s from "./repocheck.module.css";

const DAY = 86400000;

/* Spool's reading of the numbers, worded as a reading: the facts below it are what count. */
function reading(c: RepoCheck): { mark: MarkState; text: string } {
  if (c.archived) return { mark: "stop", text: "Archived. Nothing new lands here." };
  const slow = c.answer.medianHours !== null && c.answer.medianHours > 14 * 24;
  if (c.merged.outsideAuthors <= 2) return { mark: "stop", text: "Outsiders rarely land work here. Check who the merged authors are before you invest." };
  if (slow || c.answer.unanswered > c.answer.answered) return { mark: "wait", text: "Outsiders get in, but many outside PRs wait a long time for a first answer." };
  return { mark: "go", text: "Outsiders land work here, and outside PRs usually get an answer." };
}

export function RepoCheckPanel({ repo }: { repo: string }) {
  const { mode, login, threads, now } = useBoard();
  const auth = useAuth();
  const { orgPrLimit } = useSettings();
  const all = repoCheckStore.use();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  const saved = all[repo.toLowerCase()];
  const check = mode === "sample" ? (now ? sampleRepoCheck(repo, now) : null) : saved ?? null;

  const run = useCallback(async () => {
    if (mode !== "live" || !auth) return;
    setBusy(true);
    setError(null);
    try {
      const c = await fetchRepoCheck(auth.token, repo);
      if (c) saveRepoCheck(c);
      else setMissing(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach GitHub.");
    } finally {
      setBusy(false);
    }
  }, [mode, auth, repo]);

  // A check is good for a day; one request per repo, about 5 to 10 seconds.
  useEffect(() => {
    if (mode !== "live") return;
    const c = repoCheckStore.read()[repo.toLowerCase()];
    if (c && Date.now() - Date.parse(c.at) < DAY) return;
    const t = window.setTimeout(() => void run(), 0);
    return () => window.clearTimeout(t);
  }, [mode, repo, run]);

  const owner = repo.split("/")[0];
  const mine = login ? (openPrsByOwner(threads, login).get(owner.toLowerCase()) ?? 0) : 0;
  const r = check ? reading(check) : null;

  return (
    <section className={`${p.panel} ${s.panel}`} aria-busy={busy}>
      <div className={p.panelHead}>
        <div>
          <h2>Can an outsider land work here?</h2>
          <p>
            Read from public data on GitHub.{" "}
            {mode === "sample" ? "Sample data." : check && now ? `Checked ${ago(check.at, now)} ago.` : ""}
          </p>
        </div>
        {mode === "live" && (
          <button type="button" className={p.btn} onClick={() => void run()} disabled={busy} title="Check again">
            <RefreshCw size={14} className={busy ? s.spin : undefined} aria-hidden="true" />
            {busy ? "Checking" : "Check again"}
          </button>
        )}
      </div>

      {error && <p className={p.error}>{error}</p>}
      {missing && !check && <p className={p.empty}>GitHub has no repo called {repo} that this token can see.</p>}
      {!check && !error && !missing && (
        <div className={p.loading}>
          <span className="shimmer">Reading the last 90 days of {repo}…</span>
        </div>
      )}

      {check && r && (
        <>
          <p className={s.reading} data-mark={r.mark}>
            <StateMark state={r.mark} />
            {r.text}
          </p>
          <dl className={s.facts}>
            <div>
              <dt>Merged in 90 days</dt>
              <dd>
                {check.merged.total} PRs. {check.merged.outside} of the last {check.merged.sampled} came from outside, from {check.merged.outsideAuthors}{" "}
                {check.merged.outsideAuthors === 1 ? "person" : "people"}.
              </dd>
            </div>
            <div>
              <dt>First answer to outside PRs</dt>
              <dd>
                {check.answer.answered ? `Median ${fmtHours(check.answer.medianHours)}` : "None answered"}
                {check.answer.unanswered ? `. ${check.answer.unanswered} of the last ${check.answer.answered + check.answer.unanswered} closed with no answer.` : "."}
              </dd>
            </div>
            <div>
              <dt>Sign-off</dt>
              <dd>
                {check.sign.cla && check.sign.dco
                  ? "A CLA and DCO sign-off (git commit -s)."
                  : check.sign.cla
                    ? "A CLA, signed once before your first PR is reviewed."
                    : check.sign.dco
                      ? "DCO: sign off every commit with git commit -s."
                      : "No CLA or DCO check on recent PRs."}
              </dd>
            </div>
            <div>
              <dt>Your open PRs in {owner}</dt>
              <dd data-over={mine >= orgPrLimit || undefined}>
                {mine} of your limit of {orgPrLimit}
                {mine >= orgPrLimit ? ". Land some before opening more." : "."}
              </dd>
            </div>
            <div>
              <dt>Free good first issues</dt>
              <dd>
                <a href={`https://github.com/${check.repo}/issues?q=is%3Aissue+is%3Aopen+no%3Aassignee+label%3A%22good+first+issue%22`} target="_blank" rel="noreferrer">
                  {check.goodFirst} unassigned
                </a>
              </dd>
            </div>
            <div>
              <dt>Last push</dt>
              <dd>{now ? `${ago(check.pushedAt, now)} ago` : check.pushedAt.slice(0, 10)}</dd>
            </div>
            <div>
              <dt>Licence</dt>
              <dd>{check.licence ?? "None found"}</dd>
            </div>
            <div>
              <dt>Code of conduct</dt>
              <dd>{check.codeOfConduct ? "Yes" : "None found"}</dd>
            </div>
          </dl>

          <div className={s.notes}>
            <div>
              <h3>Taking an issue</h3>
              {check.claim.lines.length === 0 && check.claim.workflows.length === 0 ? (
                <p className={p.muted}>
                  {check.contributing ? `${check.contributing} says nothing about assignment.` : "No CONTRIBUTING file found."} Ask on the issue before you start.
                </p>
              ) : (
                <>
                  {check.claim.lines.map((l) => (
                    <blockquote key={l}>{l}</blockquote>
                  ))}
                  {check.claim.workflows.length > 0 && (
                    <p className={p.muted}>
                      Assignment runs through workflows: <code>{check.claim.workflows.join(", ")}</code>
                    </p>
                  )}
                </>
              )}
              {check.contributing && (
                <a className={s.source} href={`${check.url}/blob/HEAD/${check.contributing}`} target="_blank" rel="noreferrer">
                  Read {check.contributing}
                </a>
              )}
            </div>
            <div>
              <h3>AI policy</h3>
              {check.ai.line ? <blockquote>{check.ai.line}</blockquote> : <p className={p.muted}>Nothing about AI in {check.ai.file ?? check.contributing ?? "the repo's contributing guide"}.</p>}
              {check.ai.file && (
                <a className={s.source} href={`${check.url}/blob/HEAD/${check.ai.file}`} target="_blank" rel="noreferrer">
                  Read {check.ai.file}
                </a>
              )}
            </div>
          </div>
          <p className={p.muted}>
            Outside means GitHub calls the author a contributor or newcomer. Staff who hide their org membership look like outsiders, so a lot of outside PRs from few people
            can still be staff. PRs titled with an internal ticket, like [WEB-123], count as staff.
          </p>
        </>
      )}
    </section>
  );
}
