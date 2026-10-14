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

  // The nav face reacts to whatever just happened on the board, then settles back to watching.
  const react = useCallback((m: Mood, ms = 1800) => {
    setFace(FACES[m]);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFace(FACES.watch), ms);
  }, []);

  return (
    <section ref={ref} id="today" className={sec.section} aria-labelledby="day-title">
      <SectionHead id="day-title" title="Waiting on you, or waiting on them." pict="wall">
        Every open thread is in one of two states: someone answered and the next move is yours, or you sent it off and
        you&rsquo;re waiting. Spool calls them <strong>arrivals</strong> and <strong>departures</strong>, and sorts by that
        before anything else. The board below replays a sample day from 08:00. Drag the clock, or open a row to see its
        history.
      </SectionHead>
      <div className={sec.rise}>
        <DayBoard onEvent={react} />
      </div>
    </section>
  );
}
