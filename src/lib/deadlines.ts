import type { OrgPlan } from "./orgs";
import { gsocStations, hacktoberfest, parseMonthDay } from "./program-dates";
import type { Programs } from "./programs";

/*
 * Deadlines you follow: program dates read from their own sources, and each org's next date.
 * Anything within 14 days shows on the board; a notification goes out at 7 days and at 1 day.
 */

export type Deadline = { key: string; label: string; date: string; detail: string; href: string | null };

/** Programs you can follow in Settings. GSoC milestones keep the program API's names year to year. */
export const PROGRAMS: [string, string][] = [
  ["yc", "Y Combinator application deadline"],
  ["hacktoberfest", "Hacktoberfest start and end"],
  ["gsoc:org_application_start", "GSoC: orgs apply"],
  ["gsoc:org_announce_public", "GSoC: orgs announced"],
  ["gsoc:contributor_proposals_open", "GSoC: proposals open"],
  ["gsoc:proposal_deadline", "GSoC: proposals due"],
  ["gsoc:project_announce_public", "GSoC: projects announced"],
  ["gsoc:project_work_start", "GSoC: coding starts"],
  ["gsoc:program_end", "GSoC: program ends"],
  ["lfx:proposals", "LFX Mentorship: project proposals open and close"],
  ["lfx:apply", "LFX Mentorship: mentee applications open and close"],
  ["lfx:begins", "LFX Mentorship: a term begins"],
];

export function programDeadlines(data: Programs, follow: string[], now: number): Deadline[] {
  const want = new Set(follow);
  const out: Deadline[] = [];
  if (want.has("yc") && data.yc && !data.yc.afterDeadline) {
    const d = parseMonthDay(data.yc.deadline, now, false);
    if (d) out.push({ key: "yc", label: `YC ${data.yc.batch} applications close`, date: d.toISOString(), detail: `Decisions ${data.yc.decisions}`, href: data.yc.applyUrl });
  }
  if (want.has("hacktoberfest")) {
    const h = hacktoberfest(now);
    const date = new Date(h.year, 9, h.live ? 31 : 1, h.live ? 23 : 0, h.live ? 59 : 0).toISOString();
    out.push({ key: `hacktoberfest:${h.live ? "end" : "start"}`, label: `Hacktoberfest ${h.year} ${h.live ? "ends" : "starts"}`, date, detail: "", href: "https://hacktoberfest.com" });
  }
  // LFX dates are calendar days; noon UTC lands on the same day in almost every time zone.
  for (const term of data.lfx ?? []) {
    for (const m of term.milestones) {
      if (!want.has(`lfx:${m.name}`)) continue;
      const short = term.label.replace(/, .*/, "");
      out.push({ key: `lfx:${term.id}:${m.name}:start`, label: `LFX ${short}: ${m.label.toLowerCase()} ${m.end ? "open" : ""}`.trim(), date: `${m.start}T12:00:00Z`, detail: "", href: term.url });
      if (m.end) out.push({ key: `lfx:${term.id}:${m.name}:end`, label: `LFX ${short}: ${m.label.toLowerCase()} close`, date: `${m.end}T12:00:00Z`, detail: "", href: term.url });
    }
  }
  if (data.gsoc) {
    for (const st of gsocStations(data.gsoc)) {
      if (!want.has(`gsoc:${st.name}`)) continue;
      out.push({ key: `gsoc:${st.name}`, label: `GSoC ${data.gsoc.year}: ${st.short.toLowerCase()}`, date: st.date, detail: "", href: "https://summerofcode.withgoogle.com" });
    }
  }
  return out;
}

export function orgDeadlines(orgs: OrgPlan[]): Deadline[] {
  return orgs
    .filter((o) => o.nextDate && o.status !== "hold")
    .map((o) => ({ key: `org:${o.owner.toLowerCase()}`, label: o.owner, date: `${o.nextDate}T00:00:00`, detail: o.next || "Next date", href: "/board/orgs" }));
}

const DAY = 86400000;
const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0);
/* Calendar days in your time zone, so something due later today reads "today", not "tomorrow". */
const calendarDays = (iso: string, now: number) => Math.round((startOfDay(Date.parse(iso)) - startOfDay(now)) / DAY);

/** What's due in the next `within` days, soonest first, with days to go (0 is today). */
export function upcoming(list: Deadline[], now: number, within = 14) {
  return list
    .map((d) => ({ ...d, days: calendarDays(d.date, now) }))
    .filter((d) => d.days >= 0 && d.days <= within)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const inDays = (days: number) => (days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`);
