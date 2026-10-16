"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, Suspense, useEffect, useMemo, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { PrintText } from "@/components/print/PrintText";
import { carrier } from "@/lib/carriers";
import { ago } from "@/lib/classify";
import { FACES } from "@/lib/faces";
import { updateSettings, useAuth, useUsage, windowLeft } from "@/lib/store";
import { Alerts } from "./Alerts";
import { BoardProvider, useBoard } from "./BoardProvider";
import { isActive, NAV } from "./nav";
import s from "./shell.module.css";

function moodFace(onYou: number, loading: boolean, error: boolean, mode: string) {
  if (mode === "none") return FACES.sleepy;
  if (mode === "guest") return FACES.watch;
  if (error) return FACES.sad;
  if (loading) return FACES.watch;
  if (onYou === 0) return FACES.calm;
  if (onYou <= 3) return FACES.focus;
  if (onYou <= 9) return FACES.alarm;
  return FACES.done;
}

/* The app's places. The bay's count is the threads on you, set in the your-move yellow. */
function NavList({ pathname, badge, className }: { pathname: string | null; badge: number; className: string }) {
  return (
    <nav className={className} aria-label="App">
      {NAV.map((n) => {
        const active = isActive(n.href, pathname);
        return (
          <Link key={n.href} href={n.href} className={s.navItem} aria-current={active ? "page" : undefined}>
            <n.icon size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className={s.navLabel}>{n.label}</span>
            {n.href === "/board" && badge > 0 && (
              <span className={s.badge} aria-label={`${badge} on you`}>
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/* usePathname is request data on dynamic routes, so it sits behind its own Suspense boundary. */
function ActiveNav({ badge, className }: { badge: number; className: string }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  // In the phone's scrolling strip the current place is brought into view.
  useEffect(() => {
    const strip = ref.current?.firstElementChild as HTMLElement | null;
    const on = strip?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!strip || !on || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollTo({ left: on.offsetLeft - (strip.clientWidth - on.offsetWidth) / 2, behavior: "auto" });
  }, [pathname]);
  return (
    <div ref={ref} className={s.navWrap}>
      <NavList pathname={pathname} badge={badge} className={className} />
    </div>
  );
}

function SyncButton({ compact = false }: { compact?: boolean }) {
  const { mode, loading, fetchedAt, refresh, now } = useBoard();
  if (mode !== "live" && mode !== "sample") return null;
  const label = loading ? "Syncing" : fetchedAt && now ? (ago(fetchedAt, now) === "now" ? "Synced just now" : `Synced ${ago(fetchedAt, now)} ago`) : "Synced";
  return (
    <button type="button" className={s.sync} onClick={refresh} disabled={loading || mode === "sample"} title={`${label}. Refresh from GitHub.`}>
      <RefreshCw size={14} strokeWidth={2} className={loading ? s.spin : undefined} aria-hidden="true" />
      <span className={compact ? "sr-only" : s.syncText}>{label}</span>
    </button>
  );
}

function Brand() {
  const { mode, threads, loading, error } = useBoard();
  const onYou = threads.filter((t) => t.next === "you").length;
  const face = moodFace(onYou, loading, !!error, mode);
  return (
    <Link href="/" className={s.brand} aria-label="Spool home">
      <span className={s.face} title={mode === "guest" ? "Browsing as a guest" : mode === "none" ? "Loading" : `${onYou} on you`}>
        <PrintText value={face} length={5} decorative opts={{ speed: 34 }} />
      </span>
      <span className={s.word}>Spool</span>
    </Link>
  );
}

/* The repos your open threads live in, busiest first, each under its callsign. */
function RepoList() {
  const { threads, codeFor } = useBoard();
  const repos = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of threads) if (t.next !== "done") m.set(t.repo, (m.get(t.repo) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
  }, [threads]);
  if (!repos.length) return null;
  return (
    <div className={s.repos}>
      <p className={s.sideHead}>Your repos</p>
      <ul>
        {repos.map(([repo, n]) => {
          const c = carrier(repo, codeFor(repo));
          return (
            <li key={repo}>
              <Link href={`/board/repos/${repo}`} className={s.repo} title={repo}>
                <span className={s.repoCode}>{c.code}</span>
                <span className={s.repoName}>{c.name}</span>
                <span className={s.repoCount}>{n}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* Guests see how much of GitHub's hourly allowance is left, and where to raise it. */
function GuestChip({ now }: { now: number }) {
  const usage = useUsage();
  const w = now ? windowLeft(usage["guest:core"], now) : null;
  return (
    <Link href="/board/settings" className={s.account} title="Browsing without a token. Connect GitHub in Settings.">
      <span className={s.accountTag}>Guest</span>
      <span className={s.accountText}>{w ? `${w.remaining} of ${w.limit} calls left` : "Connect GitHub"}</span>
    </Link>
  );
}

function Account() {
  const auth = useAuth();
  const { mode, now } = useBoard();
  if (mode === "guest") return <GuestChip now={now} />;
  if (mode === "live" && auth)
    return (
      <Link href="/board/settings" className={s.account}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={auth.avatar} alt="" width={22} height={22} />
        <span className={s.accountText}>@{auth.login}</span>
      </Link>
    );
  return null;
}

function Sidebar() {
  const { mode, threads } = useBoard();
  const onYou = threads.filter((t) => t.next === "you").length;
  return (
    <aside className={s.side}>
      <div className={s.workspace}>
        <Brand />
        <SyncButton compact />
      </div>
      <Suspense fallback={<NavList pathname={null} badge={0} className={s.nav} />}>
        <ActiveNav badge={onYou} className={s.nav} />
      </Suspense>
      {mode !== "guest" && mode !== "none" && <RepoList />}
      <div className={s.sideFoot}>
        <SyncButton />
        <Account />
      </div>
    </aside>
  );
}

/* On a phone the sidebar folds into a bar: the brand, sync and account, then the places in a row. */
function MobileBar() {
  const { threads } = useBoard();
  const onYou = threads.filter((t) => t.next === "you").length;
  return (
    <header className={s.bar}>
      <div className={s.barTop}>
        <Brand />
        <div className={s.barEnd}>
          <SyncButton compact />
          <Account />
        </div>
      </div>
      <Suspense fallback={<NavList pathname={null} badge={0} className={s.tabs} />}>
        <ActiveNav badge={onYou} className={s.tabs} />
      </Suspense>
    </header>
  );
}

function SampleBand() {
  const auth = useAuth();
  return (
    <div className={s.sample} role="status">
      <span className={s.sampleTag}>Sample data</span>
      <p>Invented repos and people, run through the same rules as your real bay.</p>
      <button type="button" onClick={() => updateSettings({ demo: false })}>
        {auth ? "Back to my bay" : "Leave sample data"}
      </button>
    </div>
  );
}

function Body({ children }: { children: ReactNode }) {
  const { mode, ready } = useBoard();
  // The page always renders (so its segment is part of the shell); it stays hidden until the browser store is read.
  const gated = !ready;
  return (
    <>
      {mode === "sample" && <SampleBand />}
      <div hidden={gated} className={gated ? s.boot : undefined}>
        {children}
      </div>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <BoardProvider>
      <Alerts />
      <div className={s.shell}>
        <Sidebar />
        <MobileBar />
        <main className={s.main}>
          <div className={s.panel}>
            <Body>{children}</Body>
          </div>
        </main>
      </div>
    </BoardProvider>
  );
}
