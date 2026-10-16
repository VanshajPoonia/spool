"use client";

import { useEffect, useRef } from "react";
import { AppWindow, Cloud, X } from "lucide-react";
import { onScrollFrame, ramp, travel } from "./scroll";
import { useMotion } from "./useMotion";
import s from "./route.module.css";

/*
 * Where your token goes, drawn as a route: your browser on one side, GitHub's API on the other, and the three
 * lanes between them. Reads go out, your threads come back, and the lane for writing is closed. As the route
 * scrolls up the page a light runs out along the first lane, then back along the second.
 */
export function Route() {
  const ref = useRef<HTMLDivElement>(null);
  const motion = useMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !motion) return;
    return onScrollFrame(() => {
      const p = travel(el, 0.95, 0.3);
      return () => {
        el.style.setProperty("--out", ramp(0.08, 0.55, p).toFixed(4));
        el.style.setProperty("--back", ramp(0.45, 0.92, p).toFixed(4));
      };
    });
  }, [motion]);

  return (
    <div
      ref={ref}
      className={s.route}
      data-scrub={motion || undefined}
      role="img"
      aria-label="Spool runs in your browser and talks to api.github.com directly. Read-only queries go out and your PRs, issues, reviews and mentions come back. Nothing is ever posted, commented or edited."
    >
      <div className={s.node}>
        <span className={s.icon}>
          <AppWindow size={16} strokeWidth={1.8} />
        </span>
        <span className={s.name}>Your browser</span>
        <span className={s.note}>Token, bay, plan and notes, in local storage</span>
      </div>

      <div className={s.lanes} aria-hidden="true">
        <div className={s.lane} data-dir="out">
          <span className={s.line}>
            <span className={s.beam} />
          </span>
          <span className={s.label}>Read-only queries</span>
        </div>
        <div className={s.lane} data-dir="back">
          <span className={s.line}>
            <span className={s.beam} />
          </span>
          <span className={s.label}>Your PRs, issues, reviews and mentions</span>
        </div>
        <div className={s.lane} data-dir="never">
          <span className={s.line}>
            <span className={s.stop}>
              <X size={11} strokeWidth={2.4} />
            </span>
          </span>
          <span className={s.label}>Posts, comments and edits: never</span>
        </div>
      </div>

      <div className={s.node}>
        <span className={s.icon}>
          <Cloud size={16} strokeWidth={1.8} />
        </span>
        <span className={s.name}>api.github.com</span>
        <span className={s.note}>The one place your token is sent</span>
      </div>
    </div>
  );
}
