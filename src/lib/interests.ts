import type { GsocOrg } from "./programs";

export const words = (s: string) => s.toLowerCase().split(/[^a-z0-9+#]+/).filter(Boolean);

/* Whole-word match, so "cli" doesn't match "eclipse" and "go" doesn't match "google". */
export function tagMatches(tag: string, interest: string) {
  const t = tag.toLowerCase();
  return t === interest || words(t).includes(interest);
}

/* The interests an organisation lists among its tech, topics, categories or name. */
export function matchOrg(o: GsocOrg, interests: string[]) {
  const hay = [...o.tech, ...o.topics, ...o.categories, o.name];
  return interests.filter((i) => hay.some((h) => tagMatches(h, i)));
}
