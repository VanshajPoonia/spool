"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StripLink } from "@/components/kit/Kit";
import { Bay, Strip } from "@/components/kit/Strip";
import { PrintText } from "@/components/print/PrintText";
import { carrier } from "@/lib/carriers";
import { FACES, type Mood } from "@/lib/faces";
import { usePrefs } from "@/lib/prefs";
import { allEvents, DAY_START, hhmm, SAMPLE_DAY, type DayState } from "@/lib/sample-day";
import { dayKind, dayState, dayTicked } from "./dayStrip";
import { useFlip } from "./flip";
import { useInView, useSectionFace } from "./mood";
import s from "./hero.module.css";

const EVENTS = allEvents();
const BEAT = 3200;
// With motion off the bay holds still at a moment with something in each bay.
const STILL_AT = 4;

/* The face watches the pointer, blinks, dozes when ignored and reacts to the bay. */
function useFace(faceRef: React.RefObject<HTMLElement | null>) {
  const [face, setFace] = useState<string>(FACES.calm);
  const hold = useRef(0);
  const last = useRef(0);
  const asleep = useRef(false);
  const current = useRef<string>(FACES.calm);

  const show = useCallback((f: string) => {
    current.current = f;
    setFace(f);
  }, []);

  const react = useCallback(
    (mood: Mood, ms = 1600) => {
      hold.current = performance.now() + ms;
      show(FACES[mood]);
    },
    [show],
  );

  useEffect(() => {
    last.current = performance.now();
    let moveTimer = 0;
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      last.current = now;
      if (asleep.current) {
        asleep.current = false;
        hold.current = now + 700;
        show(FACES.alarm);
        return;
      }
      if (now < hold.current) return;
      const el = faceRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const next = Math.abs(dx) < 90 && Math.abs(dy) < 90 ? FACES.stars : dx < -160 ? FACES.left : dx > 160 ? FACES.right : FACES.watch;
      if (next !== current.current) show(next);
      window.clearTimeout(moveTimer);
      moveTimer = window.setTimeout(() => {
        if (performance.now() >= hold.current) show(FACES.calm);
      }, 1400);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const blinkLoop = window.setInterval(() => {
      const now = performance.now();
      if (now < hold.current) return;
      if (!asleep.current && now - last.current > 12000) {
        asleep.current = true;
        show(FACES.sleepy);
        return;
      }
      if (current.current === FACES.calm && Math.random() < 0.45) {
        show(FACES.blink);
        window.setTimeout(() => {
          if (current.current === FACES.blink && !asleep.current) show(FACES.calm);
        }, 260);
      }
    }, 1900);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.clearInterval(blinkLoop);
      window.clearTimeout(moveTimer);
    };
  }, [faceRef, show]);

  return { face, react };
}

type Slot = { id: string; st: DayState; at: number };

/* The sample bay after the first n events of the day. */
function bayAt(n: number): Slot[] {
  const slots = new Map<string, Slot>(SAMPLE_DAY.map((r) => [r.id, { id: r.id, st: r.events[0].state, at: DAY_START }]));
  for (const e of EVENTS.slice(0, n)) slots.set(e.row.id, { id: e.row.id, st: { ...e.state, quiet: 0 }, at: e.at });
  return [...slots.values()];
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const bayRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLSpanElement>(null);
  const { face, react } = useFace(faceRef);
  const { visible } = useInView(bayRef, "0px");
  const [step, setStep] = useState(0);
  const { motion } = usePrefs();
  const [reduced, setReduced] = useState(false);
  const still = !motion || reduced;
  const n = still ? STILL_AT : step;
  useSectionFace(ref, null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // One event every beat; after the last one the day starts over.
  useEffect(() => {
    if (still || !visible) return;
    const id = window.setTimeout(() => setStep((k) => (k >= EVENTS.length ? 0 : k + 1)), step >= EVENTS.length ? BEAT * 2 : BEAT);
    return () => window.clearTimeout(id);
  }, [step, still, visible]);

  useEffect(() => {
    const mood = n > 0 ? EVENTS[n - 1]?.state.mood : undefined;
    if (mood) react(mood, 1500);
  }, [n, react]);

  const slots = useMemo(() => bayAt(n), [n]);
  useFlip(bayRef, n);

  const mine = slots.filter((x) => x.st.next === "YOU").sort((a, b) => b.at - a.at);
  const theirs = slots.filter((x) => x.st.next !== "YOU").sort((a, b) => {
    const rank = (x: Slot) => (x.st.next === "DONE" ? 2 : (x.st.quiet ?? 0) >= 14 ? 0 : 1);
    return rank(a) - rank(b) || b.at - a.at;
  });
  const clock = n > 0 ? hhmm(EVENTS[n - 1].at) : hhmm(DAY_START);

  const strip = (x: Slot) => {
    const row = SAMPLE_DAY.find((r) => r.id === x.id)!;
    return (
      <Strip
        key={x.id}
        as="li"
        data={{ "data-flip": x.id }}
        kind={dayKind(row, x.st)}
        callsign={carrier(row.repo).code}
        num={row.num}
        title={row.title}
        note={x.st.note}
        who={x.st.status}
        age={x.at > DAY_START ? hhmm(x.at) : "earlier"}
        quiet={x.st.next === "DONE" ? null : (x.st.quiet ?? 0)}
        state={dayState(x.st)}
        ticked={dayTicked(x.st)}
        sample
      />
    );
  };

  return (
    <section ref={ref} className={s.hero} aria-labelledby="hero-title">
      <div className={s.copy}>
        <h1 id="hero-title" className={s.title}>
          The open source manager that knows whose move it is.
        </h1>
        <p className={s.offer}>
          Track your PRs, issues, review requests and mentions across GitHub in one bay, sorted by who owes the next reply.
        </p>
        <div id="hero-actions" className={s.actions}>
          <StripLink href="#connect" onPointerEnter={() => react("stars", 1200)}>
            Connect GitHub
          </StripLink>
          <StripLink href="/board?demo=1" variant="quiet" onPointerEnter={() => react("watch", 1200)}>
            Open the sample board
          </StripLink>
        </div>
        <p className={s.guest}>
          No token? <Link href="/board/discover">Browse as a guest</Link>: Discover, your plan, GSoC and programs work without one.
        </p>
      </div>

      <div className={s.console} ref={bayRef}>
        <div className={s.consoleHead}>
          <span className={s.face} ref={faceRef}>
            <PrintText value={face} length={5} decorative opts={{ speed: 34 }} />
          </span>
          <span className={s.position}>
            <span className={s.positionName}>Sample position</span>
            <span className={s.positionNote}>A made-up contributor&rsquo;s day, one move at a time</span>
          </span>
          <span className={s.clock}>
            <PrintText value={clock} length={5} label={`Sample clock ${clock}`} />
          </span>
        </div>
        <div className={s.bays}>
          <Bay
            name="Your move"
            which="you"
            as="div"
            count={<PrintText value={String(mine.length)} length={1} label={`${mine.length} on you`} />}
            hint="They answered. You owe the next word."
          >
            <ul className={s.rack}>{mine.map(strip)}</ul>
            {mine.length === 0 && <p className={s.empty}>Nothing waiting on you right now.</p>}
          </Bay>
          <Bay
            name="Their move"
            which="them"
            as="div"
            count={<PrintText value={String(theirs.filter((x) => x.st.next !== "DONE").length)} length={1} />}
            hint="You sent it off. Silence is counted in days."
          >
            <ul className={s.rack}>{theirs.map(strip)}</ul>
          </Bay>
        </div>
      </div>
    </section>
  );
}
