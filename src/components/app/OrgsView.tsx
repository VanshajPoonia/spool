"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowUpRight, Plus, X } from "lucide-react";
import { inDays } from "@/lib/deadlines";
import { GOALS, ownerOf, parseOwner, sampleOrgs, STATUSES, type Goal, type OrgPlan, type OrgStatus } from "@/lib/orgs";
import { removeOrgPlan, setOrgPlan, useMeta } from "@/lib/store";
import { useBoard } from "./BoardProvider";
import p from "./page.module.css";
import s from "./orgs.module.css";

const DAY = 86400000;
const links = (text: string) =>
  text
    .split(/\s+/)
    .map((l) => l.trim())
    .filter((l) => /^https?:\/\/\S+$/.test(l));

export function OrgsView() {
  const { mode, threads, login, now } = useBoard();
  const meta = useMeta();
  const sample = mode === "sample";
  const orgs: Record<string, OrgPlan> = useMemo(() => (sample ? (now ? sampleOrgs(now) : {}) : meta.investing), [sample, now, meta.investing]);

  // What the board says about each org: your open PRs, what's on you, and claims.
  const counts = useMemo(() => {
    const me = (login ?? "").toLowerCase();
    const out = new Map<string, { prs: number; onYou: number; claims: number }>();
    for (const t of threads) {
      const k = ownerOf(t.repo);
      const c = out.get(k) ?? { prs: 0, onYou: 0, claims: 0 };
      if (t.kind === "pr" && t.state === "open" && t.author?.toLowerCase() === me) c.prs++;
      if (t.next === "you") c.onYou++;
      if (t.claim && t.claim !== "covered" && t.next !== "done") c.claims++;
      out.set(k, c);
    }
    return out;
  }, [threads, login]);

  // Owners on your board you haven't added yet, busiest first; your own account left out.
  const suggestions = useMemo(
    () =>
      [...counts.entries()]
        .filter(([k, c]) => !orgs[k] && k !== (login ?? "").toLowerCase() && c.prs + c.onYou + c.claims > 0)
        .sort((a, b) => b[1].prs + b[1].claims - (a[1].prs + a[1].claims))
        .slice(0, 8)
        .map(([k]) => threads.find((t) => ownerOf(t.repo) === k)!.repo.split("/")[0]),
    [counts, orgs, login, threads],
  );

  const [owner, setOwner] = useState("");
  const [goal, setGoal] = useState<Goal>("job");
  const [error, setError] = useState<string | null>(null);

  const add = (input: string, g: Goal) => {
    const parsed = parseOwner(input);
    if ("error" in parsed) return setError(parsed.error);
    if (orgs[parsed.owner.toLowerCase()]) return setError("That org is already here.");
    setOrgPlan(parsed.owner, { owner: parsed.owner, goal: g, status: "active", addedAt: new Date().toISOString() });
    setOwner("");
    setError(null);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    add(owner, goal);
  };

  const byGoal = GOALS.map(([g, label]) => ({
    g,
    label,
    list: Object.values(orgs)
      .filter((o) => o.goal === g)
      .sort((a, b) => (a.nextDate ?? "9999").localeCompare(b.nextDate ?? "9999") || a.owner.localeCompare(b.owner)),
  })).filter((x) => x.list.length);

  return (
    <div className={p.page}>
      <div className={p.head}>
        <div>
          <h1 className={p.h1}>Orgs</h1>
          <p className={p.lede}>
            The places you&rsquo;re investing in, and why: a job, GSoC, a program, or for fun. Give each a status, a next step and a date. Dates within two weeks
            show on the board. All of it stays in this browser.
          </p>
        </div>
        {sample && <span className={p.tag}>Sample data</span>}
      </div>

      {!sample && (
        <section className={p.panel}>
          <form className={s.add} onSubmit={submit} noValidate>
            <label className={p.field}>
              <span className="sr-only">Org</span>
              <input
                value={owner}
                onChange={(e) => {
                  setOwner(e.target.value);
                  setError(null);
                }}
                placeholder="An org, like openwisp"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={!!error || undefined}
              />
            </label>
            <label className={s.select}>
              <span className="sr-only">Goal</span>
              <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
                {GOALS.map(([g, label]) => (
                  <option key={g} value={g}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={`${p.btn} ${p.btnSign}`} disabled={!owner.trim()}>
              Add
            </button>
            {error && (
              <p className={p.formError} role="alert">
                {error}
              </p>
            )}
          </form>
          {suggestions.length > 0 && (
            <div className={s.suggest}>
              <span className={p.muted}>From your board:</span>
              {suggestions.map((o) => (
                <button key={o} type="button" className={p.chip} onClick={() => add(o, goal)}>
                  <Plus size={13} aria-hidden="true" />
                  {o}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {byGoal.length === 0 && <p className={p.empty}>No orgs yet. Add the places you contribute to, and say what you want from each.</p>}

      {byGoal.map(({ g, label, list }) => (
        <section key={g} className={p.panel}>
          <div className={p.panelHead}>
            <h2>{label}</h2>
            <p>
              {list.length} {list.length === 1 ? "org" : "orgs"}
            </p>
          </div>
          <ul className={s.orgs}>
            {list.map((o) => {
              const c = counts.get(o.owner.toLowerCase()) ?? { prs: 0, onYou: 0, claims: 0 };
              const days = o.nextDate && now ? Math.round((new Date(`${o.nextDate}T00:00:00`).getTime() - new Date(now).setHours(0, 0, 0, 0)) / DAY) : null;
              const set = (patch: Partial<OrgPlan>) => !sample && setOrgPlan(o.owner, patch);
              return (
                <li key={o.owner} className={s.org} data-status={o.status}>
                  <div className={s.top}>
                    <a href={`https://github.com/${o.owner}`} target="_blank" rel="noreferrer" className={s.name}>
                      {o.owner}
                    </a>
                    <span className={s.counts}>
                      {c.prs} open {c.prs === 1 ? "PR" : "PRs"} · {c.onYou} on you · {c.claims} {c.claims === 1 ? "claim" : "claims"}
                    </span>
                    <label className={s.select}>
                      <span className="sr-only">Goal for {o.owner}</span>
                      <select value={o.goal} disabled={sample} onChange={(e) => set({ goal: e.target.value as Goal })}>
                        {GOALS.map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={s.select}>
                      <span className="sr-only">Status of {o.owner}</span>
                      <select value={o.status} disabled={sample} onChange={(e) => set({ status: e.target.value as OrgStatus })}>
                        {STATUSES.map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                    {!sample && (
                      <button type="button" className={p.iconBtn} title="Remove" onClick={() => removeOrgPlan(o.owner)}>
                        <X size={16} aria-hidden="true" />
                        <span className="sr-only">Remove {o.owner}</span>
                      </button>
                    )}
                  </div>
                  <div className={s.next}>
                    <label className={p.field}>
                      <span className="sr-only">Next step for {o.owner}</span>
                      <input value={o.next} readOnly={sample} onChange={(e) => set({ next: e.target.value })} placeholder="Next step, like: draft the GSoC proposal" />
                    </label>
                    <label className={`${p.field} ${s.date}`}>
                      <span className="sr-only">Date for {o.owner}</span>
                      <input type="date" value={o.nextDate ?? ""} readOnly={sample} onChange={(e) => set({ nextDate: e.target.value || null })} />
                    </label>
                    <span className={s.when} data-soon={days !== null && days >= 0 && days <= 3 ? "" : undefined}>
                      {days === null ? "" : days < 0 ? `${-days} ${days === -1 ? "day" : "days"} ago` : inDays(days)}
                    </span>
                  </div>
                  <div className={s.notes}>
                    <textarea value={o.notes} readOnly={sample} onChange={(e) => set({ notes: e.target.value })} placeholder="Notes: how they review, who to ask, what you learned" rows={2} aria-label={`Notes for ${o.owner}`} />
                    <div>
                      <textarea value={o.links} readOnly={sample} onChange={(e) => set({ links: e.target.value })} placeholder="Links, one per line: CONTRIBUTING, chat, ideas list" rows={2} aria-label={`Links for ${o.owner}`} />
                      {links(o.links).length > 0 && (
                        <div className={s.links}>
                          {links(o.links).map((l) => (
                            <a key={l} href={l} target="_blank" rel="noreferrer">
                              {l.replace(/^https?:\/\/(www\.)?/, "").slice(0, 48)}
                              <ArrowUpRight size={12} aria-hidden="true" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
