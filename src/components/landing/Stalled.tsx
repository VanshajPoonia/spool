"use client";

import { CSSProperties, useRef, useState } from "react";
import { FlapText } from "@/components/flap/Flap";
import { CarrierTag, Lamp, Pictogram } from "@/components/kit/Kit";
import { FACES } from "@/lib/faces";
import { QUIET } from "@/lib/sample-threads";
import { useSectionFace } from "./mood";
import { SectionHead } from "./SectionHead";
import sec from "./section.module.css";
import s from "./stalled.module.css";

const MIN = 3;
const MAX = 30;
const ROWS = [...QUIET].sort((a, b) => b.quiet - a.quiet);

function faceFor(n: number) {
  if (n === 0) return FACES.calm;
  if (n === 1) return FACES.watch;
  if (n <= 3) return FACES.side;
  return FACES.sleepy;
}

export function Stalled() {
  const ref = useRef<HTMLElement>(null);
  const [limit, setLimit] = useState(14);
  const delayed = ROWS.filter((r) => r.quiet >= limit).length;
  // The nav face reads the board: calm when nothing is stalled, asleep when most of it is.
  useSectionFace(ref, faceFor(delayed));
  const days = Array.from({ length: MAX - MIN + 1 }, (_, i) => MIN + i);

  return (
    <section ref={ref} id="stalled" className={sec.section} aria-labelledby="stalled-title">
      <SectionHead id="stalled-title" title="A PR nobody answers isn’t pending. It’s stalled." pict="hourglass">
        Spool counts the days since anyone last spoke on each thread. Past your limit it&rsquo;s marked{" "}
        <strong>DELAYED</strong> and moves up the board, with who had the last word and when. Drag the limit and watch the
        board re-sort.
      </SectionHead>

      <div className={`${sec.panel} ${s.panel} ${sec.rise}`}>
        <div className={s.control}>
          <div className={s.controlText}>
            <Pictogram name="hourglass" className={s.glass} />
            <label htmlFor="stall-limit" className={s.label}>
              Call it stalled after
            </label>
            <span className={s.limit}>
              <FlapText value={String(limit)} length={2} align="right" size="40px" label={`${limit}`} opts={{ maxSteps: 4, step: 40 }} />
              <span className={s.unit}>days</span>
            </span>
          </div>
          <div className={s.ruler}>
            <input
              id="stall-limit"
              type="range"
              min={MIN}
              max={MAX}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className={s.range}
            />
            <div className={s.days} aria-hidden="true">
              {days.map((d) => (
                <span key={d} className={s.day} data-on={d >= limit || undefined} data-at={d === limit || undefined}>
                  {d % 7 === 0 || d === MIN || d === MAX ? d : ""}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={s.board} role="table" aria-label="Threads by days since the last reply">
          <div className={s.labels} role="row">
            <span role="columnheader">Repo</span>
            <span role="columnheader">Thread</span>
            <span role="columnheader" className={s.colLast}>
              Last word
            </span>
            <span role="columnheader">Quiet</span>
            <span role="columnheader">Status</span>
          </div>
          <div className={s.rows} style={{ "--cut": delayed } as CSSProperties}>
            <div className={s.cut} aria-hidden="true" data-hidden={delayed === 0 || delayed === ROWS.length || undefined}>
              <span>
                {limit} day limit
              </span>
            </div>
            {ROWS.map((r) => {
              const late = r.quiet >= limit;
              return (
                <div key={r.id} role="row" className={s.row} data-late={late || undefined}>
                  <CarrierTag repo={r.repo} />
                  <span className={s.thread}>
                    <span className={s.title}>{r.title}</span>
                    <span className={s.ref}>
                      {r.repo}#{r.num}
                    </span>
                  </span>
                  <span className={s.colLast}>{r.last}</span>
                  <FlapText value={`${r.quiet}D`} length={3} align="right" tone={late ? "wait" : "dim"} introOnView={3} />
                  <span className={s.status}>
                    <Lamp state={late ? "wait" : "idle"} />
                    <FlapText value={late ? "DELAYED" : "ON TIME"} length={7} tone={late ? "wait" : undefined} opts={{ stagger: 24, maxSteps: 8 }} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <p className={s.foot}>
          <span className={sec.tag}>Sample data</span>
          {delayed === 0
            ? "Nothing is past the limit."
            : `${delayed} of ${ROWS.length} threads are past the limit and sit at the top of your board.`}
        </p>
      </div>
    </section>
  );
}
