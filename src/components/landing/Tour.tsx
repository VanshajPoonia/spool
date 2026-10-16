"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Clock3,
  Pin,
  RefreshCw,
  AlarmClock,
} from "lucide-react";
import { NAV } from "@/components/app/nav";
import { PriorityTag } from "@/components/app/Priority";
import { StateMark, type MarkState } from "@/components/kit/Kit";
import {
  Bay,
  StatusIcon,
  Strip,
  type StripKind,
  type StripState,
} from "@/components/kit/Strip";
import { PrintText } from "@/components/print/PrintText";
import { carrier } from "@/lib/carriers";
import { FACES } from "@/lib/faces";
import { PRIOS, type Prio } from "@/lib/plan";
import { useFlip } from "./flip";
import { useSectionFace } from "./mood";
import { onScrollFrame, pinned, pinnedScrollY, ramp } from "./scroll";
import { SectionHead } from "./SectionHead";
import { useMotion } from "./useMotion";
import sec from "./section.module.css";
import s from "./tour.module.css";

/*
 * The product in use: someone signs on, works down their bay from the keyboard, sets a priority, answers on
 * GitHub, watches a quiet thread turn stalled and drags the week into shape. A pointer and the keys pressed
 * are drawn over the window, the way a screen recording shows them. The window pins while the page scrolls
 * and the scroll plays the morning, so scrolling back plays it backwards; five chapters underneath jump to any part.
 *
 * Each step of the script names what changes, where the pointer goes and which key is pressed. The window
 * is drawn from the scene after a step, so jumping to a chapter is only a matter of picking its first step.
 *
 * SYNTHETIC: every repo, person and thread is invented, the same cast as the sample board.
 */

type Thread = {
  repo: string;
  num: number;
  kind: StripKind;
  title: string;
  note: string;
  who: string;
  age: string;
  next: "you" | "them";
  quiet?: number;
};

const THREADS: Record<string, Thread> = {
  dns: {
    repo: "harbor-sh/harbor",
    num: 5133,
    kind: "review",
    title: "Batch DNS lookups in the resolver",
    note: "@ilya asked for your review.",
    who: "@ilya",
    age: "1d",
    next: "you",
  },
  limit: {
    repo: "quarry-db/quarry",
    num: 2431,
    kind: "pr",
    title: "Push LIMIT down through views",
    note: "Changes requested by @mara-k.",
    who: "@mara-k",
    age: "5h",
    next: "you",
  },
  json: {
    repo: "tinyorbit/orbit-cli",
    num: 84,
    kind: "issue",
    title: "--json output for status",
    note: "Assigned to you.",
    who: "@noor",
    age: "6d",
    next: "you",
  },
  cache: {
    repo: "vela-dev/vela",
    num: 640,
    kind: "pr",
    title: "Cache layer for asset hashing",
    note: "Approved. Waiting on @tomasz to merge.",
    who: "@tomasz",
    age: "6h",
    next: "them",
    quiet: 0,
  },
  guards: {
    repo: "fernlang/fern",
    num: 311,
    kind: "pr",
    title: "Exhaustiveness check for match guards",
    note: "Review requested from @kit-o.",
    who: "@sample-dev",
    age: "3d",
    next: "them",
    quiet: 3,
  },
  panic: {
    repo: "ripple-rs/ripple",
    num: 88,
    kind: "issue",
    title: "Panic on an empty frame",
    note: "Waiting on a maintainer.",
    who: "@sample-dev",
    age: "12d",
    next: "them",
    quiet: 12,
  },
};

const STALL = 14;

type View = "connect" | "loading" | "bay" | "plan";

type Scene = {
  view: View;
  focus: boolean;
  typed: boolean;
  sel: string | null;
  open: string | null;
  menu: boolean;
  prio: Record<string, Prio>;
  toast: string | null;
  skip: string | null;
  syncing: boolean;
  answered: boolean;
  quiet: number;
  hover: string | null;
  drag: string | null;
  doing: string[];
  face: string;
};

