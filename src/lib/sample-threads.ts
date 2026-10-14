/*
 * SYNTHETIC threads for the landing page sections. Invented repos, people and numbers,
 * labelled as sample data wherever they appear.
 */

export type QuietThread = {
  id: string;
  repo: string;
  num: number;
  title: string;
  quiet: number;
  last: string;
};

export const QUIET: QuietThread[] = [
  { id: "q1", repo: "quarry-db/quarry", num: 2398, title: "Vectorised hash join", quiet: 31, last: "You, Sep 12" },
  { id: "q2", repo: "lattice/lattice-ui", num: 860, title: "Virtualised Combobox list", quiet: 22, last: "You, Sep 21" },
  { id: "q3", repo: "harbor-sh/harbor", num: 5051, title: "Retry budget per host", quiet: 17, last: "@ilya, Sep 26: will look next week" },
  { id: "q4", repo: "mossjs/moss", num: 1102, title: "ESM-only build output", quiet: 9, last: "@ana-r, Oct 4" },
  { id: "q5", repo: "fernlang/fern", num: 296, title: "Docs: closures chapter", quiet: 5, last: "You, Oct 8" },
  { id: "q6", repo: "vela-dev/vela", num: 612, title: "Parallel image decode", quiet: 2, last: "@tomasz, Oct 11" },
];

export type FleetRepo = {
  repo: string;
  opened: number;
  merged: { num: number; title: string }[];
  closed: { num: number; title: string }[];
  open: { num: number; title: string }[];
  median: string;
  since: string;
};

export const FLEET: FleetRepo[] = [
  {
    repo: "quarry-db/quarry",
    opened: 14,
    merged: [
      { num: 2417, title: "Stream rows from cursor in batches" },
      { num: 2380, title: "Fix off-by-one in page cache eviction" },
      { num: 2344, title: "EXPLAIN shows pushed-down filters" },
      { num: 2301, title: "Bench harness for joins" },
      { num: 2290, title: "Docs: cursor lifetimes" },
      { num: 2255, title: "Reuse buffers in the CSV reader" },
      { num: 2203, title: "Typo in error for bad casts" },
      { num: 2187, title: "Faster COUNT(*) on clustered tables" },
      { num: 2142, title: "Make the planner test deterministic" },
    ],
    closed: [
      { num: 2366, title: "Rewrite the lexer (superseded)" },
      { num: 2211, title: "Add a TOML config (declined)" },
    ],
    open: [
      { num: 2431, title: "Push LIMIT down through views" },
      { num: 2398, title: "Vectorised hash join" },
      { num: 2440, title: "Spill sorts to disk" },
    ],
    median: "4.2D",
    since: "MAR 2026",
  },
  {
    repo: "lattice/lattice-ui",
    opened: 7,
    merged: [
      { num: 845, title: "Popover respects reduced motion" },
      { num: 812, title: "Select: typeahead across groups" },
      { num: 790, title: "Fix focus ring clipping in Dialog" },
      { num: 744, title: "Docs: controlled Tabs" },
    ],
    closed: [{ num: 801, title: "CSS-only Tooltip (out of scope)" }],
    open: [
      { num: 860, title: "Virtualised Combobox list" },
      { num: 902, title: "Tabs: arrow keys skip disabled items" },
    ],
    median: "6.8D",
    since: "MAY 2026",
  },
  {
    repo: "fernlang/fern",
    opened: 5,
    merged: [
      { num: 302, title: "Pattern match on nested enums" },
      { num: 271, title: "Better error for missing arms" },
    ],
    closed: [],
    open: [
      { num: 311, title: "Exhaustiveness check for match guards" },
      { num: 296, title: "Docs: closures chapter" },
      { num: 318, title: "Format integer literals" },
    ],
    median: "9.5D",
    since: "AUG 2026",
  },
  {
    repo: "harbor-sh/harbor",
    opened: 4,
    merged: [
      { num: 5120, title: "Add retry jitter to webhook sender" },
      { num: 4988, title: "Log request ids on 5xx" },
      { num: 4950, title: "Health check honours timeouts" },
    ],
    closed: [],
    open: [{ num: 5051, title: "Retry budget per host" }],
    median: "2.1D",
    since: "JUN 2026",
  },
  {
    repo: "tinyorbit/orbit-cli",
    opened: 2,
    merged: [],
    closed: [],
    open: [
      { num: 81, title: "Shell completions for fish" },
      { num: 84, title: "--json output for status" },
    ],
    median: "NONE YET",
    since: "SEP 2026",
  },
  {
    repo: "vela-dev/vela",
    opened: 3,
    merged: [{ num: 598, title: "Watch mode ignores dotfiles" }],
    closed: [],
    open: [
      { num: 640, title: "Cache layer for asset hashing" },
      { num: 612, title: "Parallel image decode" },
    ],
    median: "3.0D",
    since: "JUL 2026",
  },
];
