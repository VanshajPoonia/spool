"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Search } from "lucide-react";
import type { YcOpenSource } from "@/lib/programs";
import { fmtDate } from "@/lib/time";
import p from "./page.module.css";
// The same toolbar as the GSoC organisation browser.
import g from "./gsoc.module.css";
import s from "./yc.module.css";

const PAGE = 30;
type Show = "all" | "hiring" | "active";

export function YcView({ data }: { data: YcOpenSource | null }) {
  const [show, setShow] = useState<Show>("all");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const companies = useMemo(() => data?.companies ?? [], [data]);

  const tags = useMemo(() => {
    const n: Record<string, number> = {};
    for (const c of companies) for (const t of c.tags) n[t] = (n[t] ?? 0) + 1;
    return Object.entries(n)
      .filter(([, c]) => c >= 4)
      .sort((a, b) => b[1] - a[1]);
  }, [companies]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return companies.filter(
      (c) =>
        (show !== "hiring" || c.hiring) &&
        (show !== "active" || c.status === "Active") &&
        (!tag || c.tags.includes(tag)) &&
        (!needle || `${c.name} ${c.oneLiner} ${c.tags.join(" ")}`.toLowerCase().includes(needle)),
    );
  }, [companies, show, tag, q]);

  const change = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setLimit(PAGE);
  };

  if (!data) {
    return (
      <div className={p.page}>
        <Link href="/board/programs" className={g.back}>
          <ArrowLeft size={16} aria-hidden="true" /> Programs
        </Link>
        <h1 className={p.h1}>YC open source companies</h1>
        <p className={p.error}>The company list didn&rsquo;t answer just now. This page fills in on the next refresh.</p>
      </div>
    );
  }

  const hiring = companies.filter((c) => c.hiring).length;
  const active = companies.filter((c) => c.status === "Active").length;

  return (
    <div className={p.page}>
      <div className={p.head}>
        <div>
          <Link href="/board/programs" className={g.back}>
            <ArrowLeft size={16} aria-hidden="true" /> Programs
          </Link>
          <h1 className={p.h1}>YC open source companies</h1>
          <p className={p.lede}>
            {companies.length} companies from past YC batches that YC&rsquo;s directory tags as open source, newest batch first. Many hire from their
            contributors, so a merged PR is a good way in. From YC&rsquo;s company directory via the{" "}
            <a href="https://github.com/yc-oss/api" target="_blank" rel="noreferrer">
              yc-oss API
            </a>
            {data.updated ? `, rebuilt ${fmtDate(data.updated, true)}` : ""}.
          </p>
        </div>
      </div>

      <div className={g.toolbar}>
        <div className={g.seg} role="group" aria-label="Which companies">
          {(
            [
              ["all", `All ${companies.length}`],
              ["hiring", `Hiring ${hiring}`],
              ["active", `Active ${active}`],
            ] as [Show, string][]
          ).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={show === k} onClick={() => change(setShow)(k)}>
              {label}
            </button>
          ))}
        </div>
        <label className={g.search}>
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search companies</span>
          <input value={q} onChange={(e) => change(setQ)(e.target.value)} placeholder="Search name, what they do or a tag" />
        </label>
        <label className={g.select}>
          <span>Tag</span>
          <select value={tag} onChange={(e) => change(setTag)(e.target.value)}>
            <option value="">Any</option>
            {tags.map(([t, n]) => (
              <option key={t} value={t}>
                {t} ({n})
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <p className={p.empty}>No company fits these filters.</p>
      ) : (
        <ul className={s.list}>
          {rows.slice(0, limit).map((c) => (
            <li key={c.slug} className={s.row}>
              <div className={p.itemMain}>
                <span className={s.head}>
                  <a href={c.website ?? c.ycUrl} target="_blank" rel="noreferrer" className={p.itemTitle}>
                    {c.name}
                  </a>
                  <span className={s.batch}>{c.batch}</span>
                  {c.status !== "Active" && <span className={s.status}>{c.status}</span>}
                  {c.hiring && <span className={s.hiring}>Hiring</span>}
                </span>
                <span className={s.one}>{c.oneLiner}</span>
                <span className={s.meta}>
                  {c.teamSize ? `${c.teamSize} ${c.teamSize === 1 ? "person" : "people"}` : "Team size not listed"}
                  {c.tags.length ? ` · ${c.tags.join(", ")}` : ""}
                </span>
              </div>
              <a href={c.ycUrl} target="_blank" rel="noreferrer" className={s.yc}>
                YC page <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {rows.length > limit && (
        <button type="button" className={`${p.btn} ${s.more}`} onClick={() => setLimit((l) => l + PAGE)}>
          Show {Math.min(PAGE, rows.length - limit)} more of {rows.length - limit}
        </button>
      )}
    </div>
  );
}
