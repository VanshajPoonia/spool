"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { fetchLogPrs } from "@/lib/github";
import { buildLogbook, sampleLogPrs, yearCard, type LogPr, type YearCard } from "@/lib/logbook";
import { logbookStore, useAuth } from "@/lib/store";
import { fmtDate } from "@/lib/time";
import { useBoard } from "./BoardProvider";
import p from "./page.module.css";
import s from "./logbook.module.css";

const SIX_HOURS = 6 * 3600000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthName = (m: string) => `${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;

/* Merged PRs per month: one series, bars from one baseline, a readout on hover and focus. */
function MonthBars({ months }: { months: { month: string; merged: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  // Drawn at its real width, so bars stay at most 24px and labels stay 11px on any screen.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 150;
  const top = 18;
  const base = H - 22;
  const max = Math.max(1, ...months.map((m) => m.merged));
  const slot = W / months.length;
  const bw = Math.min(24, slot - 2);
  const y = (v: number) => base - (v / max) * (base - top);
  // Rounded at the data end, square at the baseline.
  const bar = (x: number, h: number) => {
    const r = Math.min(4, h / 2, bw / 2);
    return `M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + bw - r} Q${x + bw},${base - h} ${x + bw},${base - h + r} V${base} Z`;
  };
  const shown = hover !== null ? months[hover] : null;
  return (
    <figure className={s.chart}>
      <figcaption className={s.readout} aria-live="polite">
        {shown ? (
          <>
            <strong>{shown.merged}</strong> merged in {monthName(shown.month)}
          </>
        ) : (
          "Merged PRs per month, last two years. Point at a bar for its month."
        )}
      </figcaption>
      <div ref={box}>
        {W > 0 && (
          <svg width={W} height={H} className={s.svg} role="img" aria-label="Merged PRs per month over the last 24 months">
            <line x1={0} x2={W} y1={y(max)} y2={y(max)} className={s.grid} />
            <text x={0} y={y(max) - 5} className={s.axis}>
              {max}
            </text>
            <line x1={0} x2={W} y1={base} y2={base} className={s.base} />
            {months.map((m, i) => {
              const x = i * slot + (slot - bw) / 2;
              const h = base - y(m.merged);
              return (
                <g key={m.month}>
                  {m.merged > 0 && <path d={bar(x, h)} className={s.bar} data-on={hover === i || undefined} />}
                  <rect
                    x={i * slot}
                    y={top - 8}
                    width={slot}
                    height={base - top + 8}
                    className={s.hit}
                    tabIndex={0}
                    aria-label={`${monthName(m.month)}: ${m.merged} merged`}
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                  />
                  {m.month.endsWith("-01") && (
                    <text x={i * slot + slot / 2} y={H - 6} className={s.axis} textAnchor="middle">
                      {m.month.slice(0, 4)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>
      <table className="sr-only">
        <caption>Merged PRs per month</caption>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}>
              <th scope="row">{monthName(m.month)}</th>
              <td>{m.merged}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/* The year card, drawn on a canvas so the preview and the PNG are the same picture. */
function drawCard(cv: HTMLCanvasElement, c: YearCard, login: string, font: string) {
  const W = 1200;
  const H = 630;
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d");
  if (!g) return;
  const ink = "#f7f8f8";
  const ink2 = "#9ca3ae";
  const ink3 = "#7d838d";
  const accent = "#7170ff";
  g.fillStyle = "#08090a";
  g.fillRect(0, 0, W, H);
  g.textBaseline = "alphabetic";
  g.fillStyle = ink2;
  g.font = `500 26px ${font}`;
  g.fillText("(o_o)  Spool", 64, 92);
  g.fillStyle = ink;
  g.font = `600 52px ${font}`;
  g.fillText(`@${login}'s ${c.year} in open source`, 64, 168);

  const stats: [string, string][] = [
    [String(c.merged), c.merged === 1 ? "PR merged" : "PRs merged"],
    [String(c.repos.length), c.repos.length === 1 ? "repo" : "repos"],
    [String(c.opened), c.opened === 1 ? "PR opened" : "PRs opened"],
    [String(c.longest), c.longest === 1 ? "week streak" : "weeks in a row"],
  ];
  stats.forEach(([n, label], i) => {
    const x = 64 + i * 200;
    g.fillStyle = ink;
    g.font = `600 64px ${font}`;
    g.fillText(n, x, 270);
    g.fillStyle = ink3;
    g.font = `500 22px ${font}`;
    g.fillText(label, x, 304);
  });

  // Twelve months of merges, rounded at the top, square on the baseline.
  const bx = 64;
  const base = 520;
  const max = Math.max(1, ...c.months);
  c.months.forEach((v, m) => {
    const x = bx + m * 52;
    const h = (v / max) * 150;
    if (v > 0) {
      g.fillStyle = accent;
      g.beginPath();
      g.roundRect(x, base - h, 24, h, [4, 4, 0, 0]);
      g.fill();
    }
    g.fillStyle = ink3;
    g.font = `500 18px ${font}`;
    g.fillText(MONTHS[m][0], x + 6, base + 30);
  });
  g.strokeStyle = "#2c2e33";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(bx, base + 0.5);
  g.lineTo(bx + 11 * 52 + 24, base + 0.5);
  g.stroke();

  g.fillStyle = ink2;
  g.font = `600 22px ${font}`;
  g.fillText("Most merged", 760, 372);
  c.repos.slice(0, 4).forEach((r, i) => {
    g.fillStyle = ink;
    g.font = `500 22px ${font}`;
    const name = r.repo.length > 30 ? `${r.repo.slice(0, 29)}…` : r.repo;
    g.fillText(name, 760, 414 + i * 38);
    g.fillStyle = ink3;
    g.fillText(String(r.merged), 1110, 414 + i * 38);
  });
  if (!c.repos.length) {
    g.fillStyle = ink3;
    g.font = `500 22px ${font}`;
    g.fillText("Nothing merged yet this year.", 760, 414);
  }
  g.fillStyle = ink3;
  g.font = `500 20px ${font}`;
  g.fillText("spool.vanshajpoonia.com", 64, 600);
}

