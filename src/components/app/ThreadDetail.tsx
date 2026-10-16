"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Pin, PinOff, X } from "lucide-react";
import { Callsign, StateMark } from "@/components/kit/Kit";
import { statusLabel } from "@/lib/format";
import { ago, type Thread } from "@/lib/classify";
import { fetchTimeline, type TimelineEvent } from "@/lib/github";
import { COLS, threadKey } from "@/lib/plan";
import { sampleTimeline } from "@/lib/sample-board";
import { planStoreFor, setNote, togglePin, useAuth, useMeta } from "@/lib/store";
import { fmtDate } from "@/lib/time";
import type { Mode } from "./BoardProvider";
import { PriorityMenu } from "./Priority";
import { SnoozeMenu } from "./ThreadRow";
import s from "./detail.module.css";

const CI: Record<string, string> = {
  SUCCESS: "Checks passing",
  FAILURE: "Checks failing",
  ERROR: "Checks errored",
  PENDING: "Checks running",
  EXPECTED: "Checks expected",
};

const REVIEW: Record<string, string> = {
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Changes requested",
  REVIEW_REQUIRED: "Review required",
};

export function ThreadDetail({ t, code, mode, now, onClose }: { t: Thread; code?: string; mode: Mode; now: number; onClose: () => void }) {
  const auth = useAuth();
  const meta = useMeta();
  // The parent keys this component by thread id, so state starts fresh per thread.
  const [events, setEvents] = useState<TimelineEvent[] | null>(() => (mode === "sample" ? sampleTimeline(t.id) : null));
  const [err, setErr] = useState<string | null>(null);
  const [note, setNoteDraft] = useState(meta.notes[t.id] ?? "");
  const closeRef = useRef<HTMLButtonElement>(null);
  const pinned = !!meta.pins[t.id];
  const planSt = planStoreFor(mode === "sample");
  const plan = planSt.use();
  const key = threadKey(t.id);
  const placed = plan.place[key];
  // Where it sits on your plan: where you put it, or where its state puts it (the same rule the Plan tab uses).
  const onPlan = plan.hidden[key]
    ? null
    : t.next === "done"
      ? placed || plan.prio[key]
        ? "Done"
        : null
      : placed
        ? COLS.find((c) => c.id === placed.col)!.title
        : t.next === "them"
          ? "Waiting"
          : t.next === "you"
            ? "Inbox"
            : null;

  useEffect(() => {
    let alive = true;
    if (mode === "sample" || !auth) return;
    fetchTimeline(auth.token, t.id)
      .then((ev) => alive && setEvents(ev))
      .catch((e) => alive && setErr(e instanceof Error ? e.message : "Couldn't load the timeline."));
    return () => {
      alive = false;
    };
  }, [t.id, mode, auth]);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, [t.id]);

  const snoozedUntil = meta.snoozed[t.id] && Date.parse(meta.snoozed[t.id]) > now ? meta.snoozed[t.id] : undefined;

  return (
    <aside className={s.drawer} aria-label={`Details for ${t.repo}#${t.num}`}>
      <div className={s.top}>
        <Callsign repo={t.repo} size="lg" code={code} />
        <div className={s.ref}>
          <span>{t.repo}</span>
          <span className={s.num}>
            #{t.num} · {t.kind === "pr" ? "Pull request" : "Issue"}
          </span>
        </div>
        <button ref={closeRef} type="button" className={s.close} onClick={onClose} aria-label="Close details (Esc)">
          <X size={18} />
        </button>
      </div>

      <h2 className={s.title}>{t.title}</h2>

      <div className={s.status}>
        <StateMark state={t.tone ?? "idle"} />
        <span className={s.statusText} data-tone={t.tone}>
          {statusLabel(t.status)}
        </span>
      </div>
      <p className={s.reason}>{t.reason}</p>

      <div className={s.actions}>
        <a href={t.url} target="_blank" rel="noreferrer" className={s.open}>
          Open on GitHub
          <ArrowUpRight size={18} aria-hidden="true" />
        </a>
        <button type="button" className={s.btn} onClick={() => togglePin(t.id)} aria-pressed={pinned}>
          {pinned ? <PinOff size={16} aria-hidden="true" /> : <Pin size={16} aria-hidden="true" />}
          {pinned ? "Unpin" : "Pin"}
        </button>
        {t.next !== "done" && <SnoozeMenu id={t.id} snoozedUntil={snoozedUntil} />}
        {snoozedUntil && <span className={s.snoozed}>Snoozed until {fmtDate(snoozedUntil)}</span>}
      </div>

      <div className={s.plan}>
        <span className={s.planLabel}>Priority</span>
        <PriorityMenu st={planSt} k={key} p={plan.prio[key] ?? null} label={`${t.repo}#${t.num}`} full align="left" />
        <span className={s.planWhere}>
          {onPlan ? (
            <>
              On your plan: <Link href="/board/plan">{onPlan}</Link>
            </>
          ) : (
            <>
              Not on your <Link href="/board/plan">plan</Link>
              {t.next === "watch" ? "; give it a priority to add it" : ""}
            </>
          )}
        </span>
      </div>

      <dl className={s.facts}>
        <div>
          <dt>Opened</dt>
          <dd>
            {fmtDate(t.createdAt, true)}
            {t.author ? ` by @${t.author}` : ""}
          </dd>
        </div>
        <div>
          <dt>Last word</dt>
          <dd>
            {t.lastActor ? `@${t.lastActor}` : "nobody"}, {now ? `${ago(t.lastAt, now)} ago` : fmtDate(t.lastAt)}
          </dd>
        </div>
        {t.kind === "pr" && (
          <div>
            <dt>Checks</dt>
            <dd data-ci={t.ci ?? "NONE"}>{t.ci ? CI[t.ci] ?? t.ci : "No checks reported"}</dd>
          </div>
        )}
        {t.kind === "pr" && (
          <div>
            <dt>Review</dt>
            <dd>{t.review ? REVIEW[t.review] ?? t.review : "No review yet"}</dd>
          </div>
        )}
        <div>
          <dt>Comments</dt>
          <dd>{t.comments}</dd>
        </div>
        <div>
          <dt>Quiet for</dt>
          <dd>{t.quietDays === 0 ? "Under a day" : `${t.quietDays} day${t.quietDays === 1 ? "" : "s"}`}</dd>
        </div>
      </dl>

      {t.labels.length > 0 && (
        <ul className={s.labels}>
          {t.labels.map((l) => (
            <li key={l.name} style={{ "--lc": `#${l.color}` } as React.CSSProperties}>
              {l.name}
            </li>
          ))}
        </ul>
      )}

      <label className={s.noteLabel} htmlFor={`note-${t.id}`}>
        Your note <span>(kept in this browser)</span>
      </label>
      <textarea
        id={`note-${t.id}`}
        className={s.note}
        value={note}
        placeholder="e.g. waiting on the 2.0 release before pinging"
        onChange={(e) => setNoteDraft(e.target.value)}
        onBlur={() => setNote(t.id, note)}
        rows={2}
      />

      <h3 className={s.tlTitle}>Timeline</h3>
      {err && <p className={s.err}>{err}</p>}
      {!events && !err && (
        <div className={s.loading}>
          <span className="shimmer">Reading the timeline…</span>
        </div>
      )}
      {events && events.length === 0 && <p className={s.muted}>No events returned.</p>}
      {events && events.length > 0 && (
        <ol className={s.timeline}>
          {events.map((e, i) => (
            <li key={i} data-kind={e.kind}>
              <span className={s.tlWhen}>{fmtDate(e.at)}</span>
              <span className={s.tlText}>
                <strong>{e.actor ? `@${e.actor}` : "Someone"}</strong> {e.text}
              </span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
