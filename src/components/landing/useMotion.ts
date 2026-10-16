"use client";

import { useEffect, useState } from "react";
import { usePrefs } from "@/lib/prefs";

/* Whether looping motion may run: the motion switch is on and the system hasn't asked for less. */
export function useMotion() {
  const { motion } = usePrefs();
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return motion && !reduced;
}
