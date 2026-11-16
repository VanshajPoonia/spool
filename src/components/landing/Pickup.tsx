"use client";

import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ChevronRight } from "lucide-react";
import { StateMark, StripLink, type MarkState } from "@/components/kit/Kit";
import { Bay, Strip, type StripState } from "@/components/kit/Strip";
import { carrier } from "@/lib/carriers";
import { FACES } from "@/lib/faces";
import { buildLogbook, sampleLogPrs } from "@/lib/logbook";
import { fmtHours, sampleRepoCheck, type RepoCheck } from "@/lib/outsider";
import { useNow } from "@/lib/time";
import { useFlip } from "./flip";
import { useSectionFace } from "./mood";
import { SectionHead } from "./SectionHead";
import sec from "./section.module.css";
import s from "./pickup.module.css";

/*
 * After the bay: finding an issue you can land and keeping hold of it. Four steps, each a page of the app
 * drawn in a window: Find's follows, a repo's outsider report, the Claims group and the logbook.
 * Picking a step swaps the page; inside each one something can be changed, the way the app changes it.
 *
 * SYNTHETIC: every repo, person and issue is invented, the same cast as the sample board.
 */

const code = (repo: string) => carrier(repo).code;

const STEPS = [
  {
    id: "find",
    title: "Follow",
    crumb: ["Find", "Following"],
    body: "Follow a repo, an org or a maintainer, with a rule for which new issues count. A scan turns up older ones nobody has taken.",
    face: FACES.watch,
  },
  {
    id: "check",
    title: "Check",
    crumb: ["Repos"],
    body: "Before you invest, see whether outsiders land work there: merges, first answers, sign-off and how to ask for an issue.",
    face: FACES.focus,
  },
  {
    id: "claim",
    title: "Claim",
    crumb: ["Bay", "Claims"],
    body: "Ask on GitHub as usual. Spool finds your ask, counts the days until you're assigned and warns before a claim goes cold.",
    face: FACES.side,
  },
  {
    id: "count",
    title: "Count",
    crumb: ["Repos", "Logbook"],
    body: "What merges in other people's repos goes in your logbook, month by month, with a streak counted in weeks.",
    face: FACES.stars,
  },
] as const;

type StepId = (typeof STEPS)[number]["id"];

/* ---------- Follow ---------- */

type Rule = "labels" | "maintainers" | "all";

const RULES: { id: Rule; label: string; says: string }[] = [
  { id: "labels", label: "Labels", says: "New issues labelled good first issue or help wanted" },
  { id: "maintainers", label: "Maintainers", says: "New issues filed by the project's own people" },
  { id: "all", label: "Every issue", says: "Every new issue" },
];

const QUARRY = "quarry-db/quarry";

const FEED = [
  { num: 2447, title: "Crash when a view references itself", labels: ["bug"], by: "lin-w", maint: false, age: "3h", asked: null },
  { num: 2442, title: "Document the cursor batch size setting", labels: ["good first issue", "docs"], by: "mara-k", maint: true, age: "6h", asked: null },
  { num: 2445, title: "Inline CTEs that are used once", labels: ["enhancement"], by: "mara-k", maint: true, age: "1d", asked: null },
  { num: 2436, title: "EXPLAIN output drops the LIMIT node", labels: ["help wanted"], by: "mara-k", maint: true, age: "2d", asked: "@ren-t" },
];

function keeps(rule: Rule, i: (typeof FEED)[number]) {
  if (rule === "labels") return i.labels.some((l) => l === "good first issue" || l === "help wanted");
  if (rule === "maintainers") return i.maint;
  return true;
}

function Status({ mark, word }: { mark: MarkState; word: string }) {
  return (
    <span className={s.status}>
      <StateMark state={mark} />
      {word}
    </span>
  );
}

