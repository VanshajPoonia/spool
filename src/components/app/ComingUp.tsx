"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { inDays } from "@/lib/deadlines";
import type { useDeadlines } from "./useDeadlines";
import s from "./comingup.module.css";

// Local time on purpose: org dates are your calendar days, and this list only renders in the browser.
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/* Followed deadlines and your orgs' next dates within 14 days, as rows in the Today strip. */
export function ComingUpList({ items }: { items: ReturnType<typeof useDeadlines> }) {
  return (
    <ul className={s.list}>
      {items.map((d) => {
        const title = (
          <>
            {d.label}
            {d.href && !d.href.startsWith("/") && <ArrowUpRight size={13} aria-hidden="true" />}
          </>
        );
        return (
          <li key={d.key} className={s.item} data-soon={d.days <= 3 || undefined}>
            <span className={s.date}>{day(d.date)}</span>
            <div className={s.main}>
              {d.href?.startsWith("/") ? (
                <Link href={d.href} className={s.title}>
                  {title}
                </Link>
              ) : d.href ? (
                <a href={d.href} target="_blank" rel="noreferrer" className={s.title}>
                  {title}
                </a>
              ) : (
                <span className={s.title}>{title}</span>
              )}
              {d.detail && <span className={s.detail}>{d.detail}</span>}
            </div>
            <span className={s.when}>{inDays(d.days)}</span>
          </li>
        );
      })}
    </ul>
  );
}
