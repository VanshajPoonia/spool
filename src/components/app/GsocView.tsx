"use client";

import Link from "next/link";
import { CSSProperties, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, Code2, Lightbulb, MessageCircle, Search, Star } from "lucide-react";
import { matchOrg, tagMatches } from "@/lib/interests";
import type { GsocBrowser, GsocOrgFull } from "@/lib/programs";
import { toggleOrg, useMeta, useSettings } from "@/lib/store";
import { fmtDate } from "@/lib/time";
import p from "./page.module.css";
import s from "./gsoc.module.css";

type Show = "matches" | "all" | "saved";
type Tenure = "any" | "first" | "returning";

const PAGE = 24;

function yearsText(o: GsocOrgFull, covered: string[]) {
  if (o.years.length <= 1) return "First year in GSoC";
  // The API only publishes lists back to its oldest year, so a full run reads "every year since".
  if (o.years.length === covered.length) return `Every year since ${covered[0]}`;
  return `${o.years.length} of the last ${covered.length} years`;
}

function OrgCard({ o, m, covered, saved, i }: { o: GsocOrgFull; m: string[]; covered: string[]; saved: boolean; i: number }) {
  const links = [
    o.ideas && { href: o.ideas, label: "Project ideas", icon: Lightbulb, primary: true },
    o.guide && { href: o.guide, label: "Contributor guide", icon: BookOpen },
    o.source && { href: o.source, label: "Source", icon: Code2 },
    (o.chat ?? o.mailingList) && { href: (o.chat ?? o.mailingList)!, label: o.chat ? "Chat" : "Mailing list", icon: MessageCircle },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Lightbulb; primary?: boolean }[];

  return (
    <li className={s.card} style={{ "--i": i % PAGE } as CSSProperties}>
      <div className={s.cardHead}>
        <span className={s.logo} aria-hidden="true">
          {o.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={o.logo} alt="" loading="lazy" width={44} height={44} />
          ) : (
            <span>{o.name.slice(0, 1)}</span>
          )}
        </span>
        <div className={s.title}>
          <a href={o.url} target="_blank" rel="noreferrer" className={s.name}>
            {o.name}
          </a>
          <span className={s.years} data-first={o.years.length <= 1 || undefined}>
            {yearsText(o, covered)}
          </span>
        </div>
        <button
          type="button"
          className={s.save}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${o.name} from saved` : `Save ${o.name}`}
          title={saved ? "Saved" : "Save"}
          onClick={() => toggleOrg(o.slug, o.name)}
        >
          <Star size={18} aria-hidden="true" />
        </button>
      </div>

      <p className={s.tagline}>{o.tagline}</p>

      <div className={s.tags}>
        {o.tech.slice(0, 7).map((t) => (
          <span key={t} data-m={m.some((x) => tagMatches(t, x)) || undefined}>
            {t}
          </span>
        ))}
      </div>

      <p className={s.meta}>
        {o.categories.join(", ")}
        {o.license && <span> · {o.license}</span>}
      </p>

      {links.length > 0 && (
        <div className={s.links}>
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer" data-primary={l.primary || undefined}>
              <l.icon size={14} aria-hidden="true" />
              {l.label}
            </a>
          ))}
        </div>
      )}
    </li>
  );
}

export function GsocView({ data }: { data: GsocBrowser | null }) {
  const { interests } = useSettings();
  const meta = useMeta();
  const [q, setQ] = useState("");
  const [show, setShow] = useState<Show>("matches");
  const [tech, setTech] = useState("");
  const [category, setCategory] = useState("");
  const [tenure, setTenure] = useState<Tenure>("any");
  const [limit, setLimit] = useState(PAGE);

  const orgs = useMemo(() => data?.orgs ?? [], [data]);
  const covered = useMemo(() => data?.yearsCovered ?? [], [data]);
  const savedCount = orgs.filter((o) => meta.orgs[o.slug]).length;

  const techOptions = useMemo(() => {
    const n: Record<string, number> = {};
    for (const o of orgs) for (const t of o.tech) n[t.toLowerCase()] = (n[t.toLowerCase()] ?? 0) + 1;
    return Object.entries(n)
      .filter(([, c]) => c >= 3)
      .sort((a, b) => b[1] - a[1])
      .map(([t, c]) => ({ t, c }));
  }, [orgs]);

  const categories = useMemo(() => [...new Set(orgs.flatMap((o) => o.categories))].sort(), [orgs]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orgs
      .map((o) => ({ o, m: matchOrg(o, interests) }))
      .filter(({ o, m }) => {
        if (show === "matches" && !m.length) return false;
        if (show === "saved" && !meta.orgs[o.slug]) return false;
        if (tech && !o.tech.some((t) => t.toLowerCase() === tech)) return false;
        if (category && !o.categories.includes(category)) return false;
        if (tenure === "first" && o.years.length > 1) return false;
        if (tenure === "returning" && o.years.length <= 1) return false;
        if (needle && !`${o.name} ${o.tagline} ${o.tech.join(" ")} ${o.topics.join(" ")}`.toLowerCase().includes(needle)) return false;
        return true;
      })
      .sort((a, b) => b.m.length - a.m.length || b.o.years.length - a.o.years.length || a.o.name.localeCompare(b.o.name));
  }, [orgs, interests, show, meta.orgs, tech, category, tenure, q]);

  const filtered = !!(q || tech || category || tenure !== "any");
  const reset = () => {
    setQ("");
    setTech("");
    setCategory("");
    setTenure("any");
    setLimit(PAGE);
  };
  // Any change to the filters starts the list from the top again.
  const change = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setLimit(PAGE);
  };

  if (!data) {
    return (
      <div className={p.page}>
        <Link href="/board/programs" className={s.back}>
          <ArrowLeft size={16} aria-hidden="true" /> Programs
        </Link>
        <h1 className={p.h1}>GSoC organisations</h1>
        <p className={p.error}>The GSoC program API didn&rsquo;t answer just now. This page fills in on the next refresh.</p>
      </div>
    );
  }

  return (
    <div className={p.page}>
      <div className={p.head}>
        <div>
          <Link href="/board/programs" className={s.back}>
            <ArrowLeft size={16} aria-hidden="true" /> Programs
          </Link>
          <h1 className={p.h1}>GSoC {data.year} organisations</h1>
          <p className={p.lede}>
            All {orgs.length} organisations in Google Summer of Code {data.year}, from the program&rsquo;s own API. Best matches for your
            interests ({interests.join(", ") || "none set"}) come first; change them on the <Link href="/board/discover">Discover</Link> tab.
            Years in GSoC are counted from the lists the API publishes, back to {covered[0]}.
          </p>
        </div>
      </div>

      <div className={s.toolbar}>
        <div className={s.seg} role="group" aria-label="Which organisations">
          {(
            [
              ["matches", "Your matches"],
              ["all", `All ${orgs.length}`],
              ["saved", `Saved${savedCount ? ` ${savedCount}` : ""}`],
            ] as [Show, string][]
          ).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={show === k} onClick={() => change(setShow)(k)}>
              {label}
            </button>
          ))}
        </div>

        <label className={s.search}>
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search organisations</span>
          <input value={q} onChange={(e) => change(setQ)(e.target.value)} placeholder="Search name, tech or topic" />
        </label>

        <label className={s.select}>
          <span>Tech</span>
          <select value={tech} onChange={(e) => change(setTech)(e.target.value)}>
            <option value="">Any</option>
            {techOptions.map(({ t, c }) => (
              <option key={t} value={t}>
                {t} ({c})
              </option>
            ))}
          </select>
        </label>

        <label className={s.select}>
          <span>Category</span>
          <select value={category} onChange={(e) => change(setCategory)(e.target.value)}>
            <option value="">Any</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className={s.select}>
          <span>In GSoC</span>
          <select value={tenure} onChange={(e) => change(setTenure)(e.target.value as Tenure)}>
            <option value="any">Any</option>
            <option value="returning">Returning orgs</option>
            <option value="first">First year</option>
          </select>
        </label>
      </div>

      <p className={s.count} aria-live="polite">
        {rows.length === 1 ? "1 organisation" : `${rows.length} organisations`}
        {filtered && (
          <button type="button" onClick={reset}>
            Clear filters
          </button>
        )}
      </p>

      {rows.length === 0 ? (
        <p className={p.empty}>
          {show === "saved"
            ? "Nothing saved yet. Star an organisation to keep it here."
            : show === "matches" && !filtered
              ? `No organisation lists your interests (${interests.join(", ") || "none set"}). Show all ${orgs.length}, or add interests on the Discover tab.`
              : "No organisation fits these filters."}
        </p>
      ) : (
        <ul className={s.grid}>
          {rows.slice(0, limit).map(({ o, m }, i) => (
            <OrgCard key={o.slug} o={o} m={m} covered={covered} saved={!!meta.orgs[o.slug]} i={i} />
          ))}
        </ul>
      )}

      {rows.length > limit && (
        <button type="button" className={`${p.btn} ${s.more}`} onClick={() => setLimit((l) => l + PAGE)}>
          Show {Math.min(PAGE, rows.length - limit)} more of {rows.length - limit}
        </button>
      )}

      <p className={p.muted}>
        Fetched {fmtDate(data.fetchedAt)} at {data.fetchedAt.slice(11, 16)} UTC from{" "}
        <a href="https://summerofcode.withgoogle.com/programs" target="_blank" rel="noreferrer" className={s.source}>
          summerofcode.withgoogle.com <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      </p>
    </div>
  );
}
