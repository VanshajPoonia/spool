import "server-only";
import { cacheLife } from "next/cache";
import type { FirstIssue } from "./github";
import { pickFirstIssues } from "./first-issues";

/*
 * Public program feeds, read on the server and cached.
 * Every value here comes from the source; nothing is filled in by hand.
 */

export type Milestone = { name: string; label: string; date: string };

export type GsocOrg = {
  name: string;
  slug: string;
  tagline: string;
  tech: string[];
  topics: string[];
  categories: string[];
  url: string;
  ideas: string | null;
};

export type Gsoc = {
  year: string;
  phase: string;
  active: boolean;
  milestones: Milestone[];
  orgCount: number;
  orgs: GsocOrg[];
};

export type YC = {
  batch: string;
  deadline: string;
  decisions: string;
  afterDeadline: boolean;
  applyUrl: string;
};

export type Launch = { title: string; tagline: string; url: string; published: string };

export type NewsPost = { source: string; title: string; url: string; published: string };

export type LfxMilestone = { name: "proposals" | "apply" | "begins"; label: string; start: string; end: string | null };
export type LfxTerm = { id: string; label: string; url: string; milestones: LfxMilestone[] };

export type Programs = {
  gsoc: Gsoc | null;
  yc: YC | null;
  launches: Launch[];
  lfx: LfxTerm[];
  news: NewsPost[];
  /** YC's open source companies in brief: the newest few, and how many there are and are hiring */
  ycOpen: { total: number; hiring: number; latest: YcCompany[] } | null;
  fetchedAt: string;
};

const UA = { "User-Agent": "Spool (open source dashboard)" };

export async function getGsoc(): Promise<Gsoc | null> {
  "use cache";
  cacheLife("hours");
  try {
    const res = await fetch("https://summerofcode.withgoogle.com/api/program/", { headers: UA });
    if (!res.ok) return null;
    const programs = (await res.json()) as {
      slug: string;
      phase: string;
      is_active: boolean;
      milestones: { name: string; label: string; datetime: string }[];
    }[];
    const latest = [...programs].sort((a, b) => Number(b.slug) - Number(a.slug))[0];
    if (!latest) return null;
    let orgs: GsocOrg[] = [];
    const orgRes = await fetch(`https://summerofcode.withgoogle.com/api/program/${latest.slug}/organizations/`, { headers: UA });
    if (orgRes.ok) {
      const raw = (await orgRes.json()) as {
        name: string;
        slug: string;
        tagline: string;
        tech_tags?: string[];
        topic_tags?: string[];
        categories?: string[];
        ideas_link?: string;
      }[];
      orgs = raw.map((o) => ({
        name: o.name,
        slug: o.slug,
        tagline: o.tagline,
        tech: o.tech_tags ?? [],
        topics: o.topic_tags ?? [],
        categories: o.categories ?? [],
        url: `https://summerofcode.withgoogle.com/programs/${latest.slug}/organizations/${o.slug}`,
        ideas: o.ideas_link || null,
      }));
    }
    return {
      year: latest.slug,
      phase: latest.phase,
      active: latest.is_active,
      milestones: latest.milestones.map((m) => ({ name: m.name, label: m.label, date: m.datetime })),
      orgCount: orgs.length,
      orgs,
    };
  } catch {
    return null;
  }
}

