import type { StripKind, StripState } from "@/components/kit/Strip";
import type { DayRow, DayState } from "@/lib/sample-day";

/* How the sample day's threads print as strips. */

export const STALL_DAYS = 14;

export function dayKind(row: DayRow, st: DayState): StripKind {
  if (st.status === "REVIEW ASKED" || st.status === "REVIEWED") return "review";
  return row.kind;
}

export function dayState(st: DayState): StripState {
  if (st.next === "DONE") return "done";
  if (st.next === "YOU") return "you";
  return (st.quiet ?? 0) >= STALL_DAYS ? "stalled" : "them";
}

/* You made the last move: the strip carries your tick into their bay. */
export function dayTicked(st: DayState) {
  return st.next === "THEM" && /^You /.test(st.note);
}
