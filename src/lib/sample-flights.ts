/*
 * SYNTHETIC. The flights on the landing page airfield: PRs from the sample day and the sample
 * fleet, flown under their repo's callsign and their own number. Labelled as sample data on the page.
 */

export type FlightKind = "pr" | "review" | "plain";

export type SampleFlight = {
  id: string;
  repo: string;
  num: number;
  title: string;
  /** buff for your PR, pink for one you were asked to review, plain for a draft */
  kind: FlightKind;
  /** who the review is waiting on */
  reviewer: string;
};

/* The arrivals, in the order they come in to land. The list loops. */
export const ARRIVALS: SampleFlight[] = [
  { id: "qy-2417", repo: "quarry-db/quarry", num: 2417, title: "Stream rows from cursor in batches", kind: "pr", reviewer: "@mara-k" },
  { id: "fn-302", repo: "fernlang/fern", num: 302, title: "Pattern match on nested enums", kind: "pr", reviewer: "a reviewer" },
  { id: "hb-5120", repo: "harbor-sh/harbor", num: 5120, title: "Add retry jitter to webhook sender", kind: "review", reviewer: "a second reviewer" },
  { id: "lt-902", repo: "lattice/lattice-ui", num: 902, title: "Tabs: arrow keys skip disabled items", kind: "pr", reviewer: "@devon" },
  { id: "vl-612", repo: "vela-dev/vela", num: 612, title: "Parallel image decode", kind: "pr", reviewer: "@tomasz" },
  { id: "ms-1102", repo: "mossjs/moss", num: 1102, title: "ESM-only build output", kind: "pr", reviewer: "@ana-r" },
];

/* Circling on its own, far from the stack: nobody has said a word in a month. */
export const STALLED_FLIGHT: SampleFlight & { quiet: number } = {
  id: "qy-2398",
  repo: "quarry-db/quarry",
  num: 2398,
  title: "Vectorised hash join",
  kind: "pr",
  reviewer: "a maintainer",
  quiet: 31,
};

/* Drafts wait at the stand: not ready to fly. */
export const PARKED: SampleFlight[] = [
  { id: "qy-2440", repo: "quarry-db/quarry", num: 2440, title: "Spill sorts to disk", kind: "plain", reviewer: "" },
  { id: "ob-81", repo: "tinyorbit/orbit-cli", num: 81, title: "Ship shell completions for fish", kind: "plain", reviewer: "" },
];
