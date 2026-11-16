import type { FirstIssue } from "./github";

/*
 * One list from several searches, shaped the same for guests and tokens:
 * no repeats, repos with 30+ stars first, and two issues per repo at most.
 */
export function pickFirstIssues(lists: FirstIssue[][]): FirstIssue[] {
  const seen = new Set<string>();
  const issues: FirstIssue[] = [];
  for (const list of lists) {
    for (const i of list) {
      if (!i?.id || seen.has(i.id) || i.repository.stargazerCount < 30) continue;
      seen.add(i.id);
      issues.push(i);
    }
  }
  issues.sort((a, b) => b.repository.stargazerCount - a.repository.stargazerCount);
  // A busy repo can label a dozen issues in a day; two each keeps the list worth scanning.
  const perRepo = new Map<string, number>();
  return issues
    .filter((i) => {
      const n = (perRepo.get(i.repository.nameWithOwner) ?? 0) + 1;
      perRepo.set(i.repository.nameWithOwner, n);
      return n <= 2;
    })
    .slice(0, 24);
}