function FollowPane() {
  const [rule, setRule] = useState<Rule>("labels");
  const listRef = useRef<HTMLUListElement>(null);
  const shown = FEED.filter((i) => keeps(rule, i));
  useFlip(listRef, rule);

  return (
    <div className={s.page}>
      <div className={s.pageHead}>
        <p className={s.pageTitle}>Find</p>
        <span className={s.segment} aria-hidden="true">
          <span>Discover</span>
          <span data-on>Following</span>
        </span>
      </div>

      <div className={s.follow}>
        <span className={s.cs}>{code(QUARRY)}</span>
        <span className={s.followName}>
          {QUARRY}
          <span className={s.followRule}>{RULES.find((r) => r.id === rule)!.says}</span>
        </span>
        <span className={s.ruleSwitch} role="radiogroup" aria-label="Rule for quarry-db/quarry">
          {RULES.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={rule === r.id} onClick={() => setRule(r.id)}>
              {r.label}
            </button>
          ))}
        </span>
      </div>

      <ul ref={listRef} className={s.rows} aria-live="polite" aria-label={`${shown.length} issues match`}>
        {shown.map((i, n) => (
          <li key={i.num} data-flip={i.num} className={s.rowIn} style={{ "--i": n } as CSSProperties}>
            <Strip
              kind="issue"
              callsign={code(QUARRY)}
              num={i.num}
              title={i.title}
              note={
                i.asked ? (
                  <>
                    <Status mark="wait" word="Asked for" />
                    {i.asked} asked to take it 20 hours ago.
                  </>
                ) : (
                  <>
                    <Status mark="go" word="Free" />
                    No assignee, no linked PR, nobody asking.
                  </>
                )
              }
              who={`@${i.by}`}
              age={i.age}
              state={i.asked ? "them" : "idle"}
              sample
              data={{ "data-wrap-note": "" }}
            />
          </li>
        ))}
      </ul>

      <div className={s.scan}>
        <p className={s.scanHead}>Free-issue scan</p>
        <p className={s.scanRow}>
          <span className={s.ref}>{code(QUARRY)}-2210</span>
          <span className={s.scanTitle}>Planner tests are slow on CI</span>
          <span className={s.scanWhy}>5 weeks old. No assignee, no linked PR, no ask in 21 days.</span>
        </p>
      </div>
    </div>
  );
}

/* ---------- Check ---------- */

const RIPPLE = "ripple-rs/ripple";

// The same reading the repo page gives, in the same words.
function reading(c: RepoCheck): { mark: MarkState; text: string } {
  if (c.merged.outsideAuthors <= 2) return { mark: "stop", text: "Outsiders rarely land work here. Check who the merged authors are before you invest." };
  return { mark: "go", text: "Outsiders land work here, and outside PRs usually get an answer." };
}

const CHECKS: Record<string, RepoCheck & { mine: number }> = {
  [QUARRY]: { ...sampleRepoCheck(QUARRY, 0), mine: 1 },
  [RIPPLE]: {
    ...sampleRepoCheck(RIPPLE, 0),
    licence: "MIT",
    codeOfConduct: false,
    goodFirst: 2,
    contributing: null,
    merged: { total: 41, sampled: 41, outside: 3, outsideAuthors: 2 },
    answer: { medianHours: 19 * 24, answered: 6, unanswered: 8 },
    claim: { lines: [], workflows: [] },
    sign: { cla: true, dco: false },
    ai: { file: null, line: null },
    mine: 1,
  },
};

