import type { Gsoc } from "./programs";

const DAY = 86400000;

export function daysUntil(iso: string, now: number) {
  return Math.ceil((Date.parse(iso) - now) / DAY);
}

const PHASES: Record<string, string> = {
  program_archived: "ENDED",
  project_work: "CODING",
  pre_program: "ANNOUNCED",
  org_application: "ORGS APPLY",
  org_review: "ORG REVIEW",
  contributor_application: "PROPOSALS",
  contributor_review: "REVIEWING",
};

export function gsocPhase(phase: string) {
  return PHASES[phase] ?? phase.replace(/_/g, " ").toUpperCase().slice(0, 10);
}

const STATIONS: Record<string, string> = {
  prog_announce: "Announced",
  org_application_start: "Orgs apply",
  org_announce_public: "Orgs out",
  contributor_proposals_open: "Proposals open",
  proposal_deadline: "Proposals due",
  project_announce_public: "Projects out",
  project_work_start: "Coding starts",
  program_end: "Program ends",
};

export function gsocStations(g: Gsoc) {
  return g.milestones
    .filter((m) => STATIONS[m.name])
    .map((m) => ({ ...m, short: STATIONS[m.name] }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function gsocNext(g: Gsoc, now: number) {
  const st = gsocStations(g).find((m) => Date.parse(m.date) > now);
  return st ? { name: st.name, label: st.short, date: st.date } : null;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/* "November 2" -> the next such date from `from` (or the latest past one when the deadline has passed). */
export function parseMonthDay(text: string, from: number, past: boolean) {
  const m = text.trim().toLowerCase().match(/^([a-z]+)\s+(\d{1,2})/);
  if (!m) return null;
  const mi = MONTHS.indexOf(m[1]);
  if (mi < 0) return null;
  const day = Number(m[2]);
  const y = new Date(from).getFullYear();
  const cands = [y - 1, y, y + 1].map((yy) => new Date(yy, mi, day, 23, 59));
  if (past) return [...cands].reverse().find((d) => d.getTime() <= from) ?? cands[1];
  return cands.find((d) => d.getTime() >= from - DAY) ?? cands[2];
}

export function hacktoberfest(now: number) {
  const d = new Date(now);
  const y = d.getFullYear();
  const start = new Date(y, 9, 1);
  const end = new Date(y, 9, 31, 23, 59);
  if (now >= start.getTime() && now <= end.getTime()) {
    return { year: y, live: true, days: Math.ceil((end.getTime() - now) / DAY) };
  }
  const nextStart = now < start.getTime() ? start : new Date(y + 1, 9, 1);
  return { year: nextStart.getFullYear(), live: false, days: Math.ceil((nextStart.getTime() - now) / DAY) };
}
