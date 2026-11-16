"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { inDays } from "@/lib/deadlines";
import { changesStore, deadlineAlertStore, useSettings } from "@/lib/store";
import { useBoard } from "./BoardProvider";
import { useDeadlines } from "./useDeadlines";

/*
 * Alerts that need no server: a count in the tab title, and an optional browser
 * notification when a thread becomes your move while Spool sits in a background tab.
 * Notifications read the same list as "Since you last looked", one batch per board load.
 */

const PREFIX = /^\(\d+\)\s+/;

export function notifySupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifyPermission(): NotificationPermission | "unsupported" {
  return notifySupported() ? Notification.permission : "unsupported";
}

function show(title: string, body: string, open?: () => void) {
  try {
    // One tag, so a newer alert replaces an older one instead of stacking.
    const n = new Notification(title, { body, tag: "spool-board", icon: "/icon.svg" });
    n.onclick = () => {
      window.focus();
      open?.();
      n.close();
    };
  } catch {
    /* some browsers only allow notifications from a service worker; skip quietly */
  }
}

export function sendTestNotification() {
  show("Spool notifications are on", "You'll get one of these when a thread becomes your move while Spool is in a background tab.");
}

/* "(3) Board · Spool": the count of threads on you leads the tab title. */
function useTitleCount(count: number) {
  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(PREFIX, "");
      const next = count > 0 ? `(${count}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    // Next swaps the title on navigation; put the count back whenever that happens.
    const el = document.querySelector("title");
    const mo = el ? new MutationObserver(apply) : null;
    if (el) mo!.observe(el, { childList: true, characterData: true, subtree: true });
    return () => {
      mo?.disconnect();
      document.title = document.title.replace(PREFIX, "");
    };
  }, [count]);
}

export function Alerts() {
  const { mode, threads } = useBoard();
  const { notify } = useSettings();
  const router = useRouter();
  const changes = changesStore.use();
  useTitleCount(mode === "none" ? 0 : threads.filter((t) => t.next === "you").length);

  // Only batches found after this tab opened alert; an older one was news for an earlier visit.
  const opened = useRef<string | null>(null);
  const lastBatch = useRef<string | null>(null);
  useEffect(() => {
    opened.current = new Date().toISOString();
  }, []);
  useEffect(() => {
    const at = changes.batch?.at ?? null;
    if (mode !== "live" || !at || !opened.current || at <= opened.current || at === lastBatch.current) return;
    lastBatch.current = at;
    if (!notify || notifyPermission() !== "granted" || document.visibilityState === "visible") return;
    const onYou = (changes.batch?.ids ?? []).map((id) => changes.items[id]).filter((c) => c && c.next === "you");
    if (!onYou.length) return;
    if (onYou.length === 1) {
      const c = onYou[0];
      show(`${c.label}: ${c.repo}#${c.num}`, c.title, () => router.push("/board"));
    } else {
      show(`${onYou.length} threads are your move`, onYou.slice(0, 3).map((c) => `${c.repo}#${c.num} ${c.title}`).join("\n"), () => router.push("/board"));
    }
  }, [changes, mode, notify, router]);

  // Deadlines alert once at 7 days and once at 1 day, whether or not the tab is in front.
  const deadlines = useDeadlines();
  useEffect(() => {
    if (mode === "sample" || mode === "none" || !notify || notifyPermission() !== "granted") return;
    const sent = deadlineAlertStore.read();
    for (const d of deadlines) {
      if (d.days !== 7 && d.days !== 1) continue;
      const key = `${d.key}:${d.date.slice(0, 10)}:${d.days}`;
      if (sent[key]) continue;
      deadlineAlertStore.update((s) => ({ ...s, [key]: new Date().toISOString() }));
      show(`${d.label} ${inDays(d.days)}`, d.detail || "From your followed deadlines in Spool.", () => router.push(d.href?.startsWith("/") ? d.href : "/board"));
    }
  }, [deadlines, mode, notify, router]);

  return null;
}
