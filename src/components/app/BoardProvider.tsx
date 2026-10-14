"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { assignCodes } from "@/lib/carriers";
import { classify, type Thread } from "@/lib/classify";
import { fetchBoard, fetchHistory, GitHubError, type History, type RawBoard } from "@/lib/github";
import { SAMPLE_LOGIN, sampleBoard, sampleHistory } from "@/lib/sample-board";
import { cacheStore, markSeen, readMeta, updateSettings, useAuth, useMeta, useSettings } from "@/lib/store";
import { useHydrated, useNow } from "@/lib/time";

/** live: your token. sample: invented board. guest: no token, public data only. none: before the browser store is read. */
export type Mode = "live" | "sample" | "guest" | "none";

type Ctx = {
  mode: Mode;
  ready: boolean;
  login: string | null;
  threads: Thread[];
  fresh: Set<string>;
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
  rate: RawBoard["rate"] | null;
  now: number;
  refresh: () => void;
  history: History | null;
  historyLoading: boolean;
  historyError: string | null;
  loadHistory: (force?: boolean) => void;
  seeAll: () => void;
  see: (t: Thread) => void;
  /** collision-free carrier code for any repo on the board or in your history */
  codeFor: (repo: string) => string | undefined;
};

const BoardCtx = createContext<Ctx | null>(null);

export function useBoard() {
  const c = useContext(BoardCtx);
  if (!c) throw new Error("useBoard outside BoardProvider");
  return c;
}

const FIVE_MIN = 5 * 60000;

export function BoardProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const settings = useSettings();
  const meta = useMeta();
  const ready = useHydrated();
  const now = useNow() ?? 0;
  const [error, setError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // URL flag ?demo=1 switches on the sample board.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      updateSettings({ demo: true });
      params.delete("demo");
      const q = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : ""));
    }
  }, []);

  const mode: Mode = !ready ? "none" : settings.demo ? "sample" : auth ? "live" : "guest";
  const login = mode === "sample" ? SAMPLE_LOGIN : auth?.login ?? null;
  const token = auth?.token ?? null;

  // Board data belongs to one mode + account; switching either resets it during render.
  const boardKey = `${mode}:${login ?? ""}`;
  const [raw, setRaw] = useState<RawBoard | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [rawKey, setRawKey] = useState<string | null>(null);
  if (rawKey !== boardKey) {
    setRawKey(boardKey);
    setHistory(null);
    if (mode === "sample") setRaw(sampleBoard());
    else if (mode === "live") {
      const c = cacheStore.read();
      setRaw(c.board && c.login === login ? (c.board as RawBoard) : null);
    } else setRaw(null);
  }

  // Each bump of `req` asks for a fresh board; loading is "the latest request hasn't come back yet".
  const [req, setReq] = useState(0);
  const [done, setDone] = useState<{ req: number; key: string } | null>(null);
  const loading = mode === "live" && !!token && (done?.req !== req || done?.key !== boardKey);
  const bump = useCallback(() => setReq((r) => r + 1), []);

  useEffect(() => {
    if (mode !== "live" || !token || !login) return;
    let alive = true;
    fetchBoard(token, login)
      .then((b) => {
        if (!alive) return;
        setRaw(b);
        setError(null);
        cacheStore.write({ board: b, at: b.fetchedAt, login });
        // First ever load: treat everything already there as seen.
        if (Object.keys(readMeta().seen).length === 0) {
          markSeen(b.nodes.map((n) => ({ id: n.id, at: new Date().toISOString() })));
        }
      })
      .catch((e) => {
        if (alive) setError(e instanceof GitHubError || e instanceof Error ? e.message : "Couldn't load your board.");
      })
      .finally(() => {
        if (alive) setDone({ req, key: boardKey });
      });
    return () => {
      alive = false;
    };
  }, [mode, token, login, req, boardKey]);

  useEffect(() => {
    if (mode !== "live") return;
    // With notifications on, keep refreshing in a background tab too; that's when an alert is worth having.
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible" || settings.notify) bump();
    }, FIVE_MIN);
    const onVis = () => {
      if (document.visibilityState === "visible" && raw && Date.now() - Date.parse(raw.fetchedAt) > FIVE_MIN) bump();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mode, bump, raw, settings.notify]);

  const threads = useMemo(() => {
    if (!raw || !login) return [];
    const t = now || Date.parse(raw.fetchedAt);
    return raw.nodes.map((n) => classify(n, login, settings.staleDays, t));
  }, [raw, login, settings.staleDays, now]);

  const fresh = useMemo(() => {
    const out = new Set<string>();
    const me = (login ?? "").toLowerCase();
    for (const t of threads) {
      if (!t.lastActor || t.lastActor.toLowerCase() === me || t.next === "done") continue;
      if (mode === "sample") {
        if (now - Date.parse(t.lastAt) < 26 * 3600000) out.add(t.id);
        continue;
      }
      const seenAt = meta.seen[t.id];
      if (!seenAt || Date.parse(t.lastAt) > Date.parse(seenAt)) out.add(t.id);
    }
    return out;
  }, [threads, meta.seen, login, mode, now]);

  const loadHistory = useCallback(
    async (force = false) => {
      if (mode === "sample") {
        setHistory(sampleHistory());
        return;
      }
      if (mode !== "live" || !token || !login) return;
      if (history && !force) return;
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        setHistory(await fetchHistory(token, login));
      } catch (e) {
        setHistoryError(e instanceof Error ? e.message : "Couldn't load your history.");
      } finally {
        setHistoryLoading(false);
      }
    },
    [mode, token, login, history],
  );

  const codes = useMemo(() => {
    const repos = threads.map((t) => t.repo);
    for (const p of history?.prs ?? []) repos.push(p.repository.nameWithOwner);
    for (const i of history?.issues ?? []) repos.push(i.repository.nameWithOwner);
    for (const o of history?.own ?? []) repos.push(o.nameWithOwner);
    return assignCodes(repos);
  }, [threads, history]);
  const codeFor = useCallback((repo: string) => codes.get(repo), [codes]);

  const seeAll = useCallback(() => {
    const stamp = new Date().toISOString();
    markSeen(threads.map((t) => ({ id: t.id, at: stamp })));
  }, [threads]);

  const see = useCallback((t: Thread) => {
    markSeen([{ id: t.id, at: new Date().toISOString() }]);
  }, []);

  const value: Ctx = {
    mode,
    ready,
    login,
    threads,
    fresh,
    loading,
    error,
    fetchedAt: raw?.fetchedAt ?? null,
    rate: raw?.rate ?? null,
    now,
    refresh: () => (mode === "sample" ? setRaw(sampleBoard()) : bump()),
    history,
    historyLoading,
    historyError,
    loadHistory: (f) => void loadHistory(f),
    seeAll,
    see,
    codeFor,
  };

  return <BoardCtx.Provider value={value}>{children}</BoardCtx.Provider>;
}
