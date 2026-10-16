"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { HoverArrow } from "@/components/kit/Kit";
import { PrintText } from "@/components/print/PrintText";
import { FACES } from "@/lib/faces";
import { verifyToken } from "@/lib/github";
import { saveAuth, updateSettings, useAuth } from "@/lib/store";
import { useSectionFace } from "./mood";
import { Route } from "./Route";
import { SectionHead } from "./SectionHead";
import sec from "./section.module.css";
import s from "./signon.module.css";

const TOKEN_URL = "https://github.com/settings/tokens/new?description=Spool%20board%20(read-only)";

export type SignOnPhase = "idle" | "checking" | "ok" | "error";

const STATUS: Record<SignOnPhase, string> = {
  idle: "WAITING",
  checking: "CHECKING",
  ok: "SIGNED ON",
  error: "REFUSED",
};

/* Signing on to your position: paste a token, Spool checks it with GitHub and keeps it in this browser. */
export function SignOnForm({ onPhase, after = "/board" }: { onPhase?: (p: SignOnPhase) => void; after?: string }) {
  const router = useRouter();
  const auth = useAuth();
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [phase, setPhaseState] = useState<SignOnPhase>("idle");
  const [error, setError] = useState("");
  const [controller, setController] = useState<string | null>(null);
  const who = controller ?? (auth ? auth.login : null);
  const status = phase === "idle" && who ? "READY" : STATUS[phase];

  const setPhase = (p: SignOnPhase) => {
    setPhaseState(p);
    onPhase?.(p);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const t = token.trim();
    if (!t) {
      setPhase("error");
      setError("Paste a token first. It starts with ghp_ or github_pat_.");
      return;
    }
    setPhase("checking");
    setError("");
    try {
      const u = await verifyToken(t);
      saveAuth({ token: t, login: u.login, name: u.name, avatar: u.avatar, scopes: u.scopes, savedAt: new Date().toISOString() });
      updateSettings({ demo: false });
      setController(u.login);
      setPhase("ok");
      setToken("");
      window.setTimeout(() => router.push(after), 1100);
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Something went wrong checking that token.");
    }
  }

  return (
    <form className={s.form} data-phase={phase} onSubmit={submit} noValidate data-shine>
      <div className={s.main}>
        {auth && phase !== "ok" ? (
          <div className={s.signedOn}>
            <p>
              You&rsquo;re signed on as <strong>@{auth.login}</strong>.
            </p>
            <div className={s.row}>
              <Link href="/board" className={s.submit}>
                <span className={s.submitPaper}>
                  Go to your bay
                  <HoverArrow />
                </span>
              </Link>
              <Link href="/board/settings" className={s.alt}>
                Change token
              </Link>
            </div>
          </div>
        ) : (
          <>
            <label htmlFor="gh-token" className={s.label}>
              Personal access token
            </label>
            <div className={s.inputRow}>
              <input
                id="gh-token"
                className={s.input}
                type={show ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                placeholder="ghp_… or github_pat_…"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  if (phase === "error") setPhase("idle");
                }}
                aria-invalid={phase === "error"}
                aria-describedby="gh-token-help gh-token-error"
              />
              <button type="button" className={s.eye} onClick={() => setShow((v) => !v)} aria-label={show ? "Hide token" : "Show token"}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p id="gh-token-help" className={s.help}>
              A classic token with no scopes reads public repos. Tick <code>repo</code> if you want private ones in your bay
              too. Fine-grained tokens with public read access work as well.{" "}
              <a href={TOKEN_URL} target="_blank" rel="noreferrer">
                Create one on GitHub
              </a>
              .
            </p>
            <p id="gh-token-error" className={s.error} role="alert">
              {phase === "error" ? error : ""}
            </p>
            <div className={s.row}>
              <button type="submit" className={s.submit} disabled={phase === "checking" || phase === "ok"}>
                <span className={s.submitPaper}>
                  {phase === "checking" ? (
                    <span className="shimmer">Checking with GitHub…</span>
                  ) : phase === "ok" ? (
                    "Signed on"
                  ) : (
                    "Check token and sign on"
                  )}
                  <HoverArrow />
                </span>
              </button>
              <Link href="/board?demo=1" className={s.alt}>
                Try the sample board first
              </Link>
              <Link href="/board/discover" className={s.alt}>
                Browse as a guest
              </Link>
            </div>
          </>
        )}
      </div>

      {/* the sign-on strip: what Spool will hold, printed */}
      <div className={s.card} aria-label="What signing on does">
        <dl className={s.fields}>
          <div>
            <dt>Controller</dt>
            <dd className={s.controller}>{who ? `@${who}` : "not signed on"}</dd>
          </div>
          <div>
            <dt>Reads from</dt>
            <dd>api.github.com</dd>
          </div>
          <div>
            <dt>Token kept in</dt>
            <dd>this browser</dd>
          </div>
          <div>
            <dt>Writes to GitHub</dt>
            <dd>nothing</dd>
          </div>
        </dl>
        <div className={s.status} data-phase={phase}>
          <span>Status</span>
          <PrintText value={status} length={9} label={`Status: ${status.toLowerCase()}`} />
        </div>
      </div>
    </form>
  );
}

export function SignOn() {
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<SignOnPhase>("idle");
  const face = phase === "checking" ? FACES.focus : phase === "error" ? FACES.sad : phase === "ok" ? FACES.glad : FACES.wink;
  useSectionFace(ref, face);

  return (
    <section ref={ref} id="connect" className={sec.section} aria-labelledby="connect-title">
      <SectionHead id="connect-title" title="Your token stays on this machine." center>
        Spool reads GitHub with a personal access token you paste once. It&rsquo;s kept in this browser&rsquo;s local storage
        and sent only to api.github.com. Spool never posts, comments, or changes anything on GitHub. The token is optional:
        without one you can browse as a guest, and what you save carries over when you sign on.
      </SectionHead>
      <Route />
      <SignOnForm onPhase={setPhase} />
    </section>
  );
}
