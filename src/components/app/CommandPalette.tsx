"use client";

import { useRouter } from "next/navigation";
import { KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { statusLabel } from "@/lib/format";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { planStoreFor, updateSettings, useMeta } from "@/lib/store";
import { useBoard } from "./BoardProvider";
import { NAV } from "./nav";
import s from "./palette.module.css";

/*
 * Jump anywhere: Cmd+K (Ctrl+K) searches pages, threads, repos, your orgs, follows, saved GSoC
 * organisations and your own plan tasks, plus a few actions with their keys.
 */

type Item = { id: string; group: string; title: string; sub?: string; keys?: string; onYou?: boolean; run: () => void };

const OPEN = "spool:palette";
export const openPalette = () => window.dispatchEvent(new Event(OPEN));

const isMac = () => typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

export function PaletteButton({ className }: { className?: string }) {
  const [mac, setMac] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setMac(isMac()), 0);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <button type="button" className={`${s.trigger}${className ? ` ${className}` : ""}`} onClick={openPalette}>
      <Search size={14} aria-hidden="true" />
      <span>Search</span>
      <kbd>{mac ? "⌘K" : "Ctrl K"}</kbd>
    </button>
  );
}

export function CommandPalette() {
  const router = useRouter();
  const { mode, threads, history, refresh, seeAll } = useBoard();
  const meta = useMeta();
  const plan = planStoreFor(mode === "sample").use();
  const prefs = usePrefs();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const back = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN, onOpen);
    };
  }, []);

  // Focus the input on open, and hand focus back to where it was on close.
  useEffect(() => {
    if (open) {
      back.current = document.activeElement as HTMLElement | null;
      input.current?.focus();
      return;
    }
    back.current?.focus?.();
  }, [open]);

  const close = () => {
    setOpen(false);
    setQ("");
    setActive(0);
  };
  const items: Item[] = useMemo(() => {
    const go = (href: string) => () => router.push(href);
    const out: Item[] = [];
    for (const n of NAV) out.push({ id: `page:${n.href}`, group: "Pages", title: n.label, run: go(n.href) });
    out.push({ id: "page:discover", group: "Pages", title: "Discover", sub: "Find", run: go("/board/discover") });
    out.push({ id: "page:following", group: "Pages", title: "Following", sub: "Find", run: go("/board/following") });
    out.push({ id: "page:orgs", group: "Pages", title: "Orgs", sub: "Repos", run: go("/board/orgs") });
    out.push({ id: "page:gsoc", group: "Pages", title: "GSoC organisations", sub: "Programs", run: go("/board/programs/gsoc") });
    out.push({ id: "page:yc", group: "Pages", title: "YC open source companies", sub: "Programs", run: go("/board/programs/yc") });

    const order = { you: 0, them: 1, watch: 2, done: 3 };
    for (const t of [...threads].sort((a, b) => order[a.next] - order[b.next]))
      out.push({
        id: `thread:${t.id}`,
        group: "Threads",
        title: t.title,
        sub: `${t.repo}#${t.num} · ${statusLabel(t.status)}`,
        onYou: t.next === "you",
        run: go(`/board#thread=${encodeURIComponent(t.id)}`),
      });

    const repos = new Set([...threads.map((t) => t.repo), ...(history?.prs ?? []).map((p) => p.repository.nameWithOwner)]);
    for (const r of repos) out.push({ id: `repo:${r}`, group: "Repos", title: r, sub: "Repo page and outsider report", run: go(`/board/repos/${r}`) });

    for (const o of Object.values(meta.investing)) out.push({ id: `org:${o.owner}`, group: "Your orgs", title: o.owner, sub: o.next || "Orgs", run: go("/board/orgs") });
    for (const f of Object.values(meta.follows)) out.push({ id: `follow:${f.id}`, group: "Following", title: f.kind === "maintainer" ? `@${f.target}` : f.target, run: go("/board/following") });
    for (const [slug, o] of Object.entries(meta.orgs)) out.push({ id: `gsoc:${slug}`, group: "Saved GSoC orgs", title: o.name, run: go("/board/programs/gsoc") });
    for (const [id, t] of Object.entries(plan.tasks)) out.push({ id: `task:${id}`, group: "Your tasks", title: t.title, sub: "Plan", run: go("/board/plan") });

    out.push({ id: "act:refresh", group: "Actions", title: "Refresh from GitHub", run: refresh });
    out.push({ id: "act:seen", group: "Actions", title: "Mark everything seen", keys: "Shift E", sub: "On the board", run: seeAll });
    out.push({
      id: "act:theme",
      group: "Actions",
      title: prefs.theme === "light" ? "Switch to the dark theme" : "Switch to the light theme",
      run: () => setPrefs({ theme: prefs.theme === "light" ? "dark" : "light" }),
    });
    out.push({
      id: "act:sample",
      group: "Actions",
      title: mode === "sample" ? "Leave sample data" : "Use sample data",
      run: () => updateSettings({ demo: mode !== "sample" }),
    });
    return out;
  }, [router, threads, history, meta, plan.tasks, prefs.theme, mode, refresh, seeAll]);

  // Every word has to appear; titles that start with the query come first. Empty shows pages, actions and what's on you.
  const results = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [...items.filter((i) => i.onYou).slice(0, 6), ...items.filter((i) => i.group === "Pages" || i.group === "Actions")];
    const query = words.join(" ");
    const hits = items.filter((i) => {
      const hay = `${i.title} ${i.sub ?? ""} ${i.group}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    const rank = (i: Item) => (i.title.toLowerCase().startsWith(query) ? 0 : i.title.toLowerCase().includes(query) ? 1 : 2);
    const perGroup = new Map<string, number>();
    return hits
      .sort((a, b) => rank(a) - rank(b))
      .filter((i) => {
        const n = (perGroup.get(i.group) ?? 0) + 1;
        perGroup.set(i.group, n);
        return n <= 8;
      })
      .slice(0, 40);
  }, [items, q]);

  // Results keep their group order, so the list reads in sections.
  const groups = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const r of results) m.set(r.group, [...(m.get(r.group) ?? []), r]);
    return [...m];
  }, [results]);
  const flat = groups.flatMap(([, list]) => list);

  if (!open) return null;

  const choose = (i: Item | undefined) => {
    if (!i) return;
    close();
    i.run();
  };
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(flat[active]);
    }
  };

  return (
    <div className={s.backdrop} onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className={s.dialog} role="dialog" aria-modal="true" aria-label="Jump anywhere" onKeyDown={onKeyDown}>
        <label className={s.field}>
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search Spool</span>
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder="Search threads, repos, orgs, pages and actions"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={flat[active] ? `pal-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>Esc</kbd>
        </label>
        <div className={s.list} id="palette-list" role="listbox" aria-label="Results">
          {flat.length === 0 && <p className={s.empty}>Nothing matches &ldquo;{q}&rdquo;.</p>}
          {groups.map(([group, list]) => (
            <div key={group} role="group" aria-label={group}>
              <div className={s.group}>{group}</div>
              {list.map((i) => {
                const n = flat.indexOf(i);
                return (
                  <div
                    key={i.id}
                    id={`pal-${n}`}
                    role="option"
                    aria-selected={n === active}
                    className={s.item}
                    onPointerMove={() => n !== active && setActive(n)}
                    onClick={() => choose(i)}
                  >
                    <span className={s.title}>{i.title}</span>
                    {i.sub && <span className={s.sub}>{i.sub}</span>}
                    {i.keys && <kbd className={s.keys}>{i.keys}</kbd>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className={s.foot}>
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>Enter</kbd> open
          </span>
          <span>
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