const START: Scene = {
  view: "connect",
  focus: false,
  typed: false,
  sel: null,
  open: null,
  menu: false,
  prio: {},
  toast: null,
  skip: null,
  syncing: false,
  answered: false,
  quiet: 12,
  hover: null,
  drag: null,
  doing: [],
  face: FACES.wink,
};

type Step = {
  ch: number;
  ms: number;
  /** what changes as the step begins */
  set?: Partial<Scene>;
  /** where the pointer travels over the step */
  to?: string;
  /** a press as the step begins: a click, or the start and end of a drag */
  click?: "tap" | "down" | "up";
  /** a key pressed, and what it does */
  key?: [string, string];
};

const CHAPTERS = [
  {
    title: "Sign on",
    body: "Paste a read-only token once. The bay fills in seconds.",
  },
  {
    title: "Triage",
    body: "J and K walk the list, Enter opens a thread, a priority is one click.",
  },
  {
    title: "Answer",
    body: "Reply on GitHub as usual. On the next sync the thread crosses to their side.",
  },
  {
    title: "Stalls",
    body: "Fourteen quiet days and a thread turns red and rises to the top.",
  },
  {
    title: "Plan",
    body: "Drag what matters into Working on. Spool says what to pick up next.",
  },
];

const STEPS: Step[] = [
  { ch: 0, ms: 700 },
  { ch: 0, ms: 850, to: "token" },
  { ch: 0, ms: 260, click: "tap", set: { focus: true } },
  { ch: 0, ms: 1150, set: { typed: true } },
  { ch: 0, ms: 700, to: "signon" },
  { ch: 0, ms: 340, click: "tap", set: { focus: false } },
  { ch: 0, ms: 1500, set: { view: "loading", face: FACES.focus } },
  { ch: 0, ms: 1800, set: { view: "bay", face: FACES.glad } },

  {
    ch: 1,
    ms: 700,
    key: ["J", "Next thread"],
    set: { sel: "dns", face: FACES.calm },
  },
  { ch: 1, ms: 700, key: ["J", "Next thread"], set: { sel: "limit" } },
  { ch: 1, ms: 1000, key: ["Enter", "Open details"], set: { open: "limit" } },
  { ch: 1, ms: 750, to: "prio" },
  { ch: 1, ms: 520, click: "tap", set: { menu: true } },
  { ch: 1, ms: 560, to: "prio-1" },
  { ch: 1, ms: 1100, click: "tap", set: { menu: false, prio: { limit: 1 } } },

  { ch: 2, ms: 720, to: "github" },
  {
    ch: 2,
    ms: 1000,
    click: "tap",
    set: { toast: "Opened quarry-db/quarry#2431 on GitHub" },
  },
  {
    ch: 2,
    ms: 1900,
    set: {
      toast: null,
      skip: "40 minutes later: you pushed a fix and replied on GitHub",
    },
  },
  { ch: 2, ms: 1000, set: { skip: null, syncing: true } },
  {
    ch: 2,
    ms: 1700,
    set: { syncing: false, answered: true, face: FACES.glad },
  },
  {
    ch: 2,
    ms: 850,
    key: ["Esc", "Close details"],
    set: { open: null, sel: null },
  },

  {
    ch: 3,
    ms: 1000,
    set: { skip: "Two days later, nobody has answered", face: FACES.watch },
  },
  { ch: 3, ms: 850, set: { quiet: 13 } },
  { ch: 3, ms: 1300, set: { quiet: STALL, skip: null, face: FACES.alarm } },
  { ch: 3, ms: 800, to: "row-panic" },
  { ch: 3, ms: 1900, set: { hover: "panic", face: FACES.side } },

  { ch: 4, ms: 800, to: "nav-plan", set: { hover: null } },
  { ch: 4, ms: 320, click: "tap", set: { view: "plan", face: FACES.calm } },
  { ch: 4, ms: 900 },
  { ch: 4, ms: 750, to: "card-dns" },
  { ch: 4, ms: 380, click: "down", set: { drag: "dns" } },
  { ch: 4, ms: 1000, to: "col-doing" },
  {
    ch: 4,
    ms: 600,
    click: "up",
    set: { drag: null, doing: ["dns"], face: FACES.glad },
  },
  { ch: 4, ms: 2600 },
];