function unescapeHtml(s: string) {
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

export async function getYC(): Promise<YC | null> {
  "use cache";
  cacheLife("hours");
  try {
    const res = await fetch("https://www.ycombinator.com/apply", { headers: UA });
    if (!res.ok) return null;
    const html = unescapeHtml(await res.text());
    const pick = (key: string) => html.match(new RegExp(`"${key}":"([^"]*)"`))?.[1] ?? "";
    const batch = pick("batch_name_long");
    const deadline = pick("deadline");
    if (!batch || !deadline) return null;
    return {
      batch,
      deadline,
      decisions: pick("yes_no_day"),
      afterDeadline: /"is_after_deadline":true/.test(html),
      applyUrl: pick("apply_url") || "https://www.ycombinator.com/apply",
    };
  } catch {
    return null;
  }
}

export async function getLaunches(): Promise<Launch[]> {
  "use cache";
  cacheLife("hours");
  try {
    const res = await fetch("https://www.producthunt.com/feed", { headers: UA });
    if (!res.ok) return [];
    const xml = await res.text();
    const entries = xml.split("<entry>").slice(1);
    return entries.slice(0, 30).map((e) => {
      const title = unescapeHtml(e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").trim();
      const url = e.match(/<link rel="alternate" type="text\/html" href="([^"]+)"/)?.[1] ?? "";
      const published = e.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
      const content = unescapeHtml(e.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] ?? "");
      const tagline = content.match(/<p>\s*([\s\S]*?)\s*<\/p>/)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
      return { title, tagline, url, published };
    });
  } catch {
    return [];
  }
}

/* ---------- GSoC organisation browser: every org this year, with links and years in the program ---------- */

export type GsocOrgFull = GsocOrg & {
  logo: string | null;
  website: string | null;
  license: string | null;
  guide: string | null;
  source: string | null;
  chat: string | null;
  mailingList: string | null;
  /** program years this org took part in, from the yearly org lists the API publishes */
  years: string[];
  /** for an org that isn't in the latest program: the last year it took part */
  lastYear?: string;
};

export type GsocBrowser = {
  year: string;
  /** the years the API has org lists for, oldest first */
  yearsCovered: string[];
  orgs: GsocOrgFull[];
  /** organisations from earlier years that aren't in the latest program, most recent first */
  past: GsocOrgFull[];
  fetchedAt: string;
};

type RawOrg = {
  name: string;
  slug: string;
  logo_url?: string;
  website_url?: string;
  tagline: string;
  license?: string;
  categories?: string[];
  contributor_guidance_url?: string;
  tech_tags?: string[];
  topic_tags?: string[];
  contact_links?: { name: string; value: string }[];
  source_code?: string;
  ideas_link?: string;
};

