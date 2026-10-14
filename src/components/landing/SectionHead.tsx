import type { ReactNode } from "react";
import { Pictogram, type PictogramName } from "@/components/kit/Kit";
import sec from "./section.module.css";

/*
 * Each section opens like a wayfinding sign hung from the ceiling: a black plate with
 * its pictogram and the headline, then the lede on its own. The page's one face lives in the nav.
 * The plate swings on its rods when the page scrolls fast (see SignSway).
 */
export function SectionHead({
  id,
  title,
  pict,
  className,
  children,
}: {
  id: string;
  title: string;
  pict: PictogramName;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${sec.head}${className ? ` ${className}` : ""}`}>
      <div className={sec.plate} data-sway="">
        <span className={sec.platePict}>
          <Pictogram name={pict} />
        </span>
        <h2 id={id} className={sec.h2}>
          {title}
        </h2>
      </div>
      <p className={sec.lede}>{children}</p>
    </div>
  );
}
