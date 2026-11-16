/*
 * Programs beyond GSoC, YC and Hacktoberfest, each with its own site. Descriptions only: dates show
 * where a program publishes them in a form Spool can read (LFX today), and everything else says
 * "check the site" instead of guessing.
 */

export type CatalogProgram = {
  id: string;
  name: string;
  what: string;
  pay: "Paid" | "Stipend for some" | "Unpaid";
  url: string;
  /** a second link worth reading first, like eligibility rules */
  extra?: { label: string; url: string };
};

export const CATALOG: CatalogProgram[] = [
  {
    id: "lfx",
    name: "LFX Mentorship",
    what: "Three terms a year with CNCF and other Linux Foundation projects. You can take part once, and apply to three projects per term.",
    pay: "Paid",
    url: "https://mentorship.lfx.linuxfoundation.org/",
    extra: { label: "CNCF terms", url: "https://github.com/cncf/mentoring/tree/main/programs/lfx-mentorship" },
  },
  {
    id: "outreachy",
    name: "Outreachy",
    what: "Remote internships with open source projects, in two cohorts a year. Eligibility is restricted, so read the rules before you start.",
    pay: "Paid",
    url: "https://www.outreachy.org/",
    extra: { label: "Eligibility", url: "https://www.outreachy.org/apply/eligibility/" },
  },
  {
    id: "mlh",
    name: "MLH Fellowship",
    what: "A 12-week remote program contributing to widely used open source projects, open to students and non-students.",
    pay: "Stipend for some",
    url: "https://fellowship.mlh.com/programs/open-source",
  },
  {
    id: "sob",
    name: "Summer of Bitcoin",
    what: "A summer program for university students on Bitcoin and Lightning open source, with developer and designer tracks.",
    pay: "Paid",
    url: "https://summerofbitcoin.org/how-it-works",
  },
  {
    id: "season-of-docs",
    name: "Google Season of Docs",
    what: "Google funds open source orgs to hire technical writers for documentation projects.",
    pay: "Paid",
    url: "https://developers.google.com/season-of-docs",
  },
  {
    id: "c4gt",
    name: "C4GT Dedicated Mentoring Program",
    what: "Mentored, paid work on Indian digital public goods in health, education and governance.",
    pay: "Paid",
    url: "https://codeforgoodtech.in",
  },
  {
    id: "gssoc",
    name: "GirlScript Summer of Code",
    what: "A free program open to anyone, run by GirlScript Foundation, with a leaderboard and certificates.",
    pay: "Unpaid",
    url: "https://gssoc.girlscript.org/",
  },
  {
    id: "kwoc",
    name: "Kharagpur Winter of Code",
    what: "A five-week winter program for people new to open source, run by KOSS at IIT Kharagpur.",
    pay: "Unpaid",
    url: "https://kwoc.kossiitkgp.org/",
  },
  {
    id: "swoc",
    name: "Social Winter of Code",
    what: "A student program in India; check whether a winter edition is running this year.",
    pay: "Unpaid",
    url: "https://socialwinterofcode.devfolio.co/",
  },
];
