"use client";

import { useRef, useState } from "react";
import { Bay, Strip } from "@/components/kit/Strip";
import { PrintText } from "@/components/print/PrintText";
import { carrier } from "@/lib/carriers";
import { FACES } from "@/lib/faces";
import { QUIET } from "@/lib/sample-threads";
import { useFlip } from "./flip";
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
  const baysRef = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(14);
  const stalled = ROWS.filter((r) => r.quiet >= limit);
  const waiting = ROWS.filter((r) => r.quiet < limit);
  // The nav face reads the bay: calm when nothing is stalled, asleep when most of it is.
  useSectionFace(ref, faceFor(stalled.length));
  useFlip(baysRef, stalled.length);

  const strip = (r: (typeof ROWS)[number], late: boolean) => (
    <li key={r.id} data-flip={r.id}>
      <Strip
        kind="pr"
        callsign={carrier(r.repo).code}
        num={r.num}
        title={r.title}
        note={`Last word: ${r.last}`}
        quiet={r.quiet}
        state={late ? "stalled" : "them"}
        sample
        label={`${r.repo} #${r.num}, ${r.title}. Quiet ${r.quiet} days${late ? ", stalled" : ""}. Sample data.`}
      />
    </li>
  );

  return (
    <section ref={ref} id="stalled" className={sec.section} aria-labelledby="stalled-title">
      <SectionHead id="stalled-title" title="A PR nobody answers isn’t pending. It’s stalled.">
        Spool counts the days since anyone last spoke on each thread. Past your limit the count is ringed in red pencil and
        the strip moves to the <strong>stalled</strong> bay at the top, with who had the last word. Drag the limit and
        watch the strips move.
      </SectionHead>

      <div className={`${sec.panel} ${s.panel}`}>
        <div className={s.control}>
          <label htmlFor="stall-limit" className={s.label}>
            Call it stalled after
          </label>
          <span className={s.limit}>
            <PrintText value={String(limit)} length={2} align="right" label={`${limit}`} opts={{ speed: 20 }} />
            <span className={s.unit}>days</span>
          </span>
          <input
            id="stall-limit"
            type="range"
            min={MIN}
            max={MAX}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className={s.range}
            style={{ "--p": `${((limit - MIN) / (MAX - MIN)) * 100}%` } as React.CSSProperties}
          />
        </div>

        <div ref={baysRef} className={s.bays}>
          <Bay name="Stalled" which="stalled" as="div" count={<PrintText value={String(stalled.length)} length={1} label={`${stalled.length} stalled`} />} hint={`Quiet ${limit} days or more`}>
            <ul className={s.rack}>{stalled.map((r) => strip(r, true))}</ul>
            {stalled.length === 0 && <p className={s.empty}>Nothing has been quiet that long.</p>}
          </Bay>
          <Bay name="Their move" which="them" as="div" count={<PrintText value={String(waiting.length)} length={1} label={`${waiting.length} waiting`} />} hint="Still inside your limit">
            <ul className={s.rack}>{waiting.map((r) => strip(r, false))}</ul>
            {waiting.length === 0 && <p className={s.empty}>Every thread here is past the limit.</p>}
          </Bay>
        </div>

        <p className={s.foot}>
          <span className={sec.tag}>Sample data</span>
          {stalled.length === 0
            ? "Nothing is past the limit."
            : `${stalled.length} of ${ROWS.length} threads are past the limit and sit at the top of your bay.`}
        </p>
      </div>
    </section>
  );
}
