"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, MessageSquare } from "lucide-react";
import { StripLink } from "@/components/kit/Kit";
import { StatusIcon, Strip } from "@/components/kit/Strip";
import strip from "@/components/kit/strip.module.css";
import { PrintText } from "@/components/print/PrintText";
import { carrier } from "@/lib/carriers";
import { FACES } from "@/lib/faces";
import { CallsignRecord } from "./Callsigns";
import { useSectionFace } from "./mood";
import { onScrollFrame, pinned, pinnedScrollY, ramp } from "./scroll";
import { useMotion } from "./useMotion";
import sec from "./section.module.css";
import s from "./anatomy.module.css";

/*
 * How a thread becomes a row, as a sideways walk. The panel pops out to fill the screen and holds while the page
 * scrolls; the scroll carries a line of cards past, one for each thing Spool works out, and the row at the top
 * builds as each card arrives, with the part it explains lit. At the end the panel settles back into the page.
 * With motion off the row is whole and the cards sit in a row you can swipe.
 *
 * SYNTHETIC: lattice-ui #881 from the sample day, as it stands at 08:00.
 */
const REPO = "lattice/lattice-ui";
const NUM = 881;
const TITLE = "Popover loses focus on scroll";
const CODE = carrier(REPO).code;
const QUIET = 19;
const LIMIT = 14;

const PARTS = [
  {
    key: "A",
    name: "The thread",
    text: "Spool asks GitHub for every open PR and issue you’re part of: yours, ones assigned to you, review requests, mentions and threads you commented on.",
    face: FACES.focus,
    part: strip.status,
  },
  {
    key: "B",
    name: "The callsign",
    text: "The repo gets a short callsign, unique among your repos, so you can tell them apart without reading the name.",
    face: FACES.watch,
    part: strip.cs,
  },
  {
    key: "C",
    name: "The title",
    text: "The title prints as GitHub has it, and the label after it says what kind of thread it is: a PR, an issue or a review.",
    face: FACES.glad,
    part: strip.title,
  },
  {
    key: "D",
    name: "Whose move",
    text: "The last comment, review or check run decides whose move it is. You posted a repro here, so the move is theirs.",
    face: FACES.right,
    part: strip.last,
  },
  {
    key: "E",
    name: "The silence",
    text: "Spool counts whole days since anyone spoke. Past your limit the count turns red and the thread is stalled.",
    face: FACES.alarm,
    part: strip.quiet,
  },
] as const;

type Key = (typeof PARTS)[number]["key"];

/* What each card shows next to its words: the evidence Spool reads, and what it makes of it. */
function Evidence({ k }: { k: Key }) {
  if (k === "A")
    return (
      <div className={s.ev}>
        <span className={s.evLabel}>Searches it runs</span>
        <span className={s.chips}>
          {["author", "assignee", "review-requested", "mentions", "commenter"].map((q) => (
            <span key={q} className={s.qchip} data-hit={q === "commenter" || undefined}>
              {q}:you
            </span>
          ))}
        </span>
        <span className={s.evOut}>
          <ArrowRight size={13} />
          Found here: you commented
        </span>
      </div>
    );
  if (k === "B")
    return (
      <div className={s.ev}>
        <span className={s.evLabel}>From the repo&rsquo;s name</span>
        <span className={s.repoName}>
          lattice/<b>l</b>attice-<b>u</b>i
        </span>
        <span className={s.evOut}>
          <ArrowRight size={13} />
          <span className={s.code}>{CODE}</span>
        </span>
      </div>
    );
  if (k === "C")
    return (
      <div className={s.ev}>
        <span className={s.evLabel}>As GitHub has it</span>
        <span className={s.evTitle}>{TITLE}</span>
        <span className={s.evOut}>
          <ArrowRight size={13} />
          <span className={s.kind}>
            <span aria-hidden="true" />
            Issue
          </span>
        </span>
      </div>
    );
  if (k === "D")
    return (
      <div className={s.ev}>
        <span className={s.evLabel}>The last word</span>
        <span className={s.said}>
          <MessageSquare size={13} />
          <span>
            <b>You</b> posted a repro
          </span>
          <span className={s.saidWhen}>Sep 25</span>
        </span>
        <span className={s.evOut}>
          <ArrowRight size={13} />
          <StatusIcon state="them" />
          Their move
        </span>
      </div>
    );
  return (
    <div className={s.ev}>
      <span className={s.evLabel}>Days since anyone spoke</span>
      <span className={s.meter} style={{ "--q": QUIET / 24, "--l": LIMIT / 24 } as CSSProperties}>
        <span className={s.meterFill} />
        <span className={s.meterLimit}>
          <span>limit {LIMIT}d</span>
        </span>
      </span>
      <span className={s.evOut}>
        <ArrowRight size={13} />
        <StatusIcon state="stalled" />
        {QUIET} days: stalled
      </span>
    </div>
  );
}

