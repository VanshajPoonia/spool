"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FlapText } from "@/components/flap/Flap";
import { Pictogram } from "@/components/kit/Kit";
import { FACES } from "@/lib/faces";
import { verifyToken } from "@/lib/github";
import { saveAuth, updateSettings, useAuth } from "@/lib/store";
import { useSectionFace } from "./mood";
import { SectionHead } from "./SectionHead";
import sec from "./section.module.css";
import s from "./pass.module.css";

const TOKEN_URL = "https://github.com/settings/tokens/new?description=Spool%20board%20(read-only)";

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function Barcode({ seed }: { seed: string }) {
  const bars = useMemo(() => {
    let h = hash(seed);
    const out: { x: number; w: number }[] = [];
    let x = 0;
    while (x < 200) {
      h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
      const w = 1 + (h % 4);
      const gap = 1 + ((h >>> 8) % 3);
      out.push({ x, w });
      x += w + gap;
    }
    return out;
  }, [seed]);
  return (
    <svg className={s.barcode} viewBox="0 0 200 48" preserveAspectRatio="none" aria-hidden="true">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={48} fill="currentColor" />
      ))}
    </svg>
  );
}

export type PassPhase = "idle" | "checking" | "ok" | "error";

export function PassForm({ onPhase, after = "/board" }: { onPhase?: (p: PassPhase) => void; after?: string }) {
  const router = useRouter();
  const auth = useAuth();
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [phase, setPhaseState] = useState<PassPhase>("idle");
  const [error, setError] = useState("");
  const [passenger, setPassenger] = useState<string | null>(null);
  const who = passenger ?? (auth ? auth.login : null);

  const setPhase = (p: PassPhase) => {
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
      setPassenger(u.login);
      setPhase("ok");
      setToken("");
      window.setTimeout(() => router.push(after), 1100);
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Something went wrong checking that token.");
    }
  }

  return (
    <form className={s.pass} data-phase={phase} onSubmit={submit} noValidate>
        <div className={s.main}>
          <div className={s.strip}>
            <span className={s.stripTitle}>
              <Pictogram name="key" className={s.stripIcon} />
              Boarding pass
            </span>
            <span className={s.stripBrand}>Spool</span>
          </div>

          <dl className={s.fields}>
            <div>
              <dt>Passenger</dt>
              <dd className={s.passenger}>{who ? `@${who}` : "Not boarded yet"}</dd>
            </div>
            <div>
              <dt>Reads from</dt>
              <dd>api.github.com</dd>
            </div>
            <div>
              <dt>Stored in</dt>
              <dd>This browser</dd>
            </div>
            <div>
              <dt>Writes to GitHub</dt>
              <dd>Nothing</dd>
            </div>
          </dl>

          {auth && phase !== "ok" ? (
            <div className={s.boarded}>
              <p>
                You&rsquo;re connected as <strong>@{auth.login}</strong>.
              </p>
              <div className={s.row}>
                <Link href="/board" className={s.board}>
                  Go to your board
                  <Pictogram name="arrow" className={s.boardIcon} />
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
                A classic token with no scopes reads public repos. Tick <code>repo</code> if you want private ones on the board too.
                Fine-grained tokens with public read access work as well.{" "}
                <a href={TOKEN_URL} target="_blank" rel="noreferrer">
                  Create one on GitHub
                </a>
                .
              </p>
              <p id="gh-token-error" className={s.error} role="alert">
                {phase === "error" ? error : ""}
              </p>
              <div className={s.row}>
                <button type="submit" className={s.board} disabled={phase === "checking" || phase === "ok"}>
                  {phase === "checking" ? "Checking with GitHub…" : phase === "ok" ? "Boarded" : "Check token and board"}
                  <Pictogram name="arrow" className={s.boardIcon} />
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

        <div className={s.stub} aria-hidden="true">
          <div className={s.stubTop}>
            <span className={s.stubLabel}>Gate</span>
            <span className={s.gate}>/board</span>
          </div>
          <FlapText value={phase === "ok" ? "BOARDED" : who ? "READY" : "WAITING"} length={7} decorative size="34px" ratio={0.72} opts={{ stagger: 30 }} />
          <div className={s.stubBottom}>
            <Barcode seed={who ?? "spool"} />
            <span className={s.stubLabel}>{who ? `@${who}` : "guest"}</span>
          </div>
        </div>
      </form>
  );
}

export function BoardingPass() {
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<PassPhase>("idle");
  const face = phase === "checking" ? FACES.focus : phase === "error" ? FACES.sad : phase === "ok" ? FACES.glad : FACES.wink;
  useSectionFace(ref, face);

  return (
    <section ref={ref} id="connect" className={sec.section} aria-labelledby="connect-title">
      <SectionHead id="connect-title" title="Your token stays on this machine." pict="key">
        Spool reads GitHub with a personal access token you paste once. It&rsquo;s kept in this browser&rsquo;s local
        storage and sent only to api.github.com. Spool never posts, comments, or changes anything on GitHub. The token is
        optional: without one you can browse as a guest, and what you save carries over when you connect.
      </SectionHead>
      <div className={sec.rise}>
        <PassForm onPhase={setPhase} />
      </div>
    </section>
  );
}
