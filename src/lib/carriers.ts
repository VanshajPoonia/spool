/*
 * Carrier codes: every repo gets a two-letter code and a two-colour livery,
 * derived from its name so it is identical everywhere it appears.
 */

const LIVERIES: [string, string][] = [
  ["#e8412f", "#f6efe0"],
  ["#2f6fe4", "#ffd34d"],
  ["#17a673", "#0d3b2b"],
  ["#8c5cf2", "#f2e9ff"],
  ["#ff7a1f", "#1b1b1b"],
  ["#0fb4c8", "#06343a"],
  ["#e2508f", "#fff0f6"],
  ["#b9d43a", "#1f2a06"],
  ["#c9c2b2", "#2a2722"],
  ["#5468ff", "#e9ecff"],
  ["#d9a21b", "#2b1f02"],
  ["#36c2a0", "#e8fff8"],
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Carrier = { code: string; livery: [string, string]; name: string; owner: string; full: string };

/* Codes in order of preference: word initials, first letter + consonant, first letter + any letter. */
function candidates(full: string): string[] {
  const [ownerRaw, nameRaw] = full.includes("/") ? full.split("/") : ["", full];
  const words = (nameRaw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.join("") || "XX";
  const first = letters[0];
  const out: string[] = [];
  const push = (c: string) => {
    if (c.length === 2 && !out.includes(c)) out.push(c);
  };
  if (words.length >= 2) push(words[0][0] + words[1][0]);
  for (const ch of letters.slice(1)) if (/[BCDFGHJKLMNPQRSTVWXZ]/.test(ch)) push(first + ch);
  for (const ch of letters.slice(1)) push(first + ch);
  const owner = (ownerRaw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (owner) push(first + owner[0]);
  for (const a of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") push(first + a);
  return out;
}

export function carrierCode(full: string) {
  return candidates(full)[0] ?? "XX";
}

/*
 * Collision-free codes for a set of repos shown together. Assigned in alphabetical
 * order so a repo keeps its code however the list is sorted on screen.
 */
export function assignCodes(repos: Iterable<string>): Map<string, string> {
  const unique = [...new Set(repos)].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const used = new Set<string>();
  const map = new Map<string, string>();
  for (const r of unique) {
    const code = candidates(r).find((c) => !used.has(c)) ?? carrierCode(r);
    used.add(code);
    map.set(r, code);
  }
  return map;
}

export function carrier(full: string, code?: string): Carrier {
  const [owner, name] = full.includes("/") ? full.split("/") : ["", full];
  return {
    code: code ?? carrierCode(full),
    livery: LIVERIES[hash(full.toLowerCase()) % LIVERIES.length],
    name,
    owner,
    full,
  };
}
