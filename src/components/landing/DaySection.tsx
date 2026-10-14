"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FACES, type Mood } from "@/lib/faces";
import { DayBoard } from "./DayBoard";
import { useSectionFace } from "./mood";
import { SectionHead } from "./SectionHead";
import sec from "./section.module.css";

export function DaySection() {
  const ref = useRef<HTMLElement>(null);
  const [face, setFace] = useState<string>(FACES.watch);
  const timer = useRef(0);
  useSectionFace(ref, face);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // The nav face reacts to whatever just happened in the bay, then settles back to watching.
  const react = useCallback((m: Mood, ms = 1800) => {
    setFace(FACES[m]);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFace(FACES.watch), ms);
  }, []);

  return (
    <section ref={ref} id="today" className={sec.section} aria-labelledby="day-title">
      <SectionHead id="day-title" title="Waiting on you, or waiting on them.">
        Every open thread sits in one of two bays: someone answered and the move is <strong>yours</strong>, or you sent it
        off and the move is <strong>theirs</strong>. Spool sorts by that before anything else. The bay below replays a
        sample day from 08:00. Drag the clock, or open a strip to see its moves.
      </SectionHead>
      <DayBoard onEvent={react} />
    </section>
  );
}