const httpLink = (v: string | undefined | null) => (v && /^https?:\/\//i.test(v) ? v : null);
const orgKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function getGsocBrowser(): Promise<GsocBrowser | null> {
  "use cache";
  cacheLife("hours");
  try {
    const res = await fetch("https://summerofcode.withgoogle.com/api/program/", { headers: UA });
    if (!res.ok) return null;
    const programs = ((await res.json()) as { slug: string }[]).map((p) => p.slug).sort((a, b) => Number(a) - Number(b));
    const latest = programs[programs.length - 1];
    if (!latest) return null;
    const lists = await Promise.all(
      programs.map(async (y) => {
        const r = await fetch(`https://summerofcode.withgoogle.com/api/program/${y}/organizations/`, { headers: UA });
        return { year: y, orgs: r.ok ? ((await r.json()) as RawOrg[]) : null };
      }),
    );
    const current = lists.find((l) => l.year === latest)?.orgs;
    if (!current) return null;
    // An org can change its slug between years, so match on slug or on a normalised name.
    const seen = new Map<string, Set<string>>();
    for (const l of lists) {
      if (!l.orgs) continue;
      for (const o of l.orgs) {
        for (const k of [`s:${o.slug}`, `n:${orgKey(o.name)}`]) {
          if (!seen.has(k)) seen.set(k, new Set());
          seen.get(k)!.add(l.year);
        }
      }
    }
    const link = (o: RawOrg, name: string) => httpLink(o.contact_links?.find((c) => c.name === name)?.value);
    const full = (o: RawOrg, year: string): GsocOrgFull => ({
      name: o.name,
      slug: o.slug,
      tagline: o.tagline,
      tech: o.tech_tags ?? [],
      topics: o.topic_tags ?? [],
      categories: o.categories ?? [],
      url: `https://summerofcode.withgoogle.com/programs/${year}/organizations/${o.slug}`,
      ideas: httpLink(o.ideas_link),
      logo: httpLink(o.logo_url),
      website: httpLink(o.website_url),
      license: o.license || null,
      guide: httpLink(o.contributor_guidance_url),
      source: httpLink(o.source_code),
      chat: link(o, "chat"),
      mailingList: link(o, "mailingList"),
      years: [...new Set([...(seen.get(`s:${o.slug}`) ?? []), ...(seen.get(`n:${orgKey(o.name)}`) ?? [])])].sort(),
    });
    const orgs = current.map((o) => full(o, latest));
    // Earlier orgs not in the latest program, each from the last year it took part.
    const taken = new Set(current.flatMap((o) => [`s:${o.slug}`, `n:${orgKey(o.name)}`]));
    const past: GsocOrgFull[] = [];
    for (const l of [...lists].reverse()) {
      if (l.year === latest || !l.orgs) continue;
      for (const o of l.orgs) {
        const keys = [`s:${o.slug}`, `n:${orgKey(o.name)}`];
        if (keys.some((k) => taken.has(k))) continue;
        keys.forEach((k) => taken.add(k));
        past.push({ ...full(o, l.year), lastYear: l.year });
      }
    }
    return {
      year: latest,
      yearsCovered: lists.filter((l) => l.orgs).map((l) => l.year),
      orgs,
      past,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function getPrograms(): Promise<Programs> {
  "use cache";
  cacheLife("hours");
  const [gsoc, yc, launches, lfx, news, ycAll] = await Promise.all([getGsoc(), getYC(), getLaunches(), getLfxTerms(), getProgramNews(), getYcOpenSource()]);
  const ycOpen = ycAll ? { total: ycAll.companies.length, hiring: ycAll.companies.filter((c) => c.hiring).length, latest: ycAll.companies.slice(0, 5) } : null;
  return { gsoc, yc, launches, lfx, news, ycOpen, fetchedAt: new Date().toISOString() };
}

/* ---------- YC's open source companies, from YC's directory via the yc-oss API (rebuilt daily) ---------- */

export type YcCompany = {
  name: string;
  slug: string;
  batch: string;
  status: string;
  website: string | null;
  oneLiner: string;
  teamSize: number | null;
  hiring: boolean;
  /** the company's page in YC's directory */
  ycUrl: string;
  tags: string[];
};

export type YcOpenSource = { companies: YcCompany[]; updated: string | null; fetchedAt: string };

const SEASONS: Record<string, number> = { Winter: 0, Spring: 1, Summer: 2, Fall: 3 };
/** "Summer 2020" as a number that sorts batches in time order. */
export const batchRank = (b: string) => {
  const [season, year] = b.split(" ");
  return Number(year) * 4 + (SEASONS[season] ?? 0);
};

type RawYc = {
  name: string;
  slug: string;
  batch: string;
  status: string;
  website?: string;
  one_liner?: string;
  team_size?: number | null;
  isHiring?: boolean;
  url: string;
  tags?: string[];
};

export async function getYcOpenSource(): Promise<YcOpenSource | null> {
  "use cache";
  cacheLife("hours");
  try {
    const [res, meta] = await Promise.all([
      fetch("https://yc-oss.github.io/api/tags/open-source.json", { headers: UA }),
      fetch("https://yc-oss.github.io/api/meta.json", { headers: UA }).catch(() => null),
    ]);
    if (!res.ok) return null;
    const raw = (await res.json()) as RawYc[];
    const updated = meta?.ok ? (((await meta.json()) as { last_updated?: string }).last_updated ?? null) : null;
    const companies = raw
      .map((c) => ({
        name: c.name,
        slug: c.slug,
        batch: c.batch,
        status: c.status,
        website: httpLink(c.website),
        oneLiner: c.one_liner ?? "",
        teamSize: c.team_size ?? null,
        hiring: !!c.isHiring,
        ycUrl: c.url,
        tags: (c.tags ?? []).filter((t) => t !== "Open Source").slice(0, 4),
      }))
      .sort((a, b) => batchRank(b.batch) - batchRank(a.batch) || a.name.localeCompare(b.name));
    return { companies, updated, fetchedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

/* ---------- LFX Mentorship terms, from the timeline table on each term's page in cncf/mentoring ---------- */

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TERMS = ["01-Mar-May", "02-Jun-Aug", "03-Sep-Nov"];
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

export async function getLfxTerms(): Promise<LfxTerm[]> {
  "use cache";
  cacheLife("hours");
  const y = new Date().getFullYear();
  const pages = [y, y + 1].flatMap((year) => TERMS.map((term) => ({ year, term })));
  const terms = await Promise.all(
    pages.map(async ({ year, term }) => {
      const path = `programs/lfx-mentorship/${year}/${term}/README.md`;
      try {
        const res = await fetch(`https://raw.githubusercontent.com/cncf/mentoring/main/${path}`, { headers: UA });
        if (!res.ok) return null;
        const milestones = parseLfxTimeline(await res.text());
        const [n, from, to] = term.split("-");
        return milestones.length ? { id: `${year}-${term}`, label: `${year} Term ${Number(n)}, ${from} to ${to}`, url: `https://github.com/cncf/mentoring/blob/main/${path}`, milestones } : null;
      } catch {
        return null;
      }
    }),
  );
  return terms.filter((t): t is LfxTerm => t !== null);
}

/* ---------- program news: the blogs the owner's tracker follows, read the same way ---------- */

const NEWS_FEEDS: { source: string; url: string; only?: RegExp }[] = [
  { source: "Google Open Source", url: "https://opensource.googleblog.com/feeds/posts/default", only: /summer of code|gsoc|season of docs/i },
  { source: "Outreachy", url: "https://www.outreachy.org/blog/feed/" },
  { source: "CNCF", url: "https://www.cncf.io/feed/", only: /mentorship|lfx|mentee/i },
  { source: "Summer of Bitcoin", url: "https://blog.summerofbitcoin.org/feed.xml" },
];

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

export async function getProgramNews(): Promise<NewsPost[]> {
  "use cache";
  cacheLife("hours");
  const since = Date.now() - 180 * 86400000;
  const lists = await Promise.all(
    NEWS_FEEDS.map(async (f) => {
      try {
        const res = await fetch(f.url, { headers: UA });
        if (!res.ok) return [];
        return feedPosts(await res.text())
          .filter((p) => (!f.only || f.only.test(p.title)) && Date.parse(p.published) > since)
          .map((p) => ({ ...p, source: f.source }));
      } catch {
        return [];
      }
    }),
  );
  return lists
    .flat()
    .sort((a, b) => b.published.localeCompare(a.published))
    .slice(0, 12);
}

/* ---------- repo discovery (unauthenticated search, cached per topic) ---------- */

export type FoundRepo = {
  full: string;
  description: string;
  stars: number;
  language: string | null;
  created: string;
  url: string;
  topics: string[];
};

const LANGS = new Set(["rust", "typescript", "python", "go", "javascript", "zig", "kotlin", "swift", "c", "cpp", "java", "ruby", "elixir"]);

export function topicQualifier(topic: string) {
  const t = topic.toLowerCase().trim();
  return LANGS.has(t) ? `language:${t}` : `topic:${t}`;
}

export async function discoverTopic(topic: string, sinceDay: string): Promise<FoundRepo[] | null> {
  "use cache";
  cacheLife("hours");
  const q = `${topicQualifier(topic)} created:>${sinceDay} stars:>25 archived:false`;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=8`;
  const headers: Record<string, string> = { ...UA, Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      items: {
        full_name: string;
        description: string | null;
        stargazers_count: number;
        language: string | null;
        created_at: string;
        html_url: string;
        topics?: string[];
      }[];
    };
    return data.items.map((r) => ({
      full: r.full_name,
      description: r.description ?? "",
      stars: r.stargazers_count,
      language: r.language,
      created: r.created_at,
      url: r.html_url,
      topics: r.topics ?? [],
    }));
  } catch {
    return null;
  }
}

export type Discovery = { repos: FoundRepo[]; live: boolean; topics: string[]; fetchedAt: string };

export async function discover(topics: string[]): Promise<Discovery> {
  "use cache";
  cacheLife("hours");
  const since = new Date(Date.now() - 150 * 86400000).toISOString().slice(0, 10);
  const picked = topics.slice(0, 4);
  const results = await Promise.all(picked.map((t) => discoverTopic(t, since)));
  const seen = new Set<string>();
  const repos: FoundRepo[] = [];
  for (const list of results) {
    for (const r of list ?? []) {
      if (seen.has(r.full)) continue;
      seen.add(r.full);
      repos.push(r);
    }
  }
  repos.sort((a, b) => b.stars - a.stars);
  return {
    repos: repos.slice(0, 10),
    live: results.some((r) => r !== null),
    topics: picked,
    fetchedAt: new Date().toISOString(),
  };
}

/* ---------- good first issues for guests (unauthenticated search, cached per language) ---------- */

type SearchIssue = {
  node_id: string;
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  comments: number;
  repository_url: string;
};

function ghHeaders() {
  const headers: Record<string, string> = { ...UA, Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

/*
 * Same rules as the signed-in search: unassigned, opened in the last 45 days, repo with 30+ stars.
 * Issue search can't filter by stars, so one repository search with repo: qualifiers looks them up.
 * Sorted by activity, not age: by age, one repo bulk-filing issues can fill the whole page.
 * Throws on failure so a rate-limited answer isn't cached for an hour.
 */
async function firstIssuesFor(lang: string, sinceDay: string): Promise<FirstIssue[]> {
  "use cache";
  cacheLife("hours");
  const q = `is:issue is:open label:"good first issue" no:assignee language:${lang} created:>${sinceDay}`;
  const res = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(q)}&sort=interactions&order=desc&per_page=40`, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`issue search ${res.status}`);
  const items = ((await res.json()) as { items: SearchIssue[] }).items;
  // Look up the 21 newest repos at most: three searches, inside the 10 a minute GitHub allows without a token.
  const repos = [...new Set(items.map((i) => i.repository_url.replace("https://api.github.com/repos/", "")))].slice(0, 21);
  const info = new Map<string, { stars: number; language: string | null }>();
  // Search queries cap at 256 characters, so look repos up a handful at a time.
  for (let i = 0; i < repos.length; i += 7) {
    const rq = repos
      .slice(i, i + 7)
      .map((r) => `repo:${r}`)
      .join(" ");
    const rr = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(rq)}&per_page=10`, { headers: ghHeaders() });
    if (!rr.ok) throw new Error(`repo search ${rr.status}`);
    for (const r of ((await rr.json()) as { items: { full_name: string; stargazers_count: number; language: string | null }[] }).items) {
      info.set(r.full_name.toLowerCase(), { stars: r.stargazers_count, language: r.language });
    }
  }
  const out: FirstIssue[] = [];
  for (const i of items) {
    const full = i.repository_url.replace("https://api.github.com/repos/", "");
    const r = info.get(full.toLowerCase());
    if (!r || r.stars < 30) continue;
    out.push({
      id: i.node_id,
      number: i.number,
      title: i.title,
      url: i.html_url,
      createdAt: i.created_at,
      comments: { totalCount: i.comments },
      repository: { nameWithOwner: full, stargazerCount: r.stars, primaryLanguage: r.language ? { name: r.language } : null },
    });
  }
  return out;
}

export type FirstIssues = { issues: FirstIssue[]; live: boolean; fetchedAt: string };

export async function firstIssues(langs: string[]): Promise<FirstIssues> {
  const since = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
  const results = await Promise.all(langs.slice(0, 3).map((l) => firstIssuesFor(l, since).catch(() => null)));
  return { issues: pickFirstIssues(results.map((r) => r ?? [])), live: results.some((r) => r !== null), fetchedAt: new Date().toISOString() };
}
