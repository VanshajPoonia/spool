"use client";

import { useEffect, useRef, useState } from "react";
import { Strip } from "@/components/kit/Strip";
import { PrintText } from "@/components/print/PrintText";
import { carrier } from "@/lib/carriers";
import { FACES } from "@/lib/faces";
import { usePrefs } from "@/lib/prefs";
import { useSectionFace } from "./mood";
import { SectionHead } from "./SectionHead";
import { glideTo } from "./SmoothScroll";
import sec from "./section.module.css";
import s from "./strip-print.module.css";

/*
 * How a thread becomes a strip: one strip printed field by field as you scroll, one field for
 * each thing Spool works out about a thread.
 *
 * SYNTHETIC: lattice-ui #881 from the sample day, as it stands at 08:00.
 */
const REPO = "lattice/lattice-ui";
const NUM = 881;
const TITLE = "Popover loses focus on scroll";
const CODE = carrier(REPO).code;
const QUIET = 19;

const STEPS = [
  {
    name: "The thread",
    text: "Spool asks GitHub for every open PR and issue you’re part of: yours, ones assigned to you, review requests, mentions and threads you commented on.",
    face: FACES.focus,
  },
  {
    name: "The callsign",
    text: "The repo gets a short callsign, unique among your repos, so you can tell them apart without reading the name.",
    face: FACES.watch,
  },
  {
    name: "The title",
    text: "The title prints as GitHub has it. The paper’s colour says what it is: buff for a PR, blue for an issue, pink for a review.",
    face: FACES.glad,
  },
  {
    name: "Whose move",
    text: "The last comment, review or check run decides whose move it is. You posted a repro here, so the move is theirs.",
    face: FACES.right,
  },
  {
    name: "The silence",
    text: "Spool counts whole days since anyone spoke. Past your limit the count is ringed in red and the strip is stalled.",
    face: FACES.alarm,
  },
] as const;

const LETTERS = "ABCDE";

/* Scroll timeline, as fractions of the pinned stretch: a beat on the blank printer, then five fields. */
const INTRO = 0.06;
const STEP = 0.16;

const BAYS = [
  { key: "you", name: "Your move" },
  { key: "them", name: "Their move" },
  { key: "stalled", name: "Stalled" },
] as const;

export function StripPrint() {
  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const { motion } = usePrefs();
  const [reduced, setReduced] = useState(false);
  const still = !motion || reduced;
  const [step, setStep] = useState(0);
  const shown = still ? 5 : step;
  useSectionFace(ref, STEPS[Math.max(0, shown - 1)].face);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (still) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const el = track.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      const k = p < INTRO ? 0 : Math.min(5, 1 + Math.floor((p - INTRO) / STEP));
      setStep((cur) => (cur === k ? cur : k));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [still]);

  const jump = (i: number) => {
    const el = track.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    glideTo(top + span * (INTRO + STEP * i + STEP * 0.4));
  };

  const bay = shown >= 5 ? "stalled" : shown >= 4 ? "them" : null;
  const state = shown >= 5 ? "stalled" : shown >= 4 ? "them" : "idle";

  return (
    <section ref={ref} id="how-it-works" className={sec.section} aria-labelledby="print-title">
      <SectionHead id="print-title" title="How a thread becomes a strip.">
        Spool reads each thread from GitHub and works out five things before it prints a strip for your bay.
        {still ? " Here is one, printed." : " Keep scrolling to print one."}
      </SectionHead>

      <div ref={track} className={s.track} data-still={still || undefined}>
        <div className={s.stage}>
          <ol className={s.steps}>
            {STEPS.map((st, i) => {
              const on = shown >= i + 1;
              return (
                <li key={st.name} className={s.step} data-on={on || undefined} data-now={(!still && shown === i + 1) || undefined}>
                  {still ? (
                    <span className={s.letter} aria-hidden="true">
                      {LETTERS[i]}
                    </span>
                  ) : (
                    <button type="button" className={s.letter} onClick={() => jump(i)} aria-label={`Go to step ${LETTERS[i]}: ${st.name}`}>
                      {LETTERS[i]}
                    </button>
                  )}
                  <span className={s.stepBody}>
                    <span className={s.stepName}>{st.name}</span>
                    <span className={s.stepText}>{st.text}</span>
                  </span>
                </li>
              );
            })}
          </ol>

          <div className={s.printer}>
            <div className={s.plates} aria-hidden="true">
              {BAYS.map((b) => (
                <span key={b.key} className={s.plate} data-bay={b.key} data-lit={bay === b.key || undefined}>
                  {b.name}
                </span>
              ))}
            </div>

            <div className={s.slot}>
              <span className={s.mouth} aria-hidden="true" />
              {shown >= 1 ? (
                <div className={s.out} key="strip">
                  <Strip
                    size="xl"
                    kind="issue"
                    sample
                    state={state}
                    callsign={shown >= 2 ? <PrintText value={CODE} intro={!still} decorative /> : <span className={s.blank} />}
                    num={<PrintText value={String(NUM)} intro={!still} decorative />}
                    title={shown >= 3 ? <PrintText value={TITLE} intro={!still} decorative className={s.titlePrint} /> : <span className={s.blank} />}
                    note={shown >= 4 ? <PrintText value="You posted a repro. Nobody has answered." intro={!still} decorative className={s.notePrint} /> : undefined}
                    who={shown >= 4 ? "Last: you" : undefined}
                    age={shown >= 4 ? "Sep 25" : undefined}
                    quiet={shown >= 5 ? QUIET : null}
                    quietText={<PrintText value={String(QUIET)} intro={!still} decorative />}
                    label={`${REPO} #${NUM}, ${TITLE}. Their move, stalled ${QUIET} days. Sample data.`}
                  />
                </div>
              ) : (
                <p className={s.waiting}>Blank strip loaded. Scroll to print.</p>
              )}
            </div>

            <p className={s.caption}>
              <span className={sec.tag}>Sample data</span>
              {REPO} #{NUM}, as it stands at 08:00 on the sample day.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