// The scene after every step, worked out once.
const SCENES = STEPS.reduce<Scene[]>(
  (all, st, i) => [...all, { ...(i ? all[i - 1] : START), ...st.set }],
  [],
);
const FIRST = CHAPTERS.map((_, c) => STEPS.findIndex((st) => st.ch === c));
const LAST = CHAPTERS.map(
  (_, c) => FIRST[c] + STEPS.filter((st) => st.ch === c).length - 1,
);
const LENGTH = CHAPTERS.map((_, c) =>
  STEPS.filter((st) => st.ch === c).reduce((n, st) => n + st.ms, 0),
);

// The script runs on the scroll: each step gets a share of the runway in proportion to how long it takes.
const TOTAL = STEPS.reduce((n, st) => n + st.ms, 0);
const STARTS = STEPS.map((_, i) =>
  STEPS.slice(0, i).reduce((n, st) => n + st.ms, 0),
);
const CH_START = FIRST.map((i) => STARTS[i]);
// where the pointer should be at each step: the last target named at or before it
const AIM_AT = STEPS.map((_, i) => {
  for (let j = i; j >= 0; j--) if (STEPS[j].to) return j;
  return -1;
});

function stepAt(p: number) {
  const t = p * TOTAL;
  let i = 0;
  while (i < STEPS.length - 1 && STARTS[i + 1] <= t) i++;
  return i;
}

/* ---------- the threads as they stand in a scene ---------- */

type Row = Thread & {
  id: string;
  state: StripState;
  tone: MarkState;
  status: string;
};

function rowsOf(sc: Scene): Row[] {
  return Object.entries(THREADS).map(([id, t]) => {
    if (id === "limit" && sc.answered)
      return {
        ...t,
        id,
        next: "them",
        note: "You pushed a fix. Waiting on @mara-k.",
        who: "@sample-dev",
        age: "now",
        quiet: 0,
        state: "them",
        tone: "wait",
        status: "Awaiting review",
      };
    if (id === "panic" && sc.quiet >= STALL)
      return {
        ...t,
        id,
        quiet: sc.quiet,
        age: `${sc.quiet}d`,
        note: `No reply in ${sc.quiet} days. You had the last word.`,
        state: "stalled",
        tone: "stop",
        status: `Stalled ${sc.quiet}d`,
      };
    if (id === "panic")
      return {
        ...t,
        id,
        quiet: sc.quiet,
        age: `${sc.quiet}d`,
        state: "them",
        tone: "wait",
        status: "Awaiting",
      };
    const you = t.next === "you";
    return {
      ...t,
      id,
      state: you ? "you" : "them",
      tone: you ? (id === "limit" ? "stop" : "go") : "wait",
      status: you
        ? id === "limit"
          ? "Changes requested"
          : id === "dns"
            ? "Review asked"
            : "Assigned"
        : "Awaiting",
    };
  });
}

const code = (repo: string) => carrier(repo).code;

/* ---------- pieces of the window ---------- */

