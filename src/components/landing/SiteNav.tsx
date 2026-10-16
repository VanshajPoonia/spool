"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { PrintText } from "@/components/print/PrintText";
import { FACES } from "@/lib/faces";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { usePageFace } from "./mood";
import s from "./nav.module.css";

export function SiteNav() {
  const { face } = usePageFace();
  const prefs = usePrefs();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const light = prefs.theme === "light";

  return (
    <header className={s.nav} data-scrolled={scrolled || undefined}>
      <Link href="/" className={s.brand} aria-label="Spool, home">
        <span className={s.face}>
          <PrintText value={face ?? FACES.calm} length={5} decorative opts={{ speed: 30 }} />
        </span>
        <span className={s.word}>Spool</span>
      </Link>

      <nav className={s.links} aria-label="Primary">
        <a href="#how-it-works">How it works</a>
        <a href="#gsoc">GSoC</a>
        <a href="#programs">Programs</a>
        <Link href="/board?demo=1">Sample board</Link>
        <Link href="/board/discover">Browse as guest</Link>
      </nav>

      <div className={s.end}>
        <button
          type="button"
          className={s.toggle}
          aria-pressed={light}
          onClick={() => setPrefs({ theme: light ? "dark" : "light" })}
          title={light ? "Switch to dark" : "Switch to light"}
        >
          {light ? <Moon size={16} strokeWidth={2} aria-hidden="true" /> : <Sun size={16} strokeWidth={2} aria-hidden="true" />}
          <span className="sr-only">Light theme</span>
        </button>
        <button
          type="button"
          className={s.toggle}
          aria-pressed={prefs.sound}
          onClick={() => setPrefs({ sound: !prefs.sound })}
          title={prefs.sound ? "Turn sound off" : "Turn sound on"}
        >
          {prefs.sound ? <Volume2 size={16} strokeWidth={2} aria-hidden="true" /> : <VolumeX size={16} strokeWidth={2} aria-hidden="true" />}
          <span className="sr-only">Printer sound</span>
        </button>
        <span className={s.divider} aria-hidden="true" />
        <a href="#connect" className={s.cta}>
          <span className={s.ctaLong}>Connect GitHub</span>
          <span className={s.ctaShort}>Connect</span>
        </a>
      </div>
    </header>
  );
}
