/*
 * The orgs you're investing in, each with a goal, the way the owner's tracker splits work into
 * Jobs and Open Source boards. Kept in this browser; counts come from the board.
 */

export type Goal = "job" | "gsoc" | "program" | "fun";
export type OrgStatus = "active" | "waiting" | "watching" | "later" | "hold";

export type OrgPlan = {
  owner: string;
  goal: Goal;
  status: OrgStatus;
  next: string;
  /** YYYY-MM-DD */
  nextDate: string | null;
  notes: string;
  /** one URL per line */
  links: string;
  addedAt: string;
};

export const GOALS: [Goal, string][] = [
  ["job", "Job"],
  ["gsoc", "GSoC"],
  ["program", "A program"],
  ["fun", "For fun"],
];

export const STATUSES: [OrgStatus, string][] = [
  ["active", "Active"],
  ["waiting", "Waiting"],
  ["watching", "Watching"],
  ["later", "Later"],
  ["hold", "On hold"],
];

export const goalLabel = (g: Goal) => GOALS.find(([k]) => k === g)![1];

const LOGIN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/** An org from "openwisp", "@openwisp", a GitHub link or owner/repo. */
export function parseOwner(input: string): { owner: string } | { error: string } {
  const v = input
    .trim()
    .replace(/^@/, "")
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
    .split("/")[0];
  if (!v) return { error: "Type an org, like openwisp." };
  return LOGIN.test(v) ? { owner: v } : { error: "That isn't a GitHub org or account name." };
}

export const ownerOf = (repo: string) => repo.split("/")[0].toLowerCase();

/* SYNTHETIC: the orgs the sample board shows. */
export function sampleOrgs(now: number): Record<string, OrgPlan> {
  const day = (d: number) => new Date(now + d * 86400000).toISOString().slice(0, 10);
  const at = new Date(now - 60 * 86400000).toISOString();
  const org = (owner: string, goal: Goal, status: OrgStatus, next: string, nextDate: string | null, notes = ""): OrgPlan => ({
    owner,
    goal,
    status,
    next,
    nextDate,
    notes,
    links: "",
    addedAt: at,
  });
  return {
    "quarry-db": org("quarry-db", "job", "active", "Land the LIMIT pushdown, then ask about the open role", day(5), "They hire from contributors."),
    "harbor-sh": org("harbor-sh", "gsoc", "active", "Draft the proposal for the retry budget project", day(11)),
    "lattice": org("lattice", "program", "waiting", "LFX term applications open", day(40)),
    "fernlang": org("fernlang", "fun", "watching", "", null),
  };
}
