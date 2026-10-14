"use client";

import { RefObject, useLayoutEffect, useRef } from "react";
import { printMotion } from "@/components/print/engine";

/*
 * Strips that change bays slide there. Every element under the root with a data-flip id is
 * measured after each change; one that moved animates from where it was. Positions are kept
 * relative to the root, so scrolling between changes never reads as movement.
 */
export function useFlip(root: RefObject<HTMLElement | null>, key: unknown) {
  const rects = useRef(new Map<string, { x: number; y: number }>());
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const base = el.getBoundingClientRect();
    const motion = printMotion();
    const seen = new Set<string>();
    el.querySelectorAll<HTMLElement>("[data-flip]").forEach((item) => {
      const id = item.dataset.flip!;
      seen.add(id);
      const r = item.getBoundingClientRect();
      const now = { x: r.left - base.left, y: r.top - base.top };
      const prev = rects.current.get(id);
      rects.current.set(id, now);
      if (!prev || !motion) return;
      const dx = prev.x - now.x;
      const dy = prev.y - now.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      // A strip changing bays is lifted out, carried across and pressed back into its holder.
      const far = Math.abs(dy) > r.height * 1.5;
      item.animate(
        far
          ? [
              { transform: `translate(${dx}px, ${dy}px)`, zIndex: 3 },
              { transform: `translate(${dx * 0.45 + 14}px, ${dy * 0.45}px) scale(1.025)`, boxShadow: "0 18px 30px -12px rgba(0,0,0,0.55)", zIndex: 3, offset: 0.45 },
              { transform: "none", zIndex: 3 },
            ]
          : [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { duration: far ? 760 : 460, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    });
    for (const id of rects.current.keys()) if (!seen.has(id)) rects.current.delete(id);
  }, [root, key]);
}
