"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { Download, Eye, EyeOff, LogOut, Trash2, Upload } from "lucide-react";
import { FlapText } from "@/components/flap/Flap";
import { verifyToken } from "@/lib/github";
import { setPrefs, usePrefs } from "@/lib/prefs";
import {
  cacheStore,
  clearAuth,
  exportAll,
  importAll,
  planStoreFor,
  saveAuth,
  updateSettings,
  useAuth,
  useMeta,
  useSettings,
  useUsage,
  watchCacheStore,
  windowLeft,
  wipeAll,
  type Usage,
} from "@/lib/store";
import { fmtDate, useHydrated, useNow } from "@/lib/time";
import { notifyPermission, sendTestNotification } from "./Alerts";
import { Interests } from "./Interests";
import p from "./page.module.css";
import s from "./settings.module.css";

const TOKEN_URL = "https://github.com/settings/tokens/new?description=Spool%20board%20(read-only)";

function TokenForm({ onDone }: { onDone?: () => void }) {
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return setErr("Paste a token first.");
    setBusy(true);
    setErr(null);
    try {
      const u = await verifyToken(token.trim());
      saveAuth({ token: token.trim(), login: u.login, name: u.name, avatar: u.avatar, scopes: u.scopes, savedAt: new Date().toISOString() });
      cacheStore.clear();
      watchCacheStore.clear();
      updateSettings({ demo: false });
      setToken("");
      onDone?.();
    } catch (er) {
      setErr(er instanceof Error ? er.message : "That token didn't work.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className={s.tokenForm}>
      <label htmlFor="settings-token" className={s.label}>
        New personal access token
      </label>
      <div className={s.tokenRow}>
        <input
          id="settings-token"
          type={show ? "text" : "password"}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_… or github_pat_…"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!err}
        />
        <button type="button" className={p.iconBtn} onClick={() => setShow((v) => !v)} aria-label={show ? "Hide token" : "Show token"}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <button type="submit" className={`${p.btn} ${p.btnSign}`} disabled={busy}>
          {busy ? "Checking…" : "Check and save"}
        </button>
      </div>
      {err && (
        <p className={s.err} role="alert">
          {err}
        </p>
      )}
      <p className={p.muted}>
        No scopes reads public repos; add <code>repo</code> for private ones.{" "}
        <a href={TOKEN_URL} target="_blank" rel="noreferrer">
          Create a token
        </a>
        .
      </p>
    </form>
  );
}

function NotifyField({ on }: { on: boolean }) {
  const hydrated = useHydrated();
  // Bumped after the permission prompt so the status line re-reads the browser's answer.
  const [, setAsked] = useState(0);
  const perm = hydrated ? notifyPermission() : "default";

  const toggle = async () => {
    if (on) return updateSettings({ notify: false });
    if (perm === "unsupported" || perm === "denied") return;
    const answer = perm === "granted" ? "granted" : await Notification.requestPermission();
    setAsked((n) => n + 1);
    if (answer === "granted") updateSettings({ notify: true });
  };

  const note =
    perm === "unsupported"
      ? "This browser doesn't support notifications."
      : perm === "denied"
        ? "This browser blocks notifications for Spool. Allow them in the site settings, then switch this on."
        : on
          ? "Spool checks every 5 minutes while it's open in a tab, even in the background, and only alerts you when that tab isn't in front."
          : "Off. Spool only notifies while it's open in a tab; nothing runs once you close it.";

  return (
    <div className={s.field}>
      <span className={s.label}>Alerts</span>
      <div className={s.toggles}>
        <button type="button" aria-pressed={on} onClick={toggle} disabled={perm === "unsupported" || (perm === "denied" && !on)}>
          <span className={s.switch} aria-hidden="true" /> Notify me when a thread becomes my move
        </button>
        {on && perm === "granted" && (
          <button type="button" className={s.linkBtn} onClick={sendTestNotification}>
            Send a test
          </button>
        )}
      </div>
      <p className={p.muted}>{note}</p>
    </div>
  );
}

const WINDOWS: { key: keyof Usage; label: string; unit: string }[] = [
  { key: "guest:core", label: "Without a token", unit: "calls" },
  { key: "token:graphql", label: "Your token, board and searches", unit: "points" },
  { key: "token:core", label: "Your token, other calls", unit: "calls" },
];

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/* GitHub's hourly allowances, as GitHub last reported them. Nothing here is estimated. */
function UsagePanel({ guest }: { guest: boolean }) {
  const usage = useUsage();
  const now = useNow();
  const rows = WINDOWS.map((w) => ({ ...w, win: now ? windowLeft(usage[w.key], now) : null })).filter((r) => r.win);
  return (
    <section className={p.panel}>
      <div className={p.panelHead}>
        <h2>GitHub usage</h2>
        <p>GitHub&rsquo;s hourly allowance, as it reported it on Spool&rsquo;s last call.</p>
      </div>
      {rows.length === 0 ? (
        <p className={p.empty}>No calls to GitHub from this browser yet this hour.</p>
      ) : (
        <ul className={s.meters}>
          {rows.map(({ key, label, unit, win }) => {
            const used = win!.limit - win!.remaining;
            const pct = win!.limit ? (win!.remaining / win!.limit) * 100 : 0;
            return (
              <li key={key} data-low={pct < 20 || undefined}>
                <div className={s.meterHead}>
                  <span>{label}</span>
                  <strong>
                    {win!.remaining.toLocaleString("en-US")} of {win!.limit.toLocaleString("en-US")} {unit} left
                  </strong>
                </div>
                <span className={s.meter} aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </span>
                <span className={p.muted}>
                  {used ? `${used.toLocaleString("en-US")} used. ` : ""}Refills {clock(win!.resetAt)}.
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className={p.muted}>
        {guest
          ? "Without a token GitHub allows 60 calls an hour from your network. Watched issues use these. Discover searches go through Spool's server, cached for an hour, so they don't count here."
          : "A token gets 5,000 an hour. The board refresh costs a few points; Spool refreshes every 5 minutes while open."}
      </p>
    </section>
  );
}

/* Everything Spool keeps for you, all in this browser. */
function Memory({ guest }: { guest: boolean }) {
  const meta = useMeta();
  const plan = planStoreFor(false).use();
  const { interests } = useSettings();
  const now = useNow();
  const snoozed = now ? Object.values(meta.snoozed).filter((t) => Date.parse(t) > now).length : Object.keys(meta.snoozed).length;
  const items: [string, number][] = [
    ["Interests", interests.length],
    ["Watched issues", Object.keys(meta.watch).length],
    ["Shortlisted repos", Object.keys(meta.shortlist).length],
    ["Saved GSoC organisations", Object.keys(meta.orgs).length],
    ["Pinned threads", Object.keys(meta.pins).length],
    ["Snoozed threads", snoozed],
    ["Notes", Object.keys(meta.notes).length],
    ["Cards placed on your plan", Object.keys(plan.place).length],
    ["Priorities set", Object.keys(plan.prio).length],
    ["Your own tasks", Object.keys(plan.tasks).length],
  ];
  return (
    <>
      <dl className={s.memory}>
        {items.map(([label, n]) => (
          <div key={label} data-empty={n === 0 || undefined}>
            <dt>{label}</dt>
            <dd>{n}</dd>
          </div>
        ))}
      </dl>
      <p className={p.muted}>
        {guest
          ? "Saved in this browser. Connect GitHub later and all of it stays; the token only adds what needs your account."
          : "Saved in this browser, not on a server. Export a copy to move it to another browser."}
      </p>
    </>
  );
}

export function SettingsView() {
  const auth = useAuth();
  const settings = useSettings();
  const prefs = usePrefs();
  const [replacing, setReplacing] = useState(false);
  const [armed, setArmed] = useState<"wipe" | "disconnect" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const download = () => {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spool-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Exported settings, interests, watched issues, shortlist, saved organisations, pins, snoozes and notes. Your token is not included.");
  };

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data || typeof data !== "object" || (!data.settings && !data.meta)) throw new Error();
      importAll(data);
      setMsg("Imported. Your board picks it up right away.");
    } catch {
      setMsg("That file isn't a Spool export.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className={p.page}>
      <div className={p.head}>
        <div>
          <h1 className={p.h1}>Settings</h1>
          <p className={p.lede}>Everything here is stored in this browser. Spool has no server-side account, and a GitHub token is optional.</p>
        </div>
      </div>

      <div className={p.grid2}>
        <section className={p.panel}>
          <div className={p.panelHead}>
            <h2>GitHub</h2>
            <p>Read-only. Sent only to api.github.com.</p>
          </div>
          {auth ? (
            <div className={s.account}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={auth.avatar} alt="" width={56} height={56} />
              <div>
                <strong>@{auth.login}</strong>
                {auth.name && <span>{auth.name}</span>}
                <span className={p.muted}>
                  Token saved {fmtDate(auth.savedAt, true)} · scopes: {auth.scopes.length ? auth.scopes.join(", ") : "none (public data only)"}
                </span>
              </div>
            </div>
          ) : (
            <div className={s.guestNote}>
              <strong>You&rsquo;re browsing as a guest.</strong>
              <p>
                Discover, Programs, the GSoC organisations and watched issues all work without a token. A read-only token adds your board
                and repos, and raises GitHub&rsquo;s allowance from 60 calls an hour to 5,000.
              </p>
            </div>
          )}
          {(!auth || replacing) && <TokenForm onDone={() => setReplacing(false)} />}
          {auth && (
            <div className={s.row}>
              {!replacing && (
                <button type="button" className={p.btn} onClick={() => setReplacing(true)}>
                  Replace token
                </button>
              )}
              <button
                type="button"
                className={`${p.btn} ${armed === "disconnect" ? p.btnDanger : ""}`}
                onClick={() => {
                  if (armed !== "disconnect") return setArmed("disconnect");
                  clearAuth();
                  cacheStore.clear();
                  watchCacheStore.clear();
                  setArmed(null);
                }}
                onBlur={() => setArmed(null)}
              >
                <LogOut size={16} aria-hidden="true" />
                {armed === "disconnect" ? "Click again to remove the token" : "Disconnect"}
              </button>
            </div>
          )}
        </section>

        <section className={p.panel}>
          <div className={p.panelHead}>
            <h2>Board rules</h2>
            <p>How Spool sorts what it finds.</p>
          </div>
          <div className={s.field}>
            <label htmlFor="stale" className={s.label}>
              Mark a thread stalled after
            </label>
            <div className={s.slider}>
              <input id="stale" type="range" min={3} max={30} value={settings.staleDays} onChange={(e) => updateSettings({ staleDays: Number(e.target.value) })} />
              <FlapText value={String(settings.staleDays)} length={2} align="right" size="32px" label={`${settings.staleDays} days`} opts={{ maxSteps: 4 }} />
              <span className={p.muted}>days of quiet</span>
            </div>
          </div>
          <div className={s.field}>
            <span className={s.label}>Order threads on you by</span>
            <div className={s.seg}>
              <button type="button" aria-pressed={settings.youOrder === "oldest"} onClick={() => updateSettings({ youOrder: "oldest" })}>
                Longest waiting
              </button>
              <button type="button" aria-pressed={settings.youOrder === "newest"} onClick={() => updateSettings({ youOrder: "newest" })}>
                Newest first
              </button>
            </div>
          </div>
          <div className={s.field}>
            <span className={s.label}>Motion and sound</span>
            <div className={s.toggles}>
              <button type="button" aria-pressed={!prefs.motion} onClick={() => setPrefs({ motion: !prefs.motion })}>
                <span className={s.switch} aria-hidden="true" /> Reduce motion
              </button>
              <button type="button" aria-pressed={prefs.sound} onClick={() => setPrefs({ sound: !prefs.sound })}>
                <span className={s.switch} aria-hidden="true" /> Flap sound
              </button>
            </div>
          </div>
          <NotifyField on={settings.notify} />
        </section>
      </div>

      <section className={p.panel}>
        <div className={p.panelHead}>
          <h2>Interests</h2>
          <p>Drive Discover and the GSoC and Product Hunt matches.</p>
        </div>
        <div className={s.pad}>
          <Interests />
        </div>
      </section>

      <div className={p.grid2}>
        <section className={p.panel}>
          <div className={p.panelHead}>
            <h2>What Spool remembers</h2>
            <p>Exports never include the token.</p>
          </div>
          <Memory guest={!auth} />
          <div className={s.row}>
            <button type="button" className={p.btn} onClick={download}>
              <Download size={16} aria-hidden="true" /> Export JSON
            </button>
            <button type="button" className={p.btn} onClick={() => fileRef.current?.click()}>
              <Upload size={16} aria-hidden="true" /> Import JSON
            </button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={upload} />
            <button
              type="button"
              className={`${p.btn} ${p.btnDanger}`}
              onClick={() => {
                if (armed !== "wipe") return setArmed("wipe");
                wipeAll();
                setArmed(null);
                setMsg("Everything Spool stored in this browser is gone, token included.");
              }}
              onBlur={() => setArmed(null)}
            >
              <Trash2 size={16} aria-hidden="true" />
              {armed === "wipe" ? "Click again to erase everything" : "Erase all local data"}
            </button>
          </div>
          {msg && (
            <p className={s.msg} role="status">
              {msg}
            </p>
          )}
        </section>
        <UsagePanel guest={!auth} />
      </div>
    </div>
  );
}
