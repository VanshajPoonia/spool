"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Check, ChevronDown, RefreshCw, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { NAV } from "@/components/app/nav";
import { StripLink } from "@/components/kit/Kit";
import { Bay, Strip, type StripKind, type StripState } from "@/components/kit/Strip";
import { carrier } from "@/lib/carriers";
import { FACES } from "@/lib/faces";
import { FEEDBACK_URL } from "@/lib/site";
import { useSectionFace } from "./mood";
import sec from "./section.module.css";
import s from "./phone.module.css";

/*
 * Spool on a phone: the app as it lays out 390 pixels wide, drawn at that size on wide screens, beside three
 * things that changed for small screens. Picking one changes the screen, and inside each one thing works the
 * way it does in the app: Today folds, and the search takes typing. Under it, the feedback link.
 *
 * SYNTHETIC: every repo, person and thread is invented, the same cast as the sample board.
 */

const code = (repo: string) => carrier(repo).code;

const STEPS = [
  {
    id: "today",
    title: "Today folds to a line",
    body: "Fold it and Today keeps to one line above your bays, its tools down to icons. Try the arrow.",
    face: FACES.calm,
  },
  {
    id: "follow",
    title: "Follows sit on two lines",
    body: "The repo, org or person and its new issues on top, the rule underneath. Nothing scrolls sideways.",
    face: FACES.watch,
  },
  {
    id: "search",
    title: "Search sits in the bar",
    body: "A phone has no Cmd+K, so the bar has a Search button for it. Type in the phone to try it.",
    face: FACES.focus,
  },
] as const;

type StepId = (typeof STEPS)[number]["id"];

type Row = {
  repo: string;
  num: number;
  kind: StripKind;
  title: string;
  note: string;
  who: string;
  age: string;
  state: StripState;
  quiet?: number;
};

const MINE: Row[] = [
  { repo: "harbor-sh/harbor", num: 5133, kind: "review", title: "Batch DNS lookups in the resolver", note: "@ilya asked for your review.", who: "@ilya", age: "1d", state: "you" },
  { repo: "quarry-db/quarry", num: 2431, kind: "pr", title: "Push LIMIT down through views", note: "Changes requested by @mara-k.", who: "@mara-k", age: "5h", state: "you" },
  { repo: "tinyorbit/orbit-cli", num: 84, kind: "issue", title: "--json output for status", note: "Assigned to you.", who: "@noor", age: "6d", state: "you" },
];

const THEIRS: Row[] = [
  { repo: "ripple-rs/ripple", num: 88, kind: "issue", title: "Panic on an empty frame", note: "No reply in 14 days. You had the last word.", who: "@sample-dev", age: "14d", state: "stalled", quiet: 14 },
  { repo: "fernlang/fern", num: 311, kind: "pr", title: "Exhaustiveness check for match guards", note: "Review requested from @kit-o.", who: "@sample-dev", age: "3d", state: "them", quiet: 3 },
];

const CHANGES = [
  { kind: "merged", label: "Merged", repo: "vela-dev/vela", num: 640, title: "Cache layer for asset hashing", when: "1d" },
  { kind: "status", label: "Now: Stalled", repo: "ripple-rs/ripple", num: 88, title: "Panic on an empty frame", when: "now" },
];

// on a phone the kind column goes; a repo keeps its outsider check
const FOLLOWS = [
  { target: "quarry-db/quarry", rule: "labelled good first issue or help wanted", fresh: 2, check: true },
  { target: "@mara-k", rule: "issues they file anywhere", fresh: 1, check: false },
  { target: "tinyorbit", rule: "issues filed by maintainers", fresh: 0, check: false },
  { target: "harbor-sh/harbor", rule: "every new issue", fresh: 0, check: true },
];

/* ---------- the bar at the top of every page ---------- */

