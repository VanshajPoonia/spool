import type { ReactNode } from "react";
import sec from "./section.module.css";

/* A turn in the page: a raised band opened by its own statement, holding the sections that follow. */
export function Chapter({ id, title, rest, children }: { id: string; title: string; rest: ReactNode; children: ReactNode }) {
  return (
    <div className={sec.chapter} id={id}>
      <div className={sec.chapterHead}>
        <h2 id={`${id}-title`} className={sec.statement}>
          {title} <span className={sec.statementRest}>{rest}</span>
        </h2>
      </div>
      {children}
    </div>
  );
}
