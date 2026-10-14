"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, CheckCheck, ChevronDown, Keyboard, Search } from "lucide-react";
import { Callsign } from "@/components/kit/Kit";
import { Bay } from "@/components/kit/Strip";
import { PrintText } from "@/components/print/PrintText";
import type { Thread } from "@/lib/classify";
import { FACES } from "@/lib/faces";
import { prioRank, threadKey, type Prio } from "@/lib/plan";
import { planStoreFor, setPrio, snooze, togglePin, updateSettings, useMeta, useSettings } from "@/lib/store";
import { useBoard } from "./BoardProvider";
import { ThreadDetail } from "./ThreadDetail";
import { ThreadRow } from "./ThreadRow";
import s from "./board.module.css";

type Kind = "all" | "pr" | "issue";
type Only = "delayed" | "new" | null;

function Loader() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((x) => x + 1), 1300);
    return () => window.clearInterval(id);
  }, []);
  const words = ["FETCHING", "YOUR PRS", "ISSUES", "REVIEWS", "MENTIONS"];
  return (
    <div className={s.loader} role="status" aria-label="Loading your bay from GitHub">
      <span className={s.loaderStrip}>
        <PrintText value={words[i % words.length]} length={9} decorative />
      </span>
    </div>
  );
}

function Group({
  title,
  sub,
  which = "plain",
  items,
  empty,
  collapsible,
  defaultOpen = true,
  render,
  extra,
}: {
  title: string;
  sub: string;
  which?: "you" | "them" | "stalled" | "plain";
  items: Thread[];
  empty: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  render: (t: Thread) => React.ReactNode;
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Bay
      name={title}
      which={which}
      hint={sub}
      className={s.group}
      count={<PrintText value={String(items.length)} length={2} align="right" label={`${items.length}`} />}
      tools={
        <>
          {extra}
          {collapsible && (
            <button type="button" className={s.collapse} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              <ChevronDown size={18} aria-hidden="true" />
              <span className="sr-only">{open ? "Collapse" : "Expand"}</span>
            </button>
          )}
        </>
      }
    >
      {(!collapsible || open) && (items.length === 0 ? <p className={s.empty}>{empty}</p> : <ul className={s.rows}>{items.map(render)}</ul>)}
    </Bay>
  );
}

const SHORTCUTS: [string, string][] = [
  ["j / k", "Next / previous thread"],
  ["Enter", "Open details"],
  ["o", "Open on GitHub"],
  ["p", "Pin or unpin"],
  ["s", "Snooze until tomorrow"],
  ["1 2 3", "Priority P1, P2, P3"],
  ["0", "Clear the priority"],
  ["/", "Filter"],
  ["Shift E", "Mark everything seen"],
  ["Esc", "Close details"],
];

