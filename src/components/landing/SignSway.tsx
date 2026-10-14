"use client";

import { useEffect } from "react";
import { usePrefs } from "@/lib/prefs";

/*
 * The section signs hang from rods, so a fast scroll sets them swinging: the plate leans
 * against the direction of travel, then a damped spring brings it back through a swing or two.
 * One loop for every sign, running only while something moves. Off with reduced motion.
 */
const STIFF = 140;
const DAMP = 7.5;
const MAX = 5;

export function SignSway() {
  const { motion } = usePrefs();

  useEffect(() => {
    if (!motion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const plates = Array.from(document.querySelectorAll<HTMLElement>("[data-sway]"));
    if (!plates.length) return;

    let raf = 0;
    let angle = 0;
    let vel = 0;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let target = 0;
    let written = "";

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000));
      lastT = now;
      const y = window.scrollY;
      const speed = (y - lastY) / dt;
      lastY = y;
      // ease the push in so one jerky frame doesn't kick the signs
      target += (Math.max(-MAX, Math.min(MAX, -speed / 320)) - target) * 0.25;
      const acc = STIFF * (target - angle) - DAMP * vel;
      vel += acc * dt;
      angle += vel * dt;

      const out = Math.abs(angle) < 0.01 ? "" : `x ${angle.toFixed(2)}deg`;
      if (out !== written) {
        written = out;
        for (const p of plates) p.style.rotate = out;
      }
      const resting = Math.abs(angle) < 0.01 && Math.abs(vel) < 0.02 && Math.abs(target) < 0.01;
      raf = resting ? 0 : requestAnimationFrame(tick);
    };

    const onScroll = () => {
      if (raf) return;
      // the scroll that woke the loop counts as one frame's travel from where the signs last rested
      lastT = performance.now() - 16;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      for (const p of plates) p.style.rotate = "";
    };
  }, [motion]);

  return null;
}
