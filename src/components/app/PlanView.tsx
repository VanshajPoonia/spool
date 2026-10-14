"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDownWideNarrow, ArrowUpRight, CircleDot, Eye, GitPullRequest, GripVertical, MoreHorizontal, NotebookPen, Plus, X } from "lucide-react";
import { PrintText } from "@/components/print/PrintText";
import { Callsign, StateMark } from "@/components/kit/Kit";
import { ago } from "@/lib/classify";
import {
  buildCards,
  byColumn,
  COLS,
  placementsFor,
  PRIOS,
  prioRank,
  suggest,
  type Card,
  type Col,
  type Prio,
  type WatchInput,
} from "@/lib/plan";
import { sampleWatched } from "@/lib/sample-board";
import { addTask, placeCards, planStoreFor, removeCards, showHidden, useAuth, useMeta, watchCacheStore, type PlanStore } from "@/lib/store";
import { watchKey } from "@/lib/watch";
import { useBoard } from "./BoardProvider";
import { PriorityMenu, PriorityTag } from "./Priority";
import { ThreadDetail } from "./ThreadDetail";
import p from "./page.module.css";
import s from "./plan.module.css";

type Keys = Record<Col, string[]>;

const COL_IDS = COLS.map((c) => c.id);
const COL_TITLE = Object.fromEntries(COLS.map((c) => [c.id, c.title])) as Record<Col, string>;
const DONE_SHOWN = 6;

/* Drags start anywhere on a card except its buttons and links; the grip is the exception, it's made for dragging. */
function startsDrag(target: EventTarget | null) {
  const el = (target as Element | null)?.closest?.("a, button, input, textarea, select, [role=menu]");
  return !el || el.hasAttribute("data-grip");
}

class CardMouseSensor extends MouseSensor {
  static activators = [
    { eventName: "onMouseDown" as const, handler: ({ nativeEvent: e }: ReactMouseEvent) => e.button === 0 && startsDrag(e.target) },
  ];
}

class CardTouchSensor extends TouchSensor {
  static activators = [{ eventName: "onTouchStart" as const, handler: ({ nativeEvent: e }: ReactTouchEvent) => startsDrag(e.target) }];
}

const keysOf = (cols: Record<Col, Card[]>): Keys => ({
  inbox: cols.inbox.map((c) => c.key),
  next: cols.next.map((c) => c.key),
  doing: cols.doing.map((c) => c.key),
  waiting: cols.waiting.map((c) => c.key),
  done: cols.done.map((c) => c.key),
});

const colOf = (keys: Keys, id: string): Col | null => {
  if (id.startsWith("col:")) return id.slice(4) as Col;
  return (Object.keys(keys) as Col[]).find((c) => keys[c].includes(id)) ?? null;
};