function CheckPane({ repo, setRepo }: { repo: string; setRepo: (r: string) => void }) {
  const c = CHECKS[repo];
  const r = reading(c);
  const owner = repo.split("/")[0];

  return (
    <div className={s.page}>
      <div className={s.pageHead}>
        <p className={s.pageTitle}>Can an outsider land work here?</p>
        <span className={s.repoSwitch} role="radiogroup" aria-label="Repo">
          {[QUARRY, RIPPLE].map((x) => (
            <button key={x} type="button" role="radio" aria-checked={repo === x} onClick={() => setRepo(x)}>
              <span className={s.cs}>{code(x)}</span>
              <span className={s.switchName}>{x.split("/")[1]}</span>
            </button>
          ))}
        </span>
      </div>

      <div className={s.check} key={repo} aria-live="polite">
        <p className={s.reading} data-mark={r.mark}>
          <StateMark state={r.mark} />
          {r.text}
        </p>
        <dl className={s.facts}>
          <div>
            <dt>Merged in 90 days</dt>
            <dd>
              {c.merged.total} PRs. {c.merged.outside} of the last {c.merged.sampled} came from outside, from {c.merged.outsideAuthors} people.
            </dd>
          </div>
          <div>
            <dt>First answer to outside PRs</dt>
            <dd>
              Median {fmtHours(c.answer.medianHours)}. {c.answer.unanswered} of the last {c.answer.answered + c.answer.unanswered} closed with no answer.
            </dd>
          </div>
          <div>
            <dt>Sign-off</dt>
            <dd>{c.sign.cla ? "A CLA, signed once before your first PR is reviewed." : "DCO: sign off every commit with git commit -s."}</dd>
          </div>
          <div>
            <dt>Your open PRs in {owner}</dt>
            <dd>{c.mine} of your limit of 3.</dd>
          </div>
          <div>
            <dt>Free good first issues</dt>
            <dd>{c.goodFirst} unassigned</dd>
          </div>
          <div>
            <dt>Licence</dt>
            <dd>
              {c.licence}. {c.codeOfConduct ? "A code of conduct." : "No code of conduct."}
            </dd>
          </div>
          <div>
            <dt>Taking an issue</dt>
            <dd>{c.claim.lines[0] ? <q>{c.claim.lines[0]}</q> : "No CONTRIBUTING file found. Ask on the issue before you start."}</dd>
          </div>
          <div>
            <dt>AI policy</dt>
            <dd>{c.ai.line ? <q>{c.ai.line}</q> : "Nothing about AI in the repo's contributing guide."}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/* ---------- Claim ---------- */

const CLAIMS: { repo: string; num: number; title: string; mark: MarkState; word: string; why: string; state: StripState; who: string; age: string }[] = [
  {
    repo: "tinyorbit/orbit-cli",
    num: 97,
    title: "Shell completions for zsh",
    mark: "wait",
    word: "Assigned",
    why: "Assigned to you 11 days ago. No PR yet. Some repos unassign after two weeks without one.",
    state: "you",
    who: "@noor",
    age: "11d",
  },
  {
    repo: "harbor-sh/harbor",
    num: 5171,
    title: "Retry budget metrics per host",
    mark: "go",
    word: "They replied",
    why: "@ilya replied after you asked to take it.",
    state: "you",
    who: "@ilya",
    age: "4h",
  },
  {
    repo: "fernlang/fern-lsp",
    num: 77,
    title: "Hover shows the wrong type for match guards",
    mark: "stop",
    word: "Taken",
    why: "@kit-o opened #79 for it. Talk to them or let it go.",
    state: "you",
    who: "@kit-o",
    age: "1d",
  },
  {
    repo: QUARRY,
    num: 2442,
    title: "Document the cursor batch size setting",
    mark: "idle",
    word: "Asked",
    why: "You asked to take it 2 days ago. Waiting to be assigned.",
    state: "them",
    who: "@sample-dev",
    age: "2d",
  },
];

const PHRASES = [
  { text: "Can I work on this?", hit: true },
  { text: "I'd like to take this", hit: true },
  { text: "please assign me", hit: true },
  { text: "@bot assign", hit: true },
  { text: "Are you still working on this?", hit: false },
];

function ClaimPane() {
  return (
    <div className={s.page}>
      <div className={s.pageHead}>
        <p className={s.pageTitle}>Your bay</p>
        <span className={s.headCount}>
          <strong>{CLAIMS.length}</strong> claims
        </span>
      </div>
      <div className={s.claims}>
        <Bay name="Claims" as="div" count={CLAIMS.length} hint="Issues you asked to take or were given.">
          <ul className={s.rack}>
            {CLAIMS.map((c, n) => (
              <li key={c.num} className={s.rowIn} style={{ "--i": n } as CSSProperties}>
                <Strip
                  kind="issue"
                  callsign={code(c.repo)}
                  num={c.num}
                  title={c.title}
                  note={
                    <>
                      <Status mark={c.mark} word={c.word} />
                      {c.why}
                    </>
                  }
                  who={c.who}
                  age={c.age}
                  state={c.state}
                  sample
                  data={{ "data-wrap-note": "" }}
                />
              </li>
            ))}
          </ul>
        </Bay>
      </div>
      <div className={s.phrases}>
        <p className={s.phrasesHead}>Comments Spool reads as your ask</p>
        <ul>
          {PHRASES.map((p) => (
            <li key={p.text} data-hit={p.hit || undefined}>
              <span className={s.phraseText}>{p.text}</span>
              {!p.hit && <span className={s.phraseNo}>not a claim</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- Count ---------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthName = (m: string) => `${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;

function CountPane() {
  const now = useNow();
  const lb = useMemo(() => (now ? buildLogbook(sampleLogPrs(now), 90, "sample-dev", now) : null), [now]);
  const months = lb?.months.slice(-12) ?? [];
  const max = Math.max(1, ...months.map((m) => m.merged));
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover !== null ? months[hover] : null;

  return (
    <div className={s.page}>
      <div className={s.pageHead}>
        <p className={s.pageTitle}>Logbook</p>
        <span className={s.headNote}>Your own repos are left out.</span>
      </div>
      {lb && (
        <div className={s.log}>
          <p className={s.counts}>
            <span>
              <strong>{lb.merged}</strong> merged
            </span>
            <span>
              <strong>{lb.repos.length}</strong> repos
            </span>
            <span>
              <strong>{lb.streak.current}</strong> weeks in a row, {lb.streak.longest} at best
            </span>
          </p>
          <p className={s.readout} aria-hidden="true">
            {shown ? (
              <>
                <strong>{shown.merged}</strong> merged in {monthName(shown.month)}
              </>
            ) : (
              "Merged PRs per month. Point at a bar for its month."
            )}
          </p>
          <ol className={s.bars} aria-label="Merged PRs per month, last 12 months" onPointerLeave={() => setHover(null)}>
            {months.map((m, i) => (
              <li
                key={m.month}
                style={{ "--h": m.merged / max, "--i": i } as CSSProperties}
                data-on={hover === i || undefined}
                onPointerEnter={() => setHover(i)}
              >
                <span className={s.bar} />
                <span className={s.barMonth} aria-hidden="true">
                  {MONTHS[Number(m.month.slice(5)) - 1].charAt(0)}
                </span>
                <span className="sr-only">
                  {monthName(m.month)}: {m.merged} merged
                </span>
              </li>
            ))}
          </ol>
          <ol className={s.top}>
            {lb.repos.slice(0, 3).map((r) => (
              <li key={r.repo}>
                <span className={s.cs}>{code(r.repo)}</span>
                <span className={s.topName}>{r.repo}</span>
                <span className={s.topCount}>{r.merged} merged</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/* ---------- the section ---------- */

export function Pickup() {
  const ref = useRef<HTMLElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [step, setStep] = useState<StepId>("find");
  const [repo, setRepo] = useState(QUARRY);
  const at = STEPS.findIndex((x) => x.id === step);
  const cur = STEPS[at];
  const crumb = step === "check" ? [...cur.crumb, repo] : cur.crumb;
  useSectionFace(ref, cur.face);

  // Arrow keys walk the steps, as a tab list does.
  const onKey = (e: KeyboardEvent) => {
    const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (at + d + STEPS.length) % STEPS.length;
    setStep(STEPS[n].id);
    tabs.current[n]?.focus();
  };

  return (
    <section ref={ref} id="pickup" className={sec.section} aria-labelledby="pickup-title">
      <SectionHead id="pickup-title" title="From a free issue to a merged PR.">
        Follow the repos and people you care about, check that outsiders get merged there, then ask for the issue. Spool
        keeps count from the day you ask until the PR lands in your logbook.
      </SectionHead>

      <div className={s.layout}>
        <div className={s.steps} role="tablist" aria-label="Steps" aria-orientation="vertical" onKeyDown={onKey}>
          {STEPS.map((x, i) => (
            <button
              key={x.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`pickup-tab-${x.id}`}
              aria-selected={x.id === step}
              aria-controls="pickup-panel"
              tabIndex={x.id === step ? 0 : -1}
              className={s.step}
              onClick={() => setStep(x.id)}
            >
              <span className={s.stepBar} />
              <span className={s.stepTitle}>
                <span className={s.stepNum}>{i + 1}</span>
                {x.title}
              </span>
              <span className={s.stepBody}>{x.body}</span>
            </button>
          ))}
        </div>
        <p className={s.stepNow}>{cur.body}</p>

        <div className={s.stage}>
          <div className={s.window} id="pickup-panel" role="tabpanel" aria-labelledby={`pickup-tab-${step}`} data-shine>
            <div className={s.chrome}>
              <span className={s.crumbs}>
                {crumb.map((c, i) => (
                  <span key={c}>
                    {i > 0 && <ChevronRight size={13} aria-hidden="true" />}
                    {c}
                  </span>
                ))}
              </span>
              <span className={sec.tag}>Sample data</span>
            </div>
            <div className={s.pane} key={step}>
              {step === "find" && <FollowPane />}
              {step === "check" && <CheckPane repo={repo} setRepo={setRepo} />}
              {step === "claim" && <ClaimPane />}
              {step === "count" && <CountPane />}
            </div>
          </div>
          <div className={s.cta}>
            <StripLink href="/board?demo=1" variant="quiet">
              Try it on the sample board
            </StripLink>
          </div>
        </div>
      </div>
    </section>
  );
}
