"use client";

import { useEffect } from "react";
import { usePrefs } from "@/lib/prefs";

/*
 * The landing page scrolls natively: the browser scrolls on its compositor thread, so the page
 * stays smooth even while tiles flip or React updates. (An eased JS scroller, Lenis, used to run
 * here; it moved every scroll frame onto the main thread and trailed the wheel, which read as lag.)
 * Anchor links and glideTo still glide, unless motion is reduced or switched off.
 */
export function glideTo(y: number) {
  const still = document.documentElement.dataset.motion === "off" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: y, behavior: still ? "auto" : "smooth" });
}

export function SmoothScroll() {
  const { motion } = usePrefs();

  useEffect(() => {
    if (!motion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const html = document.documentElement;
    html.style.scrollBehavior = "smooth";
    // asks Next to switch the glide off while it changes route, so leaving the page jumps, not glides
    html.dataset.scrollBehavior = "smooth";
    return () => {
      html.style.scrollBehavior = "";
      delete html.dataset.scrollBehavior;
    };
  }, [motion]);

  return null;
}
