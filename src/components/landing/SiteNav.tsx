"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { FlapText } from "@/components/flap/Flap";
import { Pictogram } from "@/components/kit/Kit";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { usePageFace } from "./mood";
import s from "./nav.module.css";

export function SiteNav() {
  const { face } = usePageFace();
  const prefs = usePrefs();
  const [hover, setHover] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // The nav's Connect button waits until the hero's own buttons have scrolled away.
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
        <FlapText value={mark} length={5} size="30px" decorative opts={{ stagger: 26, maxSteps: 8, step: 48 }} />
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
          <Pictogram name="arrow" className={s.ctaIcon} />
        </a>
        <button
          type="button"
          className={s.sound}
          aria-pressed={prefs.sound}
          onClick={() => setPrefs({ sound: !prefs.sound })}
          title={prefs.sound ? "Turn flap sound off" : "Turn flap sound on"}
        >
          {prefs.sound ? <Volume2 size={18} strokeWidth={2} /> : <VolumeX size={18} strokeWidth={2} />}
          <span className="sr-only">Flap sound</span>
        </button>
      </div>
    </header>
  );
}
