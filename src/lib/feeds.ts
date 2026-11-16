/*
 * Reading program feeds and pages: RSS or Atom posts, LFX's timeline tables, HTML entities.
 * Pure, so they can be tested; programs.ts fetches and caches.
 */

export type NewsPost = { source: string; title: string; url: string; published: string };
export type LfxMilestone = { name: "proposals" | "apply" | "begins"; label: string; start: string; end: string | null };

export function unescapeHtml(s: string) {
  // &amp; first, so a double-escaped "&amp;apos;" comes out as an apostrophe too.
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&(#39|apos);/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LFX_ROWS: [LfxMilestone["name"], RegExp, string][] = [
  ["proposals", /project proposals open/i, "Project proposals"],
  ["apply", /mentee applications open/i, "Mentee applications"],
  ["begins", /mentorship program begins/i, "Mentorship begins"],
];

/* "| Mentee Applications Open | Wed, Feb 3, 00:00 UTC - Tue, Feb 16, 23:59 UTC |" under "Dates (2027)": every "Feb 3" in the cell, as dates. */
export function parseLfxTimeline(md: string): LfxMilestone[] {
  const year = md.match(/\|\s*Activity\s*\|\s*Dates \((\d{4})\)/i)?.[1];
  if (!year) return [];
  const out: LfxMilestone[] = [];
  for (const line of md.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 3) continue;
    const row = LFX_ROWS.find(([, re]) => re.test(cells[1]));
    if (!row) continue;
    const dates = [...cells[2].matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w* (\d{1,2})\b/g)].map(
      (m) => `${year}-${String(MON.indexOf(m[1]) + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`,
    );
    if (dates.length) out.push({ name: row[0], label: row[2], start: dates[0], end: dates[1] ?? null });
  }
  return out;
}

const cdata = (t: string) => t.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1");

/** Posts from an RSS or Atom feed: title, the page link, and when it was published. */
export function feedPosts(xml: string): Omit<NewsPost, "source">[] {
  const atom = /<entry[\s>]/.test(xml);
  return xml
    .split(atom ? /<entry[\s>]/ : /<item[\s>]/)
    .slice(1)
    .flatMap((p) => {
      const title = unescapeHtml(cdata((p.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? "").trim())).trim();
      let url = "";
      if (atom) {
        const links = [...p.matchAll(/<link\b([^>]*)>/g)].map((m) => m[1]);
        const alt = links.find((a) => /rel=['"]alternate['"]/.test(a)) ?? links.find((a) => !/rel=/.test(a));
        url = alt?.match(/href=['"]([^'"]+)['"]/)?.[1] ?? "";
      } else url = cdata(p.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "");
      const when = p.match(/<published>([^<]+)<\/published>/)?.[1] ?? p.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] ?? p.match(/<updated>([^<]+)<\/updated>/)?.[1];
      const t = when ? Date.parse(when) : NaN;
      return title && url && !Number.isNaN(t) ? [{ title, url, published: new Date(t).toISOString() }] : [];
    });
}
