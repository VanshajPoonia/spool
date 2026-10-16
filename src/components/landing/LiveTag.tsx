"use client";

import { useRef, type ReactNode } from "react";
import { useInView } from "./mood";
import sec from "./section.module.css";

/* The LIVE caption. Its dot pings only while the tag is on screen, so the loop never runs unseen. */
export function LiveTag({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { visible } = useInView(ref, "0px");
  return (
    <span ref={ref} className={`${sec.tag} ${sec.tagLive}`} data-on={visible || undefined}>
      {children}
    </span>
  );
}
