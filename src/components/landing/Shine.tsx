"use client";

import { useEffect } from "react";

/*
 * Lights the hairline of whichever [data-shine] panel the pointer is over: it writes the pointer's
 * position into --mx and --my and sets data-lit (the drawing is in globals.css). One listener for the
 * page, one style write per frame, and nothing at all on touch screens.
 */
export function Shine() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let lit: HTMLElement | null = null;
    let raf = 0;
    let x = 0;
    let y = 0;

    const paint = () => {
      raf = 0;
      if (!lit) return;
      const r = lit.getBoundingClientRect();
      lit.style.setProperty("--mx", `${x - r.left}px`);
      lit.style.setProperty("--my", `${y - r.top}px`);
    };

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const target = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-shine]") : null;
      if (target !== lit) {
        if (lit) delete lit.dataset.lit;
        lit = target;
        if (!lit) return;
        // place the light before it fades in, so it never starts from the last panel's spot
        paint();
        lit.dataset.lit = "";
        return;
      }
      if (lit && !raf) raf = requestAnimationFrame(paint);
    };

    const onLeave = () => {
      if (lit) delete lit.dataset.lit;
      lit = null;
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      onLeave();
    };
  }, []);

  return null;
}