export function LogbookPanel() {
  const { mode, login, now } = useBoard();
  const auth = useAuth();
  const box = logbookStore.use();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (mode !== "live" || !auth || !login) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetchLogPrs(auth.token, login);
      logbookStore.write({ login, at: new Date().toISOString(), total: r.total, prs: r.prs });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read your PRs.");
    } finally {
      setBusy(false);
    }
  }, [mode, auth, login]);

  useEffect(() => {
    if (mode !== "live" || !login) return;
    const c = logbookStore.read();
    if (c.login === login && c.at && Date.now() - Date.parse(c.at) < SIX_HOURS) return;
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [mode, login, load]);

  const prs: LogPr[] | null = useMemo(() => {
    if (mode === "sample") return now ? sampleLogPrs(now) : null;
    return box.login === login && box.at ? box.prs : null;
  }, [mode, now, box, login]);
  const total = mode === "sample" ? (prs?.length ?? 0) : box.total;
  const lb = useMemo(() => (prs && login && now ? buildLogbook(prs, total, login, now) : null), [prs, total, login, now]);

  const [year, setYear] = useState<number | null>(null);
  const pickYear = year ?? lb?.years[0] ?? null;
  const card = useMemo(() => (prs && login && pickYear ? yearCard(prs, login, pickYear) : null), [prs, login, pickYear]);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current && card && login) drawCard(canvas.current, card, login, getComputedStyle(document.body).fontFamily);
  }, [card, login]);

  const download = () =>
    canvas.current?.toBlob((b) => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spool-${pickYear}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");

  return (
    <section className={`${p.panel} ${s.panel}`} aria-busy={busy}>
      <div className={p.panelHead}>
        <div>
          <h2>Logbook</h2>
          <p>
            What you&rsquo;ve landed in other people&rsquo;s repos; your own are left out.
            {mode === "sample" ? " Sample data." : lb && lb.read < lb.total ? ` From your newest ${lb.read} of ${lb.total} PRs.` : ""}
          </p>
        </div>
      </div>
      {error && <p className={p.error}>{error}</p>}
      {!lb ? (
        !error && (
          <div className={p.loading}>
            <span className="shimmer">Reading your PRs from GitHub…</span>
          </div>
        )
      ) : (
        <>
          <dl className={s.stats}>
            <div>
              <dt>Merged</dt>
              <dd>{lb.merged}</dd>
            </div>
            <div>
              <dt>Opened</dt>
              <dd>{lb.opened}</dd>
            </div>
            <div>
              <dt>Repos with a merge</dt>
              <dd>{lb.repos.length}</dd>
            </div>
            <div>
              <dt>Weekly streak</dt>
              <dd>
                {lb.streak.current} <span>now, {lb.streak.longest} at best</span>
              </dd>
            </div>
          </dl>
          <p className={s.ends}>
            {lb.first ? (
              <>
                First merge {fmtDate(lb.first.mergedAt!, true)} in {lb.first.repo}. Latest {fmtDate(lb.latest!.mergedAt!, true)} in {lb.latest!.repo}.
              </>
            ) : (
              "Nothing merged outside your own repos yet."
            )}{" "}
            A week counts when you open or land a PR, so a quiet weekend doesn&rsquo;t break the streak.
          </p>
          <MonthBars months={lb.months} />
          {lb.repos.length > 0 && (
            <ol className={s.top}>
              {lb.repos.slice(0, 5).map((r) => (
                <li key={r.repo}>
                  <Link href={`/board/repos/${r.repo}`}>{r.repo}</Link>
                  <span>{r.merged} merged</span>
                </li>
              ))}
            </ol>
          )}

          {card && (
            <div className={s.card}>
              <div className={s.cardHead}>
                <h3>Your year as an image</h3>
                {lb.years.length > 1 && (
                  <label className={s.select}>
                    <span className="sr-only">Year</span>
                    <select value={pickYear ?? ""} onChange={(e) => setYear(Number(e.target.value))}>
                      {lb.years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button type="button" className={p.btn} onClick={download}>
                  <Download size={15} aria-hidden="true" />
                  Download PNG
                </button>
              </div>
              <canvas
                ref={canvas}
                className={s.canvas}
                role="img"
                aria-label={`${card.year}: ${card.merged} PRs merged across ${card.repos.length} repos, ${card.opened} opened, ${card.longest} weeks in a row at best`}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