function Card({ i, active, children }: { i: number; active: boolean; children: ReactNode }) {
  return (
    <li className={s.card} data-on={active || undefined} data-card={i}>
      {children}
    </li>
  );
}

export function Anatomy() {
  const ref = useRef<HTMLElement>(null);
  const runRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const motion = useMotion();
  // which card the scroll has brought to the reading line: -1 before the first, PARTS.length for the last word
  const [at, setAt] = useState(-1);
  const current = useRef(-1);
  const [marks, setMarks] = useState<Partial<Record<Key, number>>>({});
  const [face, setFace] = useState<string>(FACES.calm);

  const shown = motion ? Math.min(PARTS.length, at + 1) : PARTS.length;
  const focus: Key | null = motion && at >= 0 && at < PARTS.length ? PARTS[at].key : null;
  useSectionFace(ref, focus ? PARTS.find((p) => p.key === focus)!.face : shown ? PARTS[shown - 1].face : face);

  // The scroll pops the panel out, walks the cards past, and lets the panel settle back.
  useEffect(() => {
    const run = runRef.current;
    const frame = frameRef.current;
    const pop = popRef.current;
    const track = trackRef.current;
    if (!motion || !run || !frame || !pop || !track) return;
    return onScrollFrame(() => {
      const p = pinned(run, frame);
      const out = ramp(0, 0.07, p) * (1 - ramp(0.94, 1, p));
      const walk = ramp(0.08, 0.92, p);
      const room = track.parentElement!.clientWidth;
      const max = Math.max(0, track.scrollWidth - room);
      const cards = Array.from(track.children) as HTMLElement[];
      // The walk rests on each card, standing it at the left edge of the text, then glides to the next:
      // each card holds for the first and last stretch of its share of the scroll and moves in the middle.
      const home = (i: number) => Math.min(max, cards[i].offsetLeft - cards[0].offsetLeft);
      const u = walk * (cards.length - 1);
      const i = Math.min(cards.length - 2, Math.floor(u));
      const g = ramp(0.3, 0.7, u - i);
      const shift = home(i) + (home(i + 1) - home(i)) * (g * g * (3 - 2 * g));
      const next = walk < 0.015 ? -1 : Math.round(u);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      return () => {
        pop.style.setProperty("--ix", `${((1 - out) * Math.min(48, vw * 0.04)).toFixed(1)}px`);
        pop.style.setProperty("--iy", `${((1 - out) * vh * 0.07).toFixed(1)}px`);
        pop.style.setProperty("--r", `${((1 - out) * 24).toFixed(1)}px`);
        track.style.transform = `translate3d(${(-shift).toFixed(1)}px, 0, 0)`;
        if (next !== current.current) {
          current.current = next;
          setAt(next);
        }
      };
    });
  }, [motion]);

  // Picking a letter scrolls the page to where its card is the one being read.
  const goTo = (i: number) => {
    const run = runRef.current;
    const frame = frameRef.current;
    const track = trackRef.current;
    if (!motion || !run || !frame || !track) {
      (track?.children[i] as HTMLElement | undefined)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      return;
    }
    const walk = Math.max(0.02, i / (track.children.length - 1));
    window.scrollTo({ top: pinnedScrollY(run, frame, 0.08 + walk * 0.84), behavior: "smooth" });
  };

  // Tag each part of the printed row and measure where its callout stands.
  useLayoutEffect(() => {
    const el = plate.current;
    if (!el) return;
    const measure = () => {
      const base = el.getBoundingClientRect();
      const next: Partial<Record<Key, number>> = {};
      el.querySelector<HTMLElement>(`.${CSS.escape(strip.paper)}`)?.setAttribute("data-paper", "");
      for (const p of PARTS) {
        const node = el.querySelector<HTMLElement>(`.${CSS.escape(p.part)}`);
        if (!node) continue;
        // highlighting dims the row's direct children, so a part nested deeper is tagged on its parent
        const top = node.parentElement?.hasAttribute("data-paper") ? node : node.parentElement;
        if (top) top.dataset.part = p.key;
        const r = node.getBoundingClientRect();
        // the callout sits over the start of long parts, over the middle of short ones
        next[p.key] = r.width > 160 ? r.left - base.left + 28 : r.left - base.left + r.width / 2;
      }
      setMarks((cur) => (JSON.stringify(cur) === JSON.stringify(next) ? cur : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [shown]);

  const state = shown >= 5 ? "stalled" : shown >= 4 ? "them" : "idle";

  return (
    <section ref={ref} id="how-it-works" className={`${sec.section} ${s.section}`} aria-labelledby="anatomy-title">
      <div ref={runRef} className={s.runway} data-pin={motion || undefined}>
        <div ref={frameRef} className={s.frame}>
          <div ref={popRef} className={s.pop} data-focus={focus ?? undefined}>
            <div className={s.top}>
              <div className={s.head}>
                <h2 id="anatomy-title" className={s.h2}>
                  How a thread becomes a row.
                </h2>
                <p className={s.lede}>
                  Spool reads each thread from GitHub and works out five things before it gives it a row in your bay.
                  {motion ? " Keep scrolling: the row builds as each one goes by." : " Here they are, one card each."}
                </p>
              </div>

              <div className={s.stage} ref={plate}>
                <div className={s.marks} aria-hidden="true">
                  {PARTS.map((p, i) => (
                    <span
                      key={p.key}
                      className={s.mark}
                      data-on={(shown > i && marks[p.key] !== undefined) || undefined}
                      data-lit={focus === p.key || undefined}
                      style={{ left: `${marks[p.key] ?? 0}px` }}
                    >
                      {p.key}
                    </span>
                  ))}
                </div>

                <Strip
                  size="xl"
                  kind="issue"
                  sample
                  state={shown >= 1 ? state : "idle"}
                  callsign={shown >= 2 ? <PrintText value={CODE} intro={motion} decorative /> : <span className={s.blank} />}
                  num={shown >= 2 ? <PrintText value={String(NUM)} intro={motion} decorative /> : undefined}
                  title={shown >= 3 ? <PrintText value={TITLE} intro={motion} decorative className={s.titlePrint} /> : <span className={s.blankWide} />}
                  note={shown >= 4 ? "You posted a repro. Nobody has answered." : undefined}
                  who={shown >= 4 ? "Last: you" : undefined}
                  age={shown >= 4 ? "Sep 25" : undefined}
                  quiet={shown >= 5 ? QUIET : null}
                  quietText={<PrintText value={String(QUIET)} intro={motion} decorative />}
                  label={`${REPO} #${NUM}, ${TITLE}. Their move, stalled ${QUIET} days. Sample data.`}
                />

                <p className={s.caption}>
                  <span className={sec.tag}>Sample data</span>
                  {REPO} #{NUM}, as it stands at 08:00 on the sample day.
                </p>
              </div>
            </div>

            <div className={s.rail}>
              <ol ref={trackRef} className={s.track}>
                {PARTS.map((p, i) => (
                  <Card key={p.key} i={i} active={!motion || at === i}>
                    <span className={s.cardHead}>
                      <span className={s.letter} aria-hidden="true">
                        {p.key}
                      </span>
                      <span className={s.cardName}>{p.name}</span>
                    </span>
                    <span className={s.cardText}>{p.text}</span>
                    <Evidence k={p.key} />
                  </Card>
                ))}
                <Card i={PARTS.length} active={!motion || at === PARTS.length}>
                  <span className={s.cardHead}>
                    <span className={s.cardName}>That&rsquo;s one row.</span>
                  </span>
                  <span className={s.cardText}>
                    Your bay is every thread like it, sorted by whose move it is, with the stalled ones on top.
                  </span>
                  <StripLink href="/board?demo=1" variant="quiet" className={s.cardLink}>
                    Open the sample board
                  </StripLink>
                </Card>
              </ol>
            </div>

            <nav className={s.steps} aria-label="The five parts">
              {PARTS.map((p, i) => (
                <button key={p.key} type="button" className={s.step} data-on={shown > i || undefined} aria-current={focus === p.key ? "step" : undefined} onClick={() => goTo(i)}>
                  <span className={s.stepLetter}>{p.key}</span>
                  <span className={s.stepName}>{p.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className={s.records}>
        <div className={s.subHead}>
          <h3 className={s.subTitle}>Every repo gets a callsign.</h3>
          <p className={s.subLede}>
            Each repo you contribute to gets a short code, unique among your repos and the same everywhere it appears. It
            leads every row, so you can tell repos apart without reading. Pick one to see its record.
          </p>
        </div>
        <CallsignRecord onFace={setFace} />
      </div>
    </section>
  );
}
