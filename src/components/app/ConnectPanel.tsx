"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { PrintText } from "@/components/print/PrintText";
import { SignOnForm, type SignOnPhase } from "@/components/landing/SignOn";
import { WIDE } from "@/lib/faces";
import { updateSettings } from "@/lib/store";
import { useBoard } from "./BoardProvider";
import s from "./connect.module.css";

const COPY = {
  board: {
    title: "Your board needs GitHub.",
    lede: "The board is your own PRs, issues and review requests, so Spool needs a read-only token to load it.",
  },
  repos: {
    title: "Your repos need GitHub.",
    lede: "The carrier record is built from your own PR and issue history, so Spool needs a read-only token to load it.",
  },
};

export function ConnectPanel({ what = "board" }: { what?: keyof typeof COPY }) {
  const [phase, setPhase] = useState<SignOnPhase>("idle");
  const face = phase === "checking" ? WIDE.focus : phase === "error" ? WIDE.sad : phase === "ok" ? WIDE.cheer : WIDE.sleepy;
  return (
    <div className={s.wrap}>
      <div className={s.head}>
        <PrintText value={face} length={7} style={{ fontSize: "calc(clamp(40px, 5vw, 64px) * 0.62)" }} decorative intro />
        <h1 className={s.title}>{COPY[what].title}</h1>
        <p className={s.lede}>{COPY[what].lede}</p>
        <div className={s.guest}>
          <p>
            <strong>No token? Carry on as a guest.</strong> Discover, Programs and the GSoC organisations work without one, and anything you
            save stays in this browser when you connect later.
          </p>
          <div className={s.actions}>
            <Link href="/board/discover" className={s.primary}>
              Browse as a guest
            </Link>
            <button type="button" className={s.sample} onClick={() => updateSettings({ demo: true })}>
              Use sample data
            </button>
          </div>
        </div>
      </div>
      <SignOnForm onPhase={setPhase} />
    </div>
  );
}

/* Pages built from your own GitHub activity; guests get the connect panel in their place. */
export function GitHubOnly({ what, children }: { what: keyof typeof COPY; children: ReactNode }) {
  const { mode } = useBoard();
  if (mode === "guest") return <ConnectPanel what={what} />;
  return children;
}
