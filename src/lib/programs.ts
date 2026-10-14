import "server-only";
import { cacheLife } from "next/cache";
import type { FirstIssue } from "./github";

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

export type Programs = {
  gsoc: Gsoc | null;
  yc: YC | null;
  launches: Launch[];
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
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
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
};

export type GsocBrowser = {
  year: string;
  /** the years the API has org lists for, oldest first */
  yearsCovered: string[];
  orgs: GsocOrgFull[];
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
    const orgs: GsocOrgFull[] = current.map((o) => ({
      name: o.name,
      slug: o.slug,
      tagline: o.tagline,
      tech: o.tech_tags ?? [],
      topics: o.topic_tags ?? [],
      categories: o.categories ?? [],
      url: `https://summerofcode.withgoogle.com/programs/${latest}/organizations/${o.slug}`,
      ideas: httpLink(o.ideas_link),
      logo: httpLink(o.logo_url),
      website: httpLink(o.website_url),
      license: o.license || null,
      guide: httpLink(o.contributor_guidance_url),
      source: httpLink(o.source_code),
      chat: link(o, "chat"),
      mailingList: link(o, "mailingList"),
      years: [...new Set([...(seen.get(`s:${o.slug}`) ?? []), ...(seen.get(`n:${orgKey(o.name)}`) ?? [])])].sort(),
    }));
    return {
      year: latest,
      yearsCovered: lists.filter((l) => l.orgs).map((l) => l.year),
      orgs,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function getPrograms(): Promise<Programs> {
  "use cache";
  cacheLife("hours");
  const [gsoc, yc, launches] = await Promise.all([getGsoc(), getYC(), getLaunches()]);
  return { gsoc, yc, launches, fetchedAt: new Date().toISOString() };
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
  const seen = new Set<string>();
  const issues: FirstIssue[] = [];
  for (const list of results) {
    for (const i of list ?? []) {
      if (seen.has(i.id)) continue;
      seen.add(i.id);
      issues.push(i);
    }
  }
  issues.sort((a, b) => b.repository.stargazerCount - a.repository.stargazerCount);
  // A busy repo can label a dozen issues in a day; two each keeps the list worth scanning.
  const perRepo = new Map<string, number>();
  const varied = issues.filter((i) => {
    const n = (perRepo.get(i.repository.nameWithOwner) ?? 0) + 1;
    perRepo.set(i.repository.nameWithOwner, n);
    return n <= 2;
  });
  return { issues: varied.slice(0, 24), live: results.some((r) => r !== null), fetchedAt: new Date().toISOString() };
}
