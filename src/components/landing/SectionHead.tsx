import type { ReactNode } from "react";
import sec from "./section.module.css";

/* A section opens with its headline and a lede; the page's one face lives in the nav. */
export function SectionHead({ id, title, className, children }: { id: string; title: string; className?: string; children: ReactNode }) {
  return (
    <div className={`${sec.head}${className ? ` ${className}` : ""}`}>
      <h2 id={id} className={sec.h2}>
        {title}
      </h2>
      <p className={sec.lede}>{children}</p>
    </div>
  );
}