export function BoardView() {
  const { threads, fresh, loading, error, mode, now, refresh, seeAll, see, fetchedAt, codeFor } = useBoard();
  const meta = useMeta();
  const settings = useSettings();
  const planSt = planStoreFor(mode === "sample");
  const plan = planSt.use();
  const prioOf = useCallback((t: Thread): Prio | null => plan.prio[threadKey(t.id)] ?? null, [plan.prio]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [repo, setRepo] = useState<string | null>(null);
  const [only, setOnly] = useState<Only>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const isSnoozed = useCallback((id: string) => !!meta.snoozed[id] && Date.parse(meta.snoozed[id]) > now, [meta.snoozed, now]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return threads.filter(
      (t) =>
        (kind === "all" || t.kind === kind) &&
        (!repo || t.repo === repo) &&
        (only !== "delayed" || (t.next === "them" && t.tone === "wait")) &&
        (only !== "new" || fresh.has(t.id)) &&
        (!needle || `${t.title} ${t.repo} #${t.num} ${t.lastActor ?? ""} ${t.status}`.toLowerCase().includes(needle)),
    );
  }, [threads, q, kind, repo, only, fresh]);

  const groups = useMemo(() => {
    // Pins first, then the priority you gave it, then the group's own order.
    const pin = (a: Thread, b: Thread) => Number(!!meta.pins[b.id]) - Number(!!meta.pins[a.id]) || prioRank(prioOf(a)) - prioRank(prioOf(b));
    const live = filtered.filter((t) => !isSnoozed(t.id));
    const you = live
      .filter((t) => t.next === "you")
      .sort(
        (a, b) =>
          pin(a, b) ||
          (settings.youOrder === "oldest" ? a.lastAt.localeCompare(b.lastAt) : b.lastAt.localeCompare(a.lastAt)),
      );
    const them = live
      .filter((t) => t.next === "them")
      .sort((a, b) => pin(a, b) || Number(b.tone === "wait") - Number(a.tone === "wait") || b.quietDays - a.quietDays);
    const watch = live.filter((t) => t.next === "watch").sort((a, b) => pin(a, b) || b.lastAt.localeCompare(a.lastAt));
    const done = filtered.filter((t) => t.next === "done").sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));
    const snoozed = filtered.filter((t) => isSnoozed(t.id) && t.next !== "done");
    return { you, them, watch, done, snoozed };
  }, [filtered, meta.pins, isSnoozed, settings.youOrder, prioOf]);

  const order = useMemo(
    () => [...groups.you, ...groups.them, ...groups.watch, ...groups.snoozed, ...groups.done],
    [groups],
  );
  const selected = sel ? threads.find((t) => t.id === sel) ?? null : null;

  const repos = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of threads) if (t.next !== "done") m.set(t.repo, (m.get(t.repo) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [threads]);

  const select = useCallback(
    (t: Thread) => {
      setSel((cur) => (cur === t.id ? null : t.id));
      see(t);
    },
    [see],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
        if (e.key === "Escape") (el as HTMLInputElement).blur();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = sel ? order.findIndex((t) => t.id === sel) : -1;
      const go = (i: number) => {
        const t = order[Math.max(0, Math.min(order.length - 1, i))];
        if (!t) return;
        setSel(t.id);
        see(t);
        document.querySelector(`[data-id="${CSS.escape(t.id)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      };
      if (e.key === "j") go(idx + 1);
      else if (e.key === "k") go(idx < 0 ? 0 : idx - 1);
      else if (e.key === "Escape") setSel(null);
      else if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "?") setHelp((h) => !h);
      else if (e.key === "E" && e.shiftKey) seeAll();
      else if (selected) {
        if (e.key === "o") window.open(selected.url, "_blank", "noopener");
        else if (e.key === "p") togglePin(selected.id);
        else if (e.key === "s" && selected.next !== "done") snooze(selected.id, 1);
        else if (e.key === "Enter") setSel(selected.id);
        else if (e.key === "1" || e.key === "2" || e.key === "3") setPrio(planSt, threadKey(selected.id), Number(e.key) as Prio);
        else if (e.key === "0") setPrio(planSt, threadKey(selected.id), null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [order, sel, selected, see, seeAll, planSt]);

  const row = (t: Thread) => (
    <ThreadRow
      key={t.id}
      t={t}
      code={codeFor(t.repo)}
      now={now}
      fresh={fresh.has(t.id)}
      pinned={!!meta.pins[t.id]}
      snoozedUntil={meta.snoozed[t.id]}
      note={meta.notes[t.id]}
      prio={prioOf(t)}
      planSt={planSt}
      selected={sel === t.id}
      dim={!!sel && sel !== t.id}
      onSelect={select}
    />
  );

  const delayed = threads.filter((t) => t.next === "them" && t.tone === "wait" && !isSnoozed(t.id)).length;
  const filtering = !!(q || repo || only || kind !== "all");
  const youOrder = (
    <button
      type="button"
      className={s.order}
      onClick={() => updateSettings({ youOrder: settings.youOrder === "oldest" ? "newest" : "oldest" })}
      title="Change the order of threads on you"
    >
      <ArrowDownUp size={14} aria-hidden="true" />
      <span className={s.orderText}>{settings.youOrder === "oldest" ? "Longest waiting first" : "Newest first"}</span>
    </button>
  );
  const firstLoad = loading && threads.length === 0;

  return (
    <div className={s.page} data-detail={selected ? "" : undefined}>
      <div className={s.top}>
        <div className={s.tools}>
          <label className={s.search}>
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Filter threads</span>
            <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by title, repo, person" />
            <kbd>/</kbd>
          </label>
          <div className={s.seg} role="group" aria-label="Type">
            {(["all", "pr", "issue"] as Kind[]).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
                {k === "all" ? "All" : k === "pr" ? "PRs" : "Issues"}
              </button>
            ))}
          </div>
          <div className={s.quick} role="group" aria-label="Show only">
            <button type="button" aria-pressed={only === "delayed"} onClick={() => setOnly((o) => (o === "delayed" ? null : "delayed"))} disabled={!delayed && only !== "delayed"}>
              <span className={s.quickLamp} data-k="delayed" aria-hidden="true" />
              Stalled
              <PrintText value={String(delayed)} length={2} align="right" tone={delayed ? "stop" : "dim"} label={`${delayed}`} />
            </button>
            <button type="button" aria-pressed={only === "new"} onClick={() => setOnly((o) => (o === "new" ? null : "new"))} disabled={!fresh.size && only !== "new"}>
              <span className={s.quickLamp} data-k="new" aria-hidden="true" />
              New
              <PrintText value={String(fresh.size)} length={2} align="right" tone={fresh.size ? "wait" : "dim"} label={`${fresh.size}`} />
            </button>
          </div>
          <button type="button" className={s.tool} onClick={seeAll} disabled={fresh.size === 0} title="Mark everything seen (Shift E)">
            <CheckCheck size={16} aria-hidden="true" /> Mark seen
          </button>
          <button type="button" className={`${s.tool} ${s.keys}`} onClick={() => setHelp((h) => !h)} aria-expanded={help} title="Keyboard shortcuts (?)">
            <Keyboard size={16} aria-hidden="true" />
            <span className="sr-only">Keyboard shortcuts</span>
          </button>
        </div>
        {repos.length > 1 && (
          <div className={s.carriers} role="group" aria-label="Filter by repo">
            {repos.slice(0, 14).map(([r, n]) => (
              <button key={r} type="button" aria-pressed={repo === r} onClick={() => setRepo((cur) => (cur === r ? null : r))} title={r}>
                <Callsign repo={r} size="sm" code={codeFor(r)} />
                <span className={s.carrierName}>{r.split("/")[1]}</span>
                <span className={s.carrierCount}>{n}</span>
              </button>
            ))}
          </div>
        )}
        {help && (
          <dl className={s.help}>
            {SHORTCUTS.map(([k, v]) => (
              <div key={k}>
                <dt>
                  <kbd>{k}</kbd>
                </dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {error && (
        <div className={s.error} role="alert">
          <span className={s.errorFace}>
            <PrintText value={FACES.sad} length={5} decorative />
          </span>
          <p>
            {error}
            {fetchedAt && threads.length > 0 ? " Showing the last bay Spool loaded." : ""}
          </p>
          <button type="button" onClick={refresh}>
            Try again
          </button>
        </div>
      )}

      {firstLoad ? (
        <Loader />
      ) : (
        <>
          <div className={s.columns}>
            <Group
              title="Your move"
              sub="Someone answered or asked."
              which="you"
              items={groups.you}
              empty={filtering ? "Nothing on you matches the filter." : "Nothing is waiting on you."}
              render={row}
              extra={youOrder}
            />
            <Group
              title="Their move"
              sub={`Stalled after ${settings.staleDays} days of quiet.`}
              which="them"
              items={groups.them}
              empty={filtering ? "Nothing on them matches the filter." : "You have no open PRs or issues waiting on others."}
              render={row}
            />
          </div>
          <div className={s.lower}>
            <Group
              title="Watching"
              sub="Threads you commented on. Nothing owed either way."
              items={groups.watch}
              empty="You're not following any other threads."
              collapsible
              defaultOpen={groups.watch.length <= 6}
              render={row}
            />
            {groups.snoozed.length > 0 && (
              <Group title="Snoozed" sub="Back in the bay when the snooze ends." items={groups.snoozed} empty="" collapsible defaultOpen={false} render={row} />
            )}
            <Group
              title="Landed"
              sub="Merged or closed in the last 21 days."
              items={groups.done}
              empty="Nothing merged or closed in the last three weeks."
              collapsible
              defaultOpen={false}
              render={row}
            />
          </div>
          {mode === "live" && threads.length === 0 && !loading && !error && (
            <p className={s.note}>GitHub returned no open threads for your account. Open a PR or comment somewhere and it will land here.</p>
          )}
        </>
      )}

      {selected && <ThreadDetail key={selected.id} t={selected} code={codeFor(selected.repo)} mode={mode} now={now} onClose={() => setSel(null)} />}
    </div>
  );
}
