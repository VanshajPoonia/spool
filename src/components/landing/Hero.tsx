"use client";

import Link from "next/link";
import { Fragment, useRef } from "react";
import { HoverArrow, StripLink } from "@/components/kit/Kit";
import type { YC } from "@/lib/programs";
import { daysUntil, parseMonthDay } from "@/lib/program-dates";
import { useNow } from "@/lib/time";
import { useSectionFace } from "./mood";
import { SampleWindow } from "./SampleWindow";
import s from "./hero.module.css";

const HEADLINE = "The open source manager that knows whose move it is.";

/* The next date worth knowing, live from Y Combinator's apply page, counted from today. */
function NextDeadline({ yc }: { yc: YC | null }) {
  const now = useNow();
  if (!yc || yc.afterDeadline) return null;
  const date = now ? parseMonthDay(yc.deadline, now, false) : null;
  const days = date && now ? daysUntil(date.toISOString(), now) : null;
  return (
    <a href="#programs" className={s.next}>
      <span className={s.nextLabel}>Next deadline</span>
      <span className={s.nextText}>
        YC {yc.batch} closes {days !== null && days >= 0 ? `in ${days} ${days === 1 ? "day" : "days"}` : yc.deadline}
      </span>
      <HoverArrow />
    </a>
  );
}

export function Hero({ yc }: { yc: YC | null }) {
  const ref = useRef<HTMLElement>(null);
  useSectionFace(ref, null);

  return (
    <section ref={ref} className={s.hero} aria-labelledby="hero-title">
      {/* each word rises out of a blur in turn; screen readers get the sentence whole */}
      <h1 id="hero-title" className={s.title}>
        <span className="sr-only">{HEADLINE}</span>
        <span aria-hidden="true">
          {HEADLINE.split(" ").map((w, i) => (
            <Fragment key={i}>
              <span className={s.word} style={{ "--i": i } as React.CSSProperties}>
                {w}
              </span>{" "}
            </Fragment>
          ))}
        </span>
      </h1>

      <div className={s.sub}>
        <div className={s.copy}>
          <p className={s.offer}>
            Track your PRs, issues, review requests and mentions across GitHub in one bay, sorted by who owes the next reply.
          </p>
          <div id="hero-actions" className={s.actions}>
            <StripLink href="#connect">Connect GitHub</StripLink>
            <StripLink href="/board?demo=1" variant="quiet">
              Open the sample board
            </StripLink>
          </div>
          <p className={s.guest}>
            No token? <Link href="/board/discover">Browse as a guest</Link>: Discover, your plan, GSoC and programs work without one.
          </p>
        </div>
        <NextDeadline yc={yc} />
      </div>

      <div className={s.stage}>
        <SampleWindow />
      </div>
    </section>
  );
}
