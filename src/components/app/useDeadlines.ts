"use client";

import { useEffect, useMemo, useState } from "react";
import { orgDeadlines, programDeadlines, upcoming } from "@/lib/deadlines";
import { sampleOrgs } from "@/lib/orgs";
import type { Programs } from "@/lib/programs";
import { useMeta, useSettings } from "@/lib/store";
import { useBoard } from "./BoardProvider";

// One fetch per page load, shared by the board's strip and the alerts; the server caches it for hours.
let programs: Promise<Programs | null> | null = null;
function loadPrograms() {
  // Program dates are extra: if the feed is down, the strip still shows your orgs' dates.
  programs ??= fetch("/api/programs").then((r) => (r.ok ? (r.json() as Promise<Programs>) : null), () => null);
  return programs;
}

/* Every future followed deadline and org date; the strip, the alerts and the calendar file read from it. */
function useDeadlineList(within: number) {
  const { mode, now } = useBoard();
  const meta = useMeta();
  const { followPrograms } = useSettings();
  const [data, setData] = useState<Programs | null>(null);
  const following = mode !== "sample" && followPrograms.length > 0;

  useEffect(() => {
    if (!following) return;
    let alive = true;
    void loadPrograms().then((p) => alive && setData(p));
    return () => {
      alive = false;
    };
  }, [following]);

  return useMemo(() => {
    if (!now) return [];
    const orgs = Object.values(mode === "sample" ? sampleOrgs(now) : meta.investing);
    return upcoming([...orgDeadlines(orgs), ...(following && data ? programDeadlines(data, followPrograms, now) : [])], now, within);
  }, [now, mode, meta.investing, following, data, followPrograms, within]);
}

/** Followed program deadlines and your orgs' next dates within 14 days, soonest first. */
export const useDeadlines = () => useDeadlineList(14);

/** All of them, for the calendar file. */
export const useAllDeadlines = () => useDeadlineList(3650);
