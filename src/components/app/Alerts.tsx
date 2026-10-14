"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useSettings } from "@/lib/store";
import { useBoard } from "./BoardProvider";

/*
 * Alerts that need no server: a count in the tab title, and an optional browser
 * notification when a thread becomes your move while Spool sits in a background tab.
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
  const { mode, threads, loading } = useBoard();
  const { notify } = useSettings();
  const router = useRouter();
  const onYou = threads.filter((t) => t.next === "you");
  useTitleCount(mode === "none" ? 0 : onYou.length);

  // What was on you at the last refresh; null until the first board of this session arrives.
  const prev = useRef<Map<string, string> | null>(null);
  useEffect(() => {
    if (mode !== "live") {
      prev.current = null;
      return;
    }
    if (loading) return;
    const cur = new Map(onYou.map((t) => [t.id, t.lastAt]));
    const before = prev.current;
    prev.current = cur;
    if (!before || !notify || notifyPermission() !== "granted" || document.visibilityState === "visible") return;
    const fresh = onYou.filter((t) => before.get(t.id) !== t.lastAt);
    if (!fresh.length) return;
    if (fresh.length === 1) {
      const t = fresh[0];
      show(`Your move: ${t.repo}#${t.num}`, `${t.lastActor ? `@${t.lastActor}: ` : ""}${t.title}`, () => router.push("/board"));
    } else {
      show(`${fresh.length} threads are your move`, fresh.slice(0, 3).map((t) => `${t.repo}#${t.num} ${t.title}`).join("\n"), () => router.push("/board"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads, mode, loading, notify]);

  return null;
}