function Connect({ sc }: { sc: Scene }) {
  return (
    <div className={s.connect}>
      <span className={s.connectFace}>
        <PrintText value={sc.face} length={5} decorative />
      </span>
      <p className={s.connectTitle}>Sign on to your bay</p>
      <p className={s.connectText}>
        Paste a personal access token. It stays in this browser and only ever
        reads.
      </p>
      <span className={s.fieldLabel}>Personal access token</span>
      <span
        className={s.field}
        data-tour="token"
        data-aim="0.22 0.5"
        data-focus={sc.focus || undefined}
      >
        {sc.typed ? (
          <span className={s.dots}>
            {Array.from({ length: 18 }, (_, i) => (
              <span key={i} style={{ "--i": i } as CSSProperties} />
            ))}
          </span>
        ) : (
          <span className={s.placeholder}>ghp_… or github_pat_…</span>
        )}
        {sc.focus && <span className={s.caret} />}
      </span>
      <span className={s.signon} data-tour="signon">
        Check token and sign on
      </span>
    </div>
  );
}

function Loading({ sc }: { sc: Scene }) {
  return (
    <div className={s.loading}>
      <span className={s.connectFace}>
        <PrintText value={sc.face} length={5} decorative />
      </span>
      <span className="shimmer">
        Reading your PRs, issues, reviews and mentions from GitHub…
      </span>
    </div>
  );
}

