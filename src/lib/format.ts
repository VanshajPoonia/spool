/* 12345 -> "12K", 1530 -> "1.5K" */
export function compactStars(n: number) {
  if (n >= 10000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const SAY: Record<string, string> = {
  "CHANGES REQ": "Changes requested",
  "CI FAILED": "CI failing",
  "REVIEW ASKED": "Review asked",
  "INCOMING PR": "Incoming PR",
  "THEY REPLIED": "They replied",
  "WITH AUTHOR": "With the author",
  "IN REVIEW": "In review",
};

/* A thread's status as a sentence: statuses are kept in capitals, and read in sentence case with
   their abbreviations spelled out. "STALLED 16D" stays short, as the row's own status. */
export function statusLabel(status: string) {
  if (SAY[status]) return SAY[status];
  return status.charAt(0) + status.slice(1).toLowerCase();
}
