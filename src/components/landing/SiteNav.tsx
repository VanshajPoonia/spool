"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { PrintText } from "@/components/print/PrintText";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { usePageFace } from "./mood";
import s from "./nav.module.css";

export function SiteNav() {
  const { face } = usePageFace();
  const prefs = usePrefs();
  const [hover, setHover] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // The nav's Connect strip waits until the hero's own buttons have scrolled away.
  const [heroCta, setHeroCta] = useState(true);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    const target = document.getElementById("hero-actions");
    const io = new IntersectionObserver(([e]) => setHeroCta(e.isIntersecting), { rootMargin: "-64px 0px 0px 0px" });
    if (target) io.observe(target);
    return () => {
      window.removeEventListener("scroll", on);
      io.disconnect();
    };
  }, []);

  const mark = hover || !face ? "SPOOL" : face;
  const light = prefs.theme === "light";

  return (
    <header className={s.nav} data-scrolled={scrolled || undefined}>
      <Link
        href="/"
        className={s.brand}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        aria-label="Spool, home"
      >
        <PrintText value={mark} length={5} decorative opts={{ speed: 30 }} />
      </Link>

      <nav className={s.links} aria-label="Primary">
        <a href="#how-it-works">How it works</a>
        <a href="#programs">Programs</a>
        <Link href="/board?demo=1">Sample board</Link>
        <Link href="/board/discover">Browse as guest</Link>
      </nav>

      <div className={s.end}>
        <a href="#connect" className={s.cta} data-away={heroCta || undefined} aria-hidden={heroCta || undefined} tabIndex={heroCta ? -1 : undefined}>
          <span className={s.ctaLong}>Connect GitHub</span>
          <span className={s.ctaShort}>Connect</span>
          <ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" />
        </a>
        <button
          type="button"
          className={s.toggle}
          aria-pressed={light}
          onClick={() => setPrefs({ theme: light ? "dark" : "light" })}
          title={light ? "Switch to the night shift (dark)" : "Switch to the day shift (light)"}
        >
          {light ? <Moon size={18} strokeWidth={2} aria-hidden="true" /> : <Sun size={18} strokeWidth={2} aria-hidden="true" />}
          <span className="sr-only">Light theme</span>
        </button>
        <button
          type="button"
          className={s.toggle}
          aria-pressed={prefs.sound}
          onClick={() => setPrefs({ sound: !prefs.sound })}
          title={prefs.sound ? "Turn printer sound off" : "Turn printer sound on"}
        >
          {prefs.sound ? <Volume2 size={18} strokeWidth={2} aria-hidden="true" /> : <VolumeX size={18} strokeWidth={2} aria-hidden="true" />}
          <span className="sr-only">Printer sound</span>
        </button>
      </div>
    </header>
  );
}