function BayView({ sc, rows }: { sc: Scene; rows: Row[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const mine = rows.filter((r) => r.next === "you");
  // stalled first, then the most recent move
  const theirs = rows
    .filter((r) => r.next === "them")
    .sort(
      (a, b) =>
        Number(b.state === "stalled") - Number(a.state === "stalled") ||
        Number(b.id === "limit") - Number(a.id === "limit"),
    );
  const stalled = theirs.filter((r) => r.state === "stalled").length;
  useFlip(
    listRef,
    `${mine.map((r) => r.id).join()}|${theirs.map((r) => r.id).join()}`,
  );

  const strip = (r: Row, i: number) => (
    <li
      key={r.id}
      data-flip={r.id}
      data-tour={`row-${r.id}`}
      data-aim="0.4 0.5"
      className={s.row}
      data-sel={sc.sel === r.id || sc.open === r.id || undefined}
      data-hover={sc.hover === r.id || undefined}
      style={{ "--i": i } as CSSProperties}
    >
      <Strip
        kind={r.kind}
        callsign={code(r.repo)}
        num={r.num}
        title={
          <>
            <span className={s.prio}>
              <PriorityTag p={sc.prio[r.id] ?? null} />
            </span>
            {r.title}
          </>
        }
        note={r.note}
        who={r.who}
        age={r.age}
        quiet={r.next === "them" ? (r.quiet ?? null) : null}
        state={r.state}
        sample
      />
    </li>
  );

  return (
    <>
      <div className={s.head}>
        <p className={s.headTitle}>Your bay</p>
        <span className={s.headCount}>
          <PrintText
            value={String(mine.length)}
            length={1}
            label={`${mine.length}`}
          />{" "}
          on you
        </span>
        <span className={s.headCount}>
          <PrintText
            value={String(theirs.length)}
            length={1}
            label={`${theirs.length}`}
          />{" "}
          on them
        </span>
        {stalled > 0 && (
          <span className={`${s.headCount} ${s.headStalled}`}>
            {stalled} stalled
          </span>
        )}
        <span className={s.sync} data-on={sc.syncing || undefined}>
          <RefreshCw size={13} strokeWidth={2} />
          {sc.syncing ? "Syncing…" : "Synced just now"}
        </span>
      </div>
      <div ref={listRef} className={s.list}>
        <Bay
          name="Your move"
          which="you"
          as="div"
          count={
            <PrintText
              value={String(mine.length)}
              length={1}
              label={`${mine.length}`}
            />
          }
          hint="Someone answered or asked."
        >
          <ul className={s.rack}>{mine.map(strip)}</ul>
        </Bay>
        <Bay
          name="Their move"
          which="them"
          as="div"
          count={
            <PrintText
              value={String(theirs.length)}
              length={1}
              label={`${theirs.length}`}
            />
          }
          hint={`Stalled after ${STALL} days of quiet.`}
        >
          <ul className={s.rack}>
            {theirs.map((r, i) => strip(r, mine.length + i))}
          </ul>
        </Bay>
      </div>
    </>
  );
}

function Drawer({ sc, rows }: { sc: Scene; rows: Row[] }) {
  const r = rows.find((x) => x.id === (sc.open ?? "limit"))!;
  const p = sc.prio[r.id] ?? null;
  return (
    <aside className={s.drawer} data-open={!!sc.open || undefined}>
      <div className={s.drawerTop}>
        <span className={s.drawerCode}>{code(r.repo)}</span>
        <span className={s.drawerRef}>
          <span>{r.repo}</span>
          <span>#{r.num} · Pull request</span>
        </span>
      </div>
      <p className={s.drawerTitle}>{r.title}</p>
      <p className={s.drawerStatus} data-tone={r.tone}>
        <StateMark state={r.tone} />
        {r.status}
      </p>
      <p className={s.drawerReason}>
        {r.next === "you"
          ? "@mara-k asked for changes 5 hours ago. The next word is yours."
          : "You answered. The next word is @mara-k's."}
      </p>
      <div className={s.drawerActions}>
        <span className={s.drawerOpen} data-tour="github">
          Open on GitHub
          <ArrowUpRight size={15} />
        </span>
        <span className={s.drawerBtn}>
          <Pin size={14} />
          Pin
        </span>
        <span className={s.drawerBtn}>
          <AlarmClock size={14} />
          Snooze
        </span>
      </div>
      <div className={s.drawerPrio}>
        <span className={s.drawerLabel}>Priority</span>
        <span className={s.prioWrap}>
          <span
            className={s.prioTrigger}
            data-tour="prio"
            data-set={p !== null || undefined}
            key={p ?? "none"}
          >
            <PriorityTag p={p} full />
            {p === null && <span className={s.prioNone}>Set priority</span>}
          </span>
          {sc.menu && (
            <span className={s.menu}>
              {([1, 2, 3] as Prio[]).map((n) => (
                <span key={n} className={s.menuItem} data-tour={`prio-${n}`}>
                  <PriorityTag p={n} />
                  <span className={s.menuText}>
                    <strong>{PRIOS[n].label}</strong>
                    <span>{PRIOS[n].hint}</span>
                  </span>
                </span>
              ))}
            </span>
          )}
        </span>
      </div>
      <dl className={s.facts}>
        <div>
          <dt>Last word</dt>
          <dd>
            {r.next === "you"
              ? "@mara-k, 5 hours ago"
              : "@sample-dev, just now"}
          </dd>
        </div>
        <div>
          <dt>Checks</dt>
          <dd>Passing</dd>
        </div>
        <div>
          <dt>Review</dt>
          <dd>{r.next === "you" ? "Changes requested" : "Re-requested"}</dd>
        </div>
      </dl>
    </aside>
  );
}

const COLS: { id: string; title: string; state: StripState }[] = [
  { id: "inbox", title: "Inbox", state: "idle" },
  { id: "next", title: "Up next", state: "them" },
  { id: "doing", title: "Working on", state: "you" },
  { id: "waiting", title: "Waiting", state: "them" },
];

function PlanView({ sc, rows }: { sc: Scene; rows: Row[] }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const cols: Record<string, string[]> = {
    inbox: ["dns", "json"].filter((id) => !sc.doing.includes(id)),
    next: ["guards"],
    doing: sc.doing,
    waiting: ["limit", "cache", "panic"],
  };
  useFlip(boardRef, JSON.stringify(cols));
  const pick = sc.doing.includes("dns")
    ? {
        r: byId.dns,
        why: "You're working on it, and it's your move. Review asked.",
      }
    : { r: byId.guards, why: "Top of Up next." };

  return (
    <>
      <div className={s.head}>
        <p className={s.headTitle}>Plan</p>
        <span className={s.headNote}>Your plan stays in this browser.</span>
      </div>
      <div className={s.next} key={pick.r.id}>
        <span className={s.nextLabel}>Work on next</span>
        <span className={s.nextBody}>
          <span className={s.nextRef}>
            <span className={s.chip}>{code(pick.r.repo)}</span>
            {pick.r.repo}#{pick.r.num}
          </span>
          <span className={s.nextTitle}>{pick.r.title}</span>
          <span className={s.nextWhy}>{pick.why}</span>
        </span>
      </div>
      <div ref={boardRef} className={s.board}>
        {COLS.map((c) => (
          <div
            key={c.id}
            className={s.col}
            data-col={c.id}
            data-tour={`col-${c.id}`}
            data-aim="0.5 0.42"
          >
            <p className={s.colHead}>
              <StatusIcon state={c.state} />
              {c.title}
              <span className={s.colCount}>{cols[c.id].length}</span>
            </p>
            <ul className={s.cards}>
              {cols[c.id].map((id) => (
                <li
                  key={id}
                  // a card dropped into a new column settles where it lands instead of sliding from where it was
                  data-flip={
                    id === "dns" && sc.doing.includes("dns")
                      ? "dns-dropped"
                      : id
                  }
                  data-tour={`card-${id}`}
                  data-aim="0.35 0.3"
                  className={s.cardSlot}
                  data-lifted={sc.drag === id || undefined}
                  data-landed={
                    id === "dns" && sc.doing.includes("dns") ? "" : undefined
                  }
                >
                  <Card r={byId[id]} p={sc.prio[id] ?? null} />
                </li>
              ))}
              {cols[c.id].length === 0 && (
                <li className={s.colEmpty}>
                  {sc.drag ? "Drop it here" : "Keep it to one or two."}
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}

function Card({ r, p }: { r: Row; p: Prio | null }) {
  return (
    <span className={s.card}>
      <span className={s.cardTop}>
        <span className={s.chip}>{code(r.repo)}</span>
        <span className={s.cardRef}>
          {r.repo.split("/")[1]}#{r.num}
        </span>
        <PriorityTag p={p} />
      </span>
      <span className={s.cardTitle}>{r.title}</span>
      <span className={s.cardState}>
        <StatusIcon state={r.state} />
        {r.state === "you"
          ? "Your move"
          : r.state === "stalled"
            ? `Stalled ${r.quiet}d`
            : "Their move"}
      </span>
    </span>
  );
}

/* ---------- the tour ---------- */

type Aim = { x: number; y: number; ms: number };

export function Tour() {
  const ref = useRef<HTMLElement>(null);
  const runRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const winRef = useRef<HTMLDivElement>(null);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const motion = useMotion();
  const [step, setStep] = useState(0);
  const [aim, setAim] = useState<Aim | null>(null);
  const current = useRef(0);

  // With motion off nothing is pinned or scrubbed: a chapter shows how it ends, and the first one shows the bay.
  const shown = motion ? step : LAST[STEPS[step].ch];
  const st = STEPS[shown];
  const sc = SCENES[shown];
  const ch = st.ch;
  const rows = useMemo(() => rowsOf(sc), [sc]);

  useSectionFace(ref, sc.face);

  // The window pins while the runway scrolls under it. How far along the runway the page is picks the step,
  // and fills each chapter's bar; scrolling back runs the morning backwards.
  useEffect(() => {
    const run = runRef.current;
    const frame = frameRef.current;
    if (!motion || !run || !frame) return;
    return onScrollFrame(() => {
      const p = pinned(run, frame);
      return () => {
        const t = p * TOTAL;
        bars.current.forEach((el, c) => {
          if (el)
            el.style.transform = `scaleX(${ramp(CH_START[c], CH_START[c] + LENGTH[c], t).toFixed(4)})`;
        });
        const i = stepAt(p);
        if (i !== current.current) {
          current.current = i;
          setStep(i);
        }
      };
    });
  }, [motion]);

  // The pointer heads for the step's target, measured where the window has just drawn it.
  const measure = useCallback((to: string, ms: number) => {
    const win = winRef.current;
    if (!win) return;
    const el = Array.from(
      win.querySelectorAll<HTMLElement>(`[data-tour="${to}"]`),
    ).find((e) => e.getBoundingClientRect().width > 0);
    if (!el) return;
    const a = win.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const [fx, fy] = (el.dataset.aim ?? "0.5 0.55").split(" ").map(Number);
    setAim({
      x: r.left - a.left + r.width * fx,
      y: r.top - a.top + r.height * fy,
      ms,
    });
  }, []);

  // Before its first target the pointer rests low on the window, out of the way.
  const rest = useCallback(() => {
    const win = winRef.current;
    if (win)
      setAim({
        x: win.clientWidth * 0.62,
        y: win.clientHeight * 0.86,
        ms: 360,
      });
  }, []);

  useLayoutEffect(() => {
    if (!motion) return;
    const j = AIM_AT[shown];
    if (j < 0) rest();
    else measure(STEPS[j].to!, Math.min(560, STEPS[j].ms * 0.8));
  }, [motion, shown, measure, rest]);

  // A resized window moves the targets; the pointer follows without a trip.
  useEffect(() => {
    const win = winRef.current;
    if (!win) return;
    const ro = new ResizeObserver(() => {
      const j = AIM_AT[current.current];
      if (j < 0) rest();
      else measure(STEPS[j].to!, 0);
    });
    ro.observe(win);
    return () => ro.disconnect();
  }, [measure, rest]);

  // Picking a chapter scrolls to where it starts; with motion off it just shows how that chapter ends.
  const jump = (c: number) => {
    const run = runRef.current;
    const frame = frameRef.current;
    if (!motion || !run || !frame) {
      setStep(LAST[c]);
      return;
    }
    window.scrollTo({
      top: pinnedScrollY(run, frame, (CH_START[c] + 1) / TOTAL),
      behavior: "smooth",
    });
  };

  const press = st.click;

  return (
    <section
      ref={ref}
      id="tour"
      className={sec.section}
      aria-labelledby="tour-title"
    >
      <SectionHead id="tour-title" title="A morning in Spool, start to finish.">
        Scroll to watch someone sign on, work down their bay from the keyboard,
        answer a review, catch a thread that went quiet and line up the week.
        Every click is something the app does. Pick a chapter to jump to it.
      </SectionHead>

      <div ref={runRef} className={s.runway} data-pin={motion || undefined}>
        <div ref={frameRef} className={s.frame}>
          <div className={s.stage}>
            <div
              ref={winRef}
              className={s.window}
              data-view={sc.view}
              aria-hidden="true"
              inert
              data-shine
            >
              {/* the sidebar, drawn as the app draws it */}
              <aside className={s.side}>
                <div className={s.workspace}>
                  <span className={s.face}>
                    <PrintText
                      value={sc.face}
                      length={5}
                      decorative
                      opts={{ speed: 34 }}
                    />
                  </span>
                  <span className={s.wsName}>Spool</span>
                  <ChevronDown size={14} className={s.wsCaret} />
                </div>
                <ul className={s.nav}>
                  {NAV.slice(0, 5).map((n, i) => (
                    <li
                      key={n.href}
                      data-on={
                        (i === 0 && sc.view !== "plan") ||
                        (i === 1 && sc.view === "plan") ||
                        undefined
                      }
                      data-tour={i === 1 ? "nav-plan" : undefined}
                      data-aim="0.3 0.5"
                    >
                      <n.icon size={15} strokeWidth={1.8} />
                      <span>{n.label}</span>
                      {i === 0 &&
                        sc.view !== "connect" &&
                        sc.view !== "loading" && (
                          <span className={s.navCount}>
                            {rows.filter((r) => r.next === "you").length}
                          </span>
                        )}
                    </li>
                  ))}
                </ul>
                <p className={s.sideHead}>Your repos</p>
                <ul className={s.repos}>
                  {Object.entries(THREADS).map(([id, t]) => (
                    <li key={id}>
                      <span className={s.repoCode}>{code(t.repo)}</span>
                      <span className={s.repoName}>{carrier(t.repo).name}</span>
                    </li>
                  ))}
                </ul>
              </aside>

              <div className={s.main}>
                {/* on a phone the sidebar folds into two tabs */}
                <div className={s.tabs}>
                  <span data-on={sc.view !== "plan" || undefined}>Bay</span>
                  <span
                    data-on={sc.view === "plan" || undefined}
                    data-tour="nav-plan"
                    data-aim="0.5 0.5"
                  >
                    Plan
                  </span>
                </div>
                <div
                  className={s.pane}
                  key={sc.view === "loading" ? "connect" : sc.view}
                >
                  {sc.view === "connect" && <Connect sc={sc} />}
                  {sc.view === "loading" && <Loading sc={sc} />}
                  {sc.view === "bay" && <BayView sc={sc} rows={rows} />}
                  {sc.view === "plan" && <PlanView sc={sc} rows={rows} />}
                </div>
                {sc.view === "bay" && <Drawer sc={sc} rows={rows} />}

                {sc.skip && (
                  <span className={s.skip} key={sc.skip}>
                    <Clock3 size={14} />
                    {sc.skip}
                  </span>
                )}
                {sc.toast && (
                  <span className={s.toast} key={sc.toast}>
                    <ArrowUpRight size={14} />
                    {sc.toast}
                  </span>
                )}
              </div>

              {motion && st.key && (
                <span className={s.keys} key={shown}>
                  <kbd>{st.key[0]}</kbd>
                  {st.key[1]}
                </span>
              )}

              {motion && aim && (
                <span
                  className={s.cursor}
                  data-press={sc.drag ? "hold" : undefined}
                  style={
                    {
                      transform: `translate3d(${aim.x}px, ${aim.y}px, 0)`,
                      "--move": `${aim.ms}ms`,
                    } as CSSProperties
                  }
                >
                  {press === "tap" && (
                    <span className={s.ripple} key={`r${shown}`} />
                  )}
                  {sc.drag && (
                    <span className={s.ghost}>
                      <Card
                        r={rows.find((r) => r.id === sc.drag)!}
                        p={sc.prio[sc.drag] ?? null}
                      />
                    </span>
                  )}
                  {/* on a phone the pointer is a fingertip */}
                  <span
                    className={s.touch}
                    key={`t${shown}`}
                    data-tap={press === "tap" || undefined}
                  />
                  <svg
                    className={s.arrow}
                    key={`a${shown}`}
                    data-tap={press === "tap" || undefined}
                    viewBox="0 0 20 22"
                  >
                    <path d="M3 2.2v15.6l4.3-4.1 2.7 6.3 2.8-1.2-2.7-6.2h6z" />
                  </svg>
                </span>
              )}
            </div>
          </div>

          <div className={s.chapters}>
            <ol className={s.chapterList}>
              {CHAPTERS.map((c, i) => (
                <li key={c.title}>
                  <button
                    type="button"
                    className={s.chapter}
                    aria-current={i === ch ? "step" : undefined}
                    onClick={() => jump(i)}
                  >
                    <span className={s.bar}>
                      <span
                        ref={(el) => {
                          bars.current[i] = el;
                        }}
                        className={s.barFill}
                        style={
                          motion
                            ? undefined
                            : { transform: `scaleX(${i <= ch ? 1 : 0})` }
                        }
                      />
                    </span>
                    <span className={s.chapterTitle}>{c.title}</span>
                    <span className={s.chapterBody}>{c.body}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
