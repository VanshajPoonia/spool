"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, Suspense } from "react";
import { RefreshCw } from "lucide-react";
import { FlapText } from "@/components/flap/Flap";
import { Pictogram } from "@/components/kit/Kit";
import { ago } from "@/lib/classify";
import { FACES } from "@/lib/faces";
import { updateSettings, useAuth, useUsage, windowLeft } from "@/lib/store";
import { Alerts } from "./Alerts";
import { BoardProvider, useBoard } from "./BoardProvider";
import s from "./shell.module.css";

const TABS = [
  { href: "/board", label: "Board" },
  { href: "/board/plan", label: "Plan" },
  { href: "/board/repos", label: "Repos" },
  { href: "/board/discover", label: "Discover" },
  { href: "/board/programs", label: "Programs" },
  { href: "/board/settings", label: "Settings" },
];

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

function Tabs({ pathname, badge }: { pathname: string | null; badge: number }) {
  return (
    <nav className={s.tabs} aria-label="App">
      {TABS.map((t) => {
        const active = !!pathname && (t.href === "/board" ? pathname === "/board" : pathname.startsWith(t.href));
        return (
          <Link key={t.href} href={t.href} className={s.tab} aria-current={active ? "page" : undefined}>
            {t.label}
            {t.href === "/board" && badge > 0 && <span className={s.badge}>{badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

/* usePathname is request data on dynamic routes, so it sits behind its own Suspense boundary. */
function ActiveTabs({ badge }: { badge: number }) {
  const pathname = usePathname();
  return <Tabs pathname={pathname} badge={badge} />;
}

function Header() {
  const auth = useAuth();
  const { mode, threads, loading, error, fetchedAt, refresh, now } = useBoard();
  const onYou = threads.filter((t) => t.next === "you").length;
  const face = moodFace(onYou, loading, !!error, mode);

  return (
    <header className={s.header}>
      <div className={s.left}>
        <Link href="/" className={s.brand} aria-label="Spool home">
          <FlapText value="SPOOL" length={5} size="26px" decorative />
        </Link>
        <span className={s.face} title={mode === "guest" ? "Browsing as a guest" : mode === "none" ? "Loading" : `${onYou} on you`}>
          <FlapText value={face} length={5} size="26px" decorative opts={{ maxSteps: 5, step: 46 }} />
        </span>
      </div>

      <Suspense fallback={<Tabs pathname={null} badge={0} />}>
        <ActiveTabs badge={onYou} />
      </Suspense>

      <div className={s.right}>
        {mode === "guest" && <GuestChip now={now} />}
        {(mode === "live" || mode === "sample") && (
          <button type="button" className={s.sync} onClick={refresh} disabled={loading || mode === "sample"} title="Refresh from GitHub">
            <RefreshCw size={16} className={loading ? s.spin : undefined} aria-hidden="true" />
            <span>{loading ? "Syncing" : fetchedAt && now ? (ago(fetchedAt, now) === "now" ? "Synced just now" : `Synced ${ago(fetchedAt, now)} ago`) : "Synced"}</span>
          </button>
        )}
        {mode === "live" && auth && (
          <Link href="/board/settings" className={s.me}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={auth.avatar} alt="" width={28} height={28} />
            <span>@{auth.login}</span>
          </Link>
        )}
      </div>
    </header>
  );
}

/* Guests see how much of GitHub's hourly allowance is left, and where to raise it. */
function GuestChip({ now }: { now: number }) {
  const usage = useUsage();
  const w = now ? windowLeft(usage["guest:core"], now) : null;
  return (
    <Link href="/board/settings" className={s.guest} title="Browsing without a token. Connect GitHub in Settings.">
      <span className={s.guestTag}>Guest</span>
      <span className={s.guestLeft}>{w ? `${w.remaining} of ${w.limit} calls left` : "Connect GitHub"}</span>
    </Link>
  );
}

function SampleBand() {
  const auth = useAuth();
  return (
    <div className={s.sample} role="status">
      <Pictogram name="wall" className={s.sampleIcon} />
      <p>
        <strong>Sample data.</strong> Invented repos and people, run through the same rules as your real board.
      </p>
      <button type="button" onClick={() => updateSettings({ demo: false })}>
        {auth ? "Back to my board" : "Leave sample data"}
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
        <Header />
        <main className={s.main}>
          <Body>{children}</Body>
        </main>
      </div>
    </BoardProvider>
  );
}