function PhoneBar({ place, searching }: { place: string; searching: boolean }) {
  return (
    <div className={s.bar}>
      <div className={s.barTop}>
        <span className={s.brand}>
          <span className={s.face}>{FACES.calm}</span>
          Spool
        </span>
        <span className={s.barEnd}>
          <span className={s.barBtn} data-on={searching || undefined}>
            <Search size={15} />
          </span>
          <span className={s.barBtn}>
            <RefreshCw size={14} />
          </span>
        </span>
      </div>
      <div className={s.places}>
        {NAV.map((n) => (
          <span key={n.href} className={s.place} data-on={n.label === place || undefined}>
            <n.icon size={14} strokeWidth={1.8} />
            {n.label}
            {n.label === "Bay" && <span className={s.placeCount}>{MINE.length}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function Sample() {
  return (
    <p className={s.sample}>
      <span className={sec.tag}>Sample data</span>
      <span className={s.sampleOut}>Leave sample data</span>
    </p>
  );
}

const strip = (r: Row, i: number) => (
  <li key={r.num} className={s.rowIn} style={{ "--i": i } as CSSProperties}>
    <Strip
      kind={r.kind}
      callsign={code(r.repo)}
      num={r.num}
      title={r.title}
      note={r.note}
      who={r.who}
      age={r.age}
      quiet={r.quiet ?? null}
      state={r.state}
      sample
    />
  </li>
);

/* ---------- the bay, with Today folded or open ---------- */

function TodayScreen() {
  const [folded, setFolded] = useState(true);
  return (
    <div className={s.page}>
      <div className={s.pageHead}>
        <p className={s.pageTitle}>Your bay</p>
        <span className={s.pageNote}>
          {MINE.length} on you · {THEIRS.length} on them
        </span>
      </div>
      <div className={s.tools}>
        <span className={s.search}>
          <Search size={14} />
          Filter by title, repo, person
        </span>
        <span className={s.tool}>
          <SlidersHorizontal size={14} />
          Filter
        </span>
        <span className={s.tool}>
          <span className={s.lamp} data-k="stalled" />
          Stalled <b>1</b>
        </span>
        <span className={s.tool}>
          <span className={s.lamp} data-k="new" />
          New <b>2</b>
        </span>
      </div>
      <Bay
        as="div"
        name="Today"
        className={s.today}
        count={<span className={s.todayCount}>{CHANGES.length} changes</span>}
        tools={
          <>
            {!folded && (
              <span className={s.todayTool} title="Mark all handled">
                <Check size={14} />
              </span>
            )}
            <button
              type="button"
              className={s.fold}
              aria-expanded={!folded}
              onClick={() => setFolded((f) => !f)}
            >
              <ChevronDown size={18} aria-hidden="true" />
              <span className="sr-only">{folded ? "Show Today" : "Fold Today to one line"}</span>
            </button>
          </>
        }
      >
        {!folded && (
          <div className={s.changes}>
            <p className={s.changesHead}>Since you last looked</p>
            <ul>
              {CHANGES.map((c, i) => (
                <li key={c.num} data-kind={c.kind} style={{ "--i": i } as CSSProperties}>
                  <span className={s.changeLabel}>
                    <span className={s.changeDot} />
                    {c.label}
                  </span>
                  <span className={s.changeTitle}>
                    <span className={s.changeRef}>
                      {code(c.repo)}-{c.num}
                    </span>
                    {c.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Bay>
      <Bay as="div" name="Your move" which="you" count={MINE.length}>
        <ul className={s.rack}>{MINE.map(strip)}</ul>
      </Bay>
      <Bay as="div" name="Their move" which="them" count={THEIRS.length}>
        <ul className={s.rack}>{THEIRS.map((r, i) => strip(r, MINE.length + i))}</ul>
      </Bay>
    </div>
  );
}

/* ---------- Find: Following, each follow on two lines ---------- */

function FollowScreen() {
  return (
    <div className={s.page}>
      <div className={s.pageHead}>
        <p className={s.pageTitle}>Find</p>
        <span className={s.segment}>
          <span>Discover</span>
          <span data-on>Following</span>
        </span>
      </div>
      <p className={s.sectionHead}>Following</p>
      <ul className={s.follows}>
        {FOLLOWS.map((f, i) => (
          <li key={f.target} className={s.rowIn} style={{ "--i": i } as CSSProperties}>
            <span className={s.followTarget}>{f.target}</span>
            <span className={s.followNew}>{f.fresh ? `${f.fresh} new` : ""}</span>
            <span className={s.followBtn}>{f.check && <ShieldCheck size={15} />}</span>
            <span className={s.followRule}>{f.rule}</span>
          </li>
        ))}
      </ul>
      <p className={s.sectionHead}>New issues</p>
      <ul className={s.rack}>
        {[
          { num: 2442, title: "Document the cursor batch size setting", note: "Labelled good first issue. Nobody has asked for it.", age: "6h" },
          { num: 2447, title: "Crash when a view references itself", note: "Filed by @mara-k. Nobody has asked for it.", age: "3h" },
        ].map((r, i) =>
          strip({ repo: "quarry-db/quarry", kind: "issue", who: "@mara-k", state: "idle", ...r }, FOLLOWS.length + i),
        )}
      </ul>
    </div>
  );
}

/* ---------- Search: the palette, opened from the bar, filtering as you type ---------- */

const ITEMS: { group: string; title: string; sub?: string }[] = [
  { group: "Threads", title: MINE[0].title, sub: `${MINE[0].repo}#${MINE[0].num}` },
  { group: "Threads", title: MINE[1].title, sub: `${MINE[1].repo}#${MINE[1].num}` },
  ...NAV.map((n) => ({ group: "Pages", title: n.label })),
  { group: "Actions", title: "Refresh from GitHub" },
  { group: "Actions", title: "Mark everything seen", sub: "On the board" },
  { group: "Actions", title: "Send feedback", sub: "Opens a new issue on Spool's repo" },
];

function SearchScreen() {
  const [q, setQ] = useState("");
  const words = q.trim().toLowerCase();
  const shown = ITEMS.filter((it) => !words || `${it.title} ${it.sub ?? ""}`.toLowerCase().includes(words));
  const groups = [...new Set(shown.map((it) => it.group))];
  return (
    <div className={s.palette}>
      <label className={s.palField}>
        <Search size={15} aria-hidden="true" />
        <span className="sr-only">Try the search</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search threads, repos, orgs, pages and actions"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <div className={s.palList} aria-live="polite">
        {groups.length === 0 && <p className={s.palEmpty}>Nothing matches “{q}”.</p>}
        {groups.map((g) => (
          <div key={g}>
            <p className={s.palGroup}>{g}</p>
            {shown
              .filter((it) => it.group === g)
              .map((it) => (
                <p key={it.title} className={s.palItem} data-on={it === shown[0] || undefined}>
                  <span>{it.title}</span>
                  {it.sub && <span className={s.palSub}>{it.sub}</span>}
                </p>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- the section ---------- */

export function Phone() {
  const ref = useRef<HTMLElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [step, setStep] = useState<StepId>("today");
  const at = STEPS.findIndex((x) => x.id === step);
  useSectionFace(ref, STEPS[at].face);

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
    <section ref={ref} id="phone" className={sec.section} aria-labelledby="phone-title">
      <div className={s.layout}>
        <div className={s.head}>
          <h2 id="phone-title" className={sec.h2}>
            The same bay on your phone.
          </h2>
          <p className={sec.lede}>
            Spool fits a screen 390 pixels wide without scrolling sideways. On a wide screen this phone is drawn at that
            size, with the sample bay from above.
          </p>
        </div>

        <div className={s.steps} role="tablist" aria-label="On a phone" aria-orientation="vertical" onKeyDown={onKey}>
          {STEPS.map((x, i) => (
            <button
              key={x.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`phone-tab-${x.id}`}
              aria-selected={x.id === step}
              aria-controls="phone-panel"
              tabIndex={x.id === step ? 0 : -1}
              className={s.step}
              onClick={() => setStep(x.id)}
            >
              <span className={s.stepBar} />
              <span className={s.stepTitle}>{x.title}</span>
              <span className={s.stepBody}>{x.body}</span>
            </button>
          ))}
        </div>
        <p className={s.stepNow}>{STEPS[at].body}</p>

        <div className={s.stage}>
          <div className={s.phone} data-shine>
            <div className={s.screen} id="phone-panel" role="tabpanel" aria-labelledby={`phone-tab-${step}`}>
              <PhoneBar place={step === "follow" ? "Find" : "Bay"} searching={step === "search"} />
              <Sample />
              <div className={s.content} key={step}>
                {step === "today" && <TodayScreen />}
                {step === "follow" && <FollowScreen />}
                {step === "search" && (
                  <>
                    <div className={s.dim} aria-hidden="true" inert>
                      <TodayScreen />
                    </div>
                    <SearchScreen />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={s.feedback}>
          <p>
            Something missing or broken? <strong>Send feedback</strong> opens a new issue on Spool&rsquo;s repo. It&rsquo;s
            in Settings and in Cmd+K too.
          </p>
          <StripLink href={FEEDBACK_URL} variant="quiet" target="_blank" rel="noreferrer">
            Send feedback
          </StripLink>
        </div>
      </div>
    </section>
  );
}