export function PlanView() {
  const { mode, threads, login, now, codeFor } = useBoard();
  const auth = useAuth();
  const meta = useMeta();
  const cache = watchCacheStore.use();
  const st = planStoreFor(mode === "sample");
  const plan = st.use();
  const [detail, setDetail] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [doneAll, setDoneAll] = useState(false);

  // Watched issues come with whatever Discover last learned about them; the plan never spends GitHub calls of its own.
  const who = mode === "live" ? (auth?.login ?? null) : mode === "guest" ? "guest" : null;
  const watch: WatchInput[] = useMemo(() => {
    if (mode === "sample") return sampleWatched(now || undefined).map(({ item, issue }) => ({ key: watchKey(item.repo, item.number), item, issue }));
    const issues = cache.who === who ? cache.issues : {};
    return Object.entries(meta.watch).map(([key, item]) => ({ key, item, issue: key in issues ? issues[key] : undefined }));
  }, [mode, now, cache, who, meta.watch]);

  const cards = useMemo(() => buildCards({ threads, watch, me: login, plan }), [threads, watch, login, plan]);
  const cols = useMemo(() => byColumn(cards), [cards]);
  const byKey = useMemo(() => new Map(cards.map((c) => [c.key, c])), [cards]);
  const next = useMemo(() => suggest(cols), [cols]);

  /* ---------- dragging ---------- */

  const [drag, setDrag] = useState<Keys | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const shown = drag ?? keysOf(cols);
  const sensors = useSensors(
    useSensor(CardMouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(CardTouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
  );

  const onStart = ({ active: a }: DragStartEvent) => {
    setActive(String(a.id));
    setDrag(keysOf(cols));
  };

  // Crossing into another column moves the card there right away, so the column opens a gap for it.
  const onOver = ({ active: a, over }: DragOverEvent) => {
    if (!over || !drag) return;
    const id = String(a.id);
    const from = colOf(drag, id);
    const to = colOf(drag, String(over.id));
    if (!from || !to || from === to) return;
    setDrag((d) => {
      if (!d) return d;
      const target = d[to].filter((k) => k !== id);
      const at = String(over.id).startsWith("col:") ? target.length : Math.max(0, target.indexOf(String(over.id)));
      target.splice(at, 0, id);
      return { ...d, [from]: d[from].filter((k) => k !== id), [to]: target };
    });
  };

  const onEnd = ({ active: a, over }: DragEndEvent) => {
    const id = String(a.id);
    const d = drag;
    setActive(null);
    setDrag(null);
    if (!d || !over) return;
    const col = colOf(d, id);
    if (!col) return;
    let list = d[col];
    const overId = String(over.id);
    if (!overId.startsWith("col:") && list.includes(overId)) list = arrayMove(list, list.indexOf(id), list.indexOf(overId));
    commit(col, list, id);
  };

  const isPlaced = (k: string) => !!byKey.get(k)?.placed;
  const commit = (col: Col, list: string[], moved: string) => placeCards(st, placementsFor(col, list, isPlaced, list.indexOf(moved)));

  const moveTo = (key: string, col: Col) => commit(col, [key, ...shown[col].filter((k) => k !== key)], key);

  /* Keyboard: arrow keys on a card's grip move it one step, left and right between columns, up and down within one. */
  const [said, setSaid] = useState("");
  const refocus = useRef<string | null>(null);
  useEffect(() => {
    if (!refocus.current) return;
    document.querySelector<HTMLElement>(`button[data-grip][data-key="${window.CSS.escape(refocus.current)}"]`)?.focus();
    refocus.current = null;
  });
  const nudge = (key: string, e: ReactKeyboardEvent) => {
    const dir = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const col = colOf(shown, key);
    const card = byKey.get(key);
    if (!col || !card) return;
    const list = shown[col];
    const i = list.indexOf(key);
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const j = i + dir;
      if (j < 0 || j >= list.length) return setSaid(`${card.title} is already ${dir < 0 ? "at the top" : "at the bottom"} of ${COL_TITLE[col]}.`);
      commit(col, arrayMove(list, i, j), key);
      setSaid(`${card.title}: position ${j + 1} of ${list.length} in ${COL_TITLE[col]}.`);
    } else {
      const to = COL_IDS[COL_IDS.indexOf(col) + dir];
      if (!to) return setSaid(`${card.title} is already in the ${dir < 0 ? "first" : "last"} column.`);
      const target = shown[to].filter((k) => k !== key);
      target.splice(Math.min(i, target.length), 0, key);
      commit(to, target, key);
      setSaid(`${card.title} moved to ${COL_TITLE[to]}, position ${target.indexOf(key) + 1} of ${target.length}.`);
    }
    refocus.current = key;
  };

  const sortByPriority = () => {
    const entries = (Object.keys(cols) as Col[]).flatMap((col) => {
      const list = cols[col]
        .map((c, i) => ({ c, i }))
        .sort((x, y) => prioRank(x.c.prio) - prioRank(y.c.prio) || x.i - y.i)
        .map(({ c }) => c);
      const lastSet = list.reduce((m, c, i) => (c.prio ? i : m), -1);
      return placementsFor(
        col,
        list.map((c) => c.key),
        isPlaced,
        lastSet,
      );
    });
    placeCards(st, entries);
  };

  const announcements: Announcements = {
    onDragStart: ({ active: a }) => `Picked up ${byKey.get(String(a.id))?.title ?? "card"}.`,
    onDragOver: ({ active: a, over }) => {
      if (!over || !drag) return undefined;
      const col = colOf(drag, String(a.id));
      return col ? `${byKey.get(String(a.id))?.title ?? "Card"} is in ${COL_TITLE[col]}, position ${drag[col].indexOf(String(a.id)) + 1} of ${drag[col].length}.` : undefined;
    },
    onDragEnd: ({ active: a, over }) => {
      const col = drag ? colOf(drag, String(a.id)) : null;
      return over && col ? `Dropped ${byKey.get(String(a.id))?.title ?? "card"} in ${COL_TITLE[col]}.` : "Move cancelled.";
    },
    onDragCancel: () => "Move cancelled. The card is back where it was.",
  };

  const selected = detail ? threads.find((t) => t.id === detail) ?? null : null;
  const hidden = Object.keys(plan.hidden).length;
  const doneKeys = shown.done;
  const prioCount = cards.filter((c) => c.prio && c.col !== "done").length;

  return (
    <div className={p.page}>
      <div className={p.head}>
        <div>
          <h1 className={p.h1}>Plan</h1>
          <p className={p.lede}>
            Line up your open source work and give each thing a priority. Drag cards between columns, or use the menu on each card. Your
            plan stays in this browser.
          </p>
        </div>
        <div className={s.headTools}>
          {mode === "sample" && <span className={p.tag}>Sample plan</span>}
          <button type="button" className={p.btn} onClick={sortByPriority} disabled={!prioCount} title="Put P1 cards at the top of each column, then P2, then P3">
            <ArrowDownWideNarrow size={15} aria-hidden="true" />
            Sort by priority
          </button>
          <button type="button" className={`${p.btn} ${p.btnSign}`} onClick={() => setAdding((a) => !a)} aria-expanded={adding}>
            <Plus size={15} aria-hidden="true" />
            Add a task
          </button>
        </div>
      </div>

      {adding && <AddTask st={st} onClose={() => setAdding(false)} />}

      <NextUp next={next} codeFor={codeFor} onStart={(k) => moveTo(k, "doing")} onDetail={setDetail} />

      {mode === "guest" && (
        <p className={s.guest}>
          Your PRs and issues join the plan once you <Link href="/board/settings">connect GitHub</Link>. Watched issues and your own tasks
          work without a token.
        </p>
      )}
      {mode === "sample" && <p className={s.guest}>This plan is invented to go with the sample board. Changes last until you leave the page.</p>}

      <DndContext
        id="spool-plan"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onStart}
        onDragOver={onOver}
        onDragEnd={onEnd}
        onDragCancel={() => {
          setActive(null);
          setDrag(null);
        }}
        accessibility={{ announcements }}
      >
        <p id="plan-keys" className="sr-only">
          Arrow keys move this card: left and right between columns, up and down within one. The card&rsquo;s menu can move it too.
        </p>
        <p className="sr-only" aria-live="polite">
          {said}
        </p>
        <div className={s.board}>
          {COLS.map((c) => {
            // While a card is moving, Done shows everything, so a card dropped at its end can't vanish.
            const keys = c.id === "done" && !doneAll && !drag ? doneKeys.slice(0, DONE_SHOWN) : shown[c.id];
            return (
              <Column
                key={c.id}
                col={c.id}
                title={c.title}
                sub={c.sub}
                count={shown[c.id].length}
                keys={keys}
                empty={emptyFor(c.id, mode)}
                foot={
                  c.id === "done" && doneKeys.length > 0 ? (
                    <div className={s.doneFoot}>
                      {doneKeys.length > DONE_SHOWN && (
                        <button type="button" onClick={() => setDoneAll((v) => !v)}>
                          {doneAll ? "Show fewer" : `Show all ${doneKeys.length}`}
                        </button>
                      )}
                      <button type="button" onClick={() => removeCards(st, doneKeys)} title="Delete your done tasks and take finished threads off the plan">
                        Clear done
                      </button>
                    </div>
                  ) : null
                }
              >
                {keys.map((k) => {
                  const card = byKey.get(k);
                  return card ? (
                    <SortableCard key={k} card={card} col={c.id} st={st} now={now} code={card.repo ? codeFor(card.repo) : undefined} onMove={moveTo} onNudge={nudge} onDetail={setDetail} />
                  ) : null;
                })}
              </Column>
            );
          })}
        </div>
        <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
          {active && byKey.get(active) ? (
            <div className={s.lifted}>
              <CardBody card={byKey.get(active)!} st={st} now={now} code={byKey.get(active)!.repo ? codeFor(byKey.get(active)!.repo!) : undefined} grip={<span className={s.grip} data-grip>
                <GripVertical size={16} aria-hidden="true" />
              </span>} menu={null} onDetail={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {hidden > 0 && (
        <p className={s.hiddenNote}>
          {hidden === 1 ? "1 card is" : `${hidden} cards are`} off the plan.{" "}
          <button type="button" onClick={() => showHidden(st)}>
            Bring {hidden === 1 ? "it" : "them"} back
          </button>
        </p>
      )}

      {selected && <ThreadDetail key={selected.id} t={selected} code={codeFor(selected.repo)} mode={mode} now={now} onClose={() => setDetail(null)} />}
    </div>
  );
}

function emptyFor(col: Col, mode: string) {
  if (col === "inbox") return mode === "guest" ? "Watch an issue in Discover, or add a task." : "Nothing new to sort.";
  if (col === "next") return "Drag what you'll pick up next here.";
  if (col === "doing") return "Nothing in progress.";
  if (col === "waiting") return "Nothing waiting on anyone.";
  return "Finished work lands here.";
}

/* ---------- what to work on now ---------- */

function NextUp({
  next,
  codeFor,
  onStart,
  onDetail,
}: {
  next: ReturnType<typeof suggest>;
  codeFor: (repo: string) => string | undefined;
  onStart: (key: string) => void;
  onDetail: (id: string) => void;
}) {
  if (!next) {
    return (
      <section className={s.nextUp} data-empty="">
        <span className={s.nextSign}>Work on next</span>
        <p className={s.nextEmpty}>Give something a priority or drag it to Up next, and Spool will point at it here.</p>
      </section>
    );
  }
  const { card, why } = next;
  return (
    <section className={s.nextUp} aria-label="Work on next">
      <span className={s.nextSign}>Work on next</span>
      <div className={s.nextWhat}>
        <div className={s.nextRef}>
          {card.repo ? <Callsign repo={card.repo} size="sm" code={codeFor(card.repo)} /> : <span className={s.taskTag}>Task</span>}
          {card.repo && (
            <span className={s.nextRepo}>
              {card.repo}#{card.num}
            </span>
          )}
          {card.prio && <PriorityTag p={card.prio} full />}
        </div>
        <h2 className={s.nextTitle}>{card.title}</h2>
        <p className={s.nextWhy}>
          {why}
          {card.status ? ` ${card.status}.` : ""}
        </p>
      </div>
      <div className={s.nextActions}>
        {card.col !== "doing" && (
          <button type="button" className={`${p.btn} ${p.btnSign}`} onClick={() => onStart(card.key)}>
            Start it
          </button>
        )}
        {card.threadId ? (
          <button type="button" className={p.btn} onClick={() => onDetail(card.threadId!)}>
            Details
          </button>
        ) : null}
        {card.url && (
          <a className={p.btn} href={card.url} target="_blank" rel="noreferrer">
            Open <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        )}
      </div>
    </section>
  );
}

/* ---------- columns and cards ---------- */

function Column({ col, title, sub, count, keys, empty, foot, children }: { col: Col; title: string; sub: string; count: number; keys: string[]; empty: string; foot: ReactNode; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${col}` });
  return (
    <section className={s.col} data-col={col} data-over={isOver || undefined} aria-labelledby={`plan-${col}`}>
      <header className={s.colHead}>
        <div>
          <h2 id={`plan-${col}`}>{title}</h2>
          <p>{sub}</p>
        </div>
        <PrintText value={String(count)} length={2} align="right" style={{ fontSize: "17px" }} label={`${count}`} tone={col === "doing" && count > 2 ? "wait" : undefined} />
      </header>
      <SortableContext id={col} items={keys} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className={s.list}>
          {children}
          {keys.length === 0 && <li className={s.empty}>{empty}</li>}
        </ul>
      </SortableContext>
      {foot}
    </section>
  );
}

function SortableCard({
  card,
  col,
  st,
  now,
  code,
  onMove,
  onNudge,
  onDetail,
}: {
  card: Card;
  col: Col;
  st: PlanStore;
  now: number;
  code?: string;
  onMove: (key: string, col: Col) => void;
  onNudge: (key: string, e: ReactKeyboardEvent) => void;
  onDetail: (id: string) => void;
}) {
  // Pointer dragging comes from dnd-kit; the keyboard path is onNudge on the grip.
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.key, disabled: card.finished });
  return (
    <li
      ref={setNodeRef}
      className={s.slot}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-dragging={isDragging || undefined}
      {...listeners}
    >
      <CardBody
        card={card}
        st={st}
        now={now}
        code={code}
        onDetail={onDetail}
        grip={
          card.finished ? (
            <span className={s.gripOff} title="Finished on GitHub, so it stays in Done" />
          ) : (
            <button
              type="button"
              className={s.grip}
              data-grip
              data-key={card.key}
              onKeyDown={(e) => onNudge(card.key, e)}
              aria-label={`Move ${card.title}, in ${COL_TITLE[col]}`}
              aria-describedby="plan-keys"
            >
              <GripVertical size={16} aria-hidden="true" />
            </button>
          )
        }
        menu={<CardMenu card={card} col={col} st={st} onMove={onMove} onDetail={onDetail} />}
      />
    </li>
  );
}

const KIND: Record<Card["kind"], { icon: typeof GitPullRequest; word: string }> = {
  pr: { icon: GitPullRequest, word: "PR" },
  issue: { icon: CircleDot, word: "Issue" },
  watch: { icon: Eye, word: "Watched" },
  task: { icon: NotebookPen, word: "Task" },
};

function CardBody({
  card,
  st,
  now,
  code,
  grip,
  menu,
  onDetail,
}: {
  card: Card;
  st: PlanStore;
  now: number;
  code?: string;
  grip: ReactNode;
  menu: ReactNode;
  onDetail: (id: string) => void;
}) {
  const K = KIND[card.kind];
  const title = card.threadId ? (
    <button type="button" className={s.title} onClick={() => onDetail(card.threadId!)}>
      {card.title}
    </button>
  ) : card.url ? (
    <a className={s.title} href={card.url} target="_blank" rel="noreferrer" draggable={false}>
      {card.title}
    </a>
  ) : (
    <span className={s.title}>{card.title}</span>
  );
  return (
    <article className={s.card} data-kind={card.kind} data-finished={card.finished || undefined} data-prio={card.prio ?? undefined}>
      <div className={s.cardTop}>
        {grip}
        {card.repo ? <Callsign repo={card.repo} size="sm" code={code} /> : <span className={s.taskTag}>Task</span>}
        <span className={s.ref} title={card.repo ? `${card.repo}#${card.num}` : undefined}>
          {card.repo ? `${card.repo.split("/")[1]}#${card.num}` : ""}
        </span>
        <PriorityMenu st={st} k={card.key} p={card.prio} label={card.title} />
        {menu}
      </div>
      {title}
      {card.status && (
        <div className={s.status} title={card.detail ?? undefined}>
          <StateMark state={card.lamp} />
          <span>{card.status}</span>
          {card.yourMove && <span className={s.move}>Your move</span>}
        </div>
      )}
      <div className={s.foot}>
        <K.icon size={13} aria-hidden="true" />
        <span>{K.word}</span>
        {card.at && now ? <span className={s.age}>{age(card, now)}</span> : null}
      </div>
    </article>
  );
}

function age(card: Card, now: number) {
  const a = ago(card.at!, now);
  const when = a === "now" ? "just now" : `${a} ago`;
  if (card.kind === "task") return `added ${when}`;
  if (card.kind === "watch") return `watched ${when}`;
  return `active ${when}`;
}

function CardMenu({ card, col, st, onMove, onDetail }: { card: Card; col: Col; st: PlanStore; onMove: (key: string, col: Col) => void; onDetail: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);
  const act = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };
  return (
    <div className={s.menuWrap} ref={ref}>
      <button type="button" className={s.more} aria-haspopup="menu" aria-expanded={open} aria-label={`More for ${card.title}`} onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className={s.menu} role="menu">
          {!card.finished && (
            <>
              <span className={s.menuLabel}>Move to</span>
              {COLS.filter((c) => c.id !== col).map((c) => (
                <button key={c.id} type="button" role="menuitem" onClick={act(() => onMove(card.key, c.id))}>
                  {c.title}
                </button>
              ))}
              <hr />
            </>
          )}
          {card.threadId && (
            <button type="button" role="menuitem" onClick={act(() => onDetail(card.threadId!))}>
              Details
            </button>
          )}
          {card.url && (
            <a role="menuitem" href={card.url} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
              Open on GitHub <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          )}
          <button type="button" role="menuitem" className={s.danger} onClick={act(() => removeCards(st, [card.key]))}>
            {card.kind === "task" ? "Delete task" : "Take off the plan"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- your own cards ---------- */

function AddTask({ st, onClose }: { st: PlanStore; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [col, setCol] = useState<Col>("next");
  const [prio, setPrioDraft] = useState<Prio | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setErr("Give the task a name.");
    let link: string | null = null;
    if (url.trim()) {
      try {
        const u = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);
        if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
        link = u.toString();
      } catch {
        return setErr("That link doesn't look like a web address.");
      }
    }
    addTask(st, { title: t.slice(0, 200), url: link }, col, prio);
    setTitle("");
    setUrl("");
    setPrioDraft(null);
    setErr(null);
    ref.current?.focus();
  };

  return (
    <form className={s.add} onSubmit={submit} onKeyDown={(e) => e.key === "Escape" && onClose()} noValidate>
      <div className={s.addFields}>
        <label className={s.field}>
          <span>Task</span>
          <input ref={ref} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Draft a GSoC proposal for quarry-db" maxLength={200} aria-invalid={err === "Give the task a name." || undefined} />
        </label>
        <label className={s.field}>
          <span>Link (optional)</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" />
        </label>
        <label className={s.field}>
          <span>Column</span>
          <select value={col} onChange={(e) => setCol(e.target.value as Col)}>
            {COLS.filter((c) => c.id !== "done").map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <div className={s.field} role="radiogroup" aria-label="Priority">
          <span>Priority</span>
          <div className={s.prioSeg}>
            {([null, 1, 2, 3] as (Prio | null)[]).map((n) => (
              <button key={n ?? 0} type="button" role="radio" aria-checked={prio === n} onClick={() => setPrioDraft(n)} title={n ? `${PRIOS[n].label}: ${PRIOS[n].hint}` : "No priority"}>
                {n ? PRIOS[n].short : "None"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className={s.addActions}>
        {err && (
          <p className={s.addErr} role="alert">
            {err}
          </p>
        )}
        <button type="button" className={p.btn} onClick={onClose}>
          <X size={15} aria-hidden="true" /> Close
        </button>
        <button type="submit" className={`${p.btn} ${p.btnSign}`} disabled={!title.trim()}>
          Add to {COL_TITLE[col]}
        </button>
      </div>
    </form>
  );
}
