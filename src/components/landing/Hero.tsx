"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlapText } from "@/components/flap/Flap";
import { riffle, type SetOpts } from "@/components/flap/engine";
import { SignLink } from "@/components/kit/Kit";
import { FACES, type Mood } from "@/lib/faces";
import { useSectionFace } from "./mood";
import s from "./hero.module.css";

const BLINK: SetOpts = { maxSteps: 2, step: 38, stagger: 0 };
const TURN: SetOpts = { maxSteps: 4, step: 46, stagger: 18 };

function useLocalClock() {
  const [now, setNow] = useState("  :  ");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    };
    tick();
    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/* The face watches the pointer, blinks, dozes when ignored and reacts to the board. */
function useFace(faceRef: React.RefObject<HTMLElement | null>) {
  const [face, setFace] = useState<string>(FACES.calm);
  const [opts, setOpts] = useState<SetOpts>(TURN);
  const hold = useRef(0);
  const last = useRef(0);
  const asleep = useRef(false);
  const current = useRef<string>(FACES.calm);

  const show = useCallback((f: string, o: SetOpts = TURN) => {
    current.current = f;
    setOpts(o);
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
      const next = Math.abs(dx) < 140 && Math.abs(dy) < 140 ? FACES.stars : dx < -180 ? FACES.left : dx > 180 ? FACES.right : FACES.watch;
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
        show(FACES.blink, BLINK);
        window.setTimeout(() => {
          if (current.current === FACES.blink && !asleep.current) show(FACES.calm, BLINK);
        }, 260);
      }
    }, 1900);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.clearInterval(blinkLoop);
      window.clearTimeout(moveTimer);
    };
  }, [faceRef, show]);

  return { face, opts, react };
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const faceRef = useRef<HTMLSpanElement>(null);
  const clock = useLocalClock();
  const { face, opts, react } = useFace(faceRef);
  useSectionFace(ref, null);

  // Running a mouse along the headline riffles each tile it crosses.
  const onRiffle = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const tile = (e.target as Element).closest(".flap");
    if (tile && !tile.closest("[data-face]")) riffle(tile);
  };

  // The painted housing catches a soft light where the mouse is; moved by transform only.
  const lightRef = useRef<HTMLSpanElement>(null);
  const onLight = (e: React.PointerEvent<HTMLDivElement>) => {
    const light = lightRef.current;
    if (e.pointerType !== "mouse" || !light) return;
    const r = e.currentTarget.getBoundingClientRect();
    light.style.transform = `translate3d(${(e.clientX - r.left).toFixed(0)}px, ${(e.clientY - r.top).toFixed(0)}px, 0)`;
    light.dataset.on = "";
  };
  const offLight = () => {
    if (lightRef.current) delete lightRef.current.dataset.on;
  };

  return (
    <section ref={ref} className={s.hero} aria-labelledby="hero-title">
      <div className={s.housing} onPointerMove={onLight} onPointerLeave={offLight}>
        <span className={s.lightBox} aria-hidden="true">
          <span ref={lightRef} className={s.light} />
        </span>
        <span className={s.screw} data-pos="tl" aria-hidden="true" />
        <span className={s.screw} data-pos="tr" aria-hidden="true" />
        <span className={s.screw} data-pos="bl" aria-hidden="true" />
        <span className={s.screw} data-pos="br" aria-hidden="true" />
        {/* what Spool does on the left, the headline board on the right; the board goes on top on narrow screens */}
        <div className={s.deck}>
          <div className={s.stage}>
            <span className={s.clock}>
              <span className={s.clockLabel}>Local time</span>
              <FlapText value={clock} length={5} size="28px" label={`Local time ${clock}`} opts={{ step: 50, maxSteps: 6 }} />
            </span>

            <div className={s.bezel}>
              <div className={s.big} aria-hidden="true" onPointerOver={onRiffle}>
                <div className={s.bigWide}>
                  <div className={s.bigRow}>
                    <FlapText value="WHO MOVES" length={11} intro={8} introDelay={150} decorative opts={{ stagger: 34, step: 58 }} />
                  </div>
                  <div className={s.bigRow}>
                    <FlapText value="NEXT?" length={6} intro={8} introDelay={520} decorative opts={{ stagger: 34, step: 58 }} />
                    <span ref={faceRef} className={s.face} data-face="">
                      <FlapText value={face} length={5} intro={10} introDelay={900} decorative opts={opts} />
                    </span>
                  </div>
                </div>
                <div className={s.bigNarrow}>
                  <FlapText value="WHO" length={5} intro={8} introDelay={150} decorative opts={{ stagger: 34, step: 58 }} />
                  <FlapText value="MOVES" length={5} intro={8} introDelay={330} decorative opts={{ stagger: 34, step: 58 }} />
                  <FlapText value="NEXT?" length={5} intro={8} introDelay={520} decorative opts={{ stagger: 34, step: 58 }} />
                  <span data-face="">
                    <FlapText value={face} length={5} intro={10} introDelay={900} decorative opts={opts} />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={s.copy}>
            <h1 id="hero-title" className={s.title}>
              The open source manager that knows whose move it is.
            </h1>
            <p className={s.offer}>
              Track your PRs, issues, review requests and mentions across GitHub on one board, sorted by who owes the next reply.
            </p>
            <div id="hero-actions" className={s.actions}>
              <SignLink href="#connect" variant="sign" onPointerEnter={() => react("stars", 1200)}>
                Connect GitHub
              </SignLink>
              <SignLink href="/board?demo=1" variant="board" onPointerEnter={() => react("watch", 1200)}>
                Open the sample board
              </SignLink>
            </div>
            <p className={s.guest}>
              No token? <Link href="/board/discover">Browse as a guest</Link>: Discover, your plan, GSoC and programs work without one.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
