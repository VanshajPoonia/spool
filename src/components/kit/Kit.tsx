import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { carrier } from "@/lib/carriers";
import s from "./kit.module.css";

/* Two-letter carrier code with its livery stripe. Pass `code` when a list assigned collision-free codes. */
export function CarrierTag({ repo, size = "md", title, code }: { repo: string; size?: "sm" | "md" | "lg"; title?: string; code?: string }) {
  const c = carrier(repo, code);
  return (
    <span
      className={s.carrier}
      data-size={size}
      style={{ "--c1": c.livery[0], "--c2": c.livery[1] } as CSSProperties}
      title={title ?? repo}
    >
      <span className={s.fin} aria-hidden="true" />
      <span className={s.code}>{c.code}</span>
      <span className="sr-only">{repo}</span>
    </span>
  );
}

export type LampState = "go" | "wait" | "stop" | "idle";

/* Status lamp. Shape carries state as well as colour. */
export function Lamp({ state, label }: { state: LampState; label?: string }) {
  return (
    <span className={s.lamp} data-state={state} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />
  );
}

/* A plane seen from above, nose up, on the 32-unit grid. Rotated for arrivals and departures. */
const PLANE =
  "M16 3c1.1 0 1.8 1.2 1.8 2.6v7l10.8 5.8v2.4l-10.8-3.2v6.8l3.2 2.2v1.8L16 27.2l-5 1.2v-1.8l3.2-2.2v-6.8L3.4 20.8v-2.4l10.8-5.8v-7C14.2 4.2 14.9 3 16 3Z";

export type PictogramName = "arrivals" | "departures" | "clock" | "arrow" | "key" | "route" | "wall" | "hourglass" | "tail" | "spool";

/* Wayfinding pictograms drawn for this board: solid silhouettes, one fill weight, 32-unit grid. */
export function Pictogram({ name, className }: { name: PictogramName; className?: string }) {
  const common = { viewBox: "0 0 32 32", className, "aria-hidden": true as const, fill: "currentColor" };
  switch (name) {
    case "departures":
      return (
        <svg {...common}>
          <path d={PLANE} transform="translate(16 14.5) rotate(45) scale(0.8) translate(-16 -16)" />
          <rect x="3" y="27.4" width="26" height="3" rx="1.5" />
        </svg>
      );
    case "arrivals":
      return (
        <svg {...common}>
          <path d={PLANE} transform="translate(16 14) rotate(135) scale(0.8) translate(-16 -16)" />
          <rect x="3" y="27.4" width="26" height="3" rx="1.5" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <path fillRule="evenodd" d="M16 2.5a13.5 13.5 0 1 1 0 27 13.5 13.5 0 0 1 0-27ZM14.4 8v9.2l6.4 4.1 1.7-2.7-4.9-3.1V8h-3.2Z" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M4 13.6h16.4l-5.6-5.6 3.4-3.4L29.6 16 18.2 27.4l-3.4-3.4 5.6-5.6H4v-4.8Z" />
        </svg>
      );
    case "key":
      return (
        <svg {...common}>
          <path fillRule="evenodd" d="M11 6a7 7 0 0 1 6.62 9.27l9.06 9.06a1.6 1.6 0 0 1 .47 1.13V27a1.6 1.6 0 0 1-1.6 1.6h-3.2a1.6 1.6 0 0 1-1.6-1.6v-1.4h-1.4a1.6 1.6 0 0 1-1.6-1.6v-1.4h-1.4a1.6 1.6 0 0 1-1.13-.47l-1.5-1.5A7 7 0 1 1 11 6Zm-1.6 4.4a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z" />
        </svg>
      );
    case "route":
      // a signpost: two direction boards on one pole
      return (
        <svg {...common}>
          <rect x="14.3" y="2.5" width="3.4" height="26" />
          <path d="M5.5 5.5h18.2l3.8 3.9-3.8 3.9H5.5V5.5ZM26.5 15H8.3l-3.8 3.9 3.8 3.9h18.2V15Z" />
          <rect x="9.5" y="27.5" width="13" height="3" rx="1" />
        </svg>
      );
    case "wall":
      // a flight information screen on its stand
      return (
        <svg {...common}>
          <path fillRule="evenodd" d="M5 4h22a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2.6 4v3h4.6V8H7.6Zm6.6 0v3h10.2V8H14.2Zm-6.6 6v3h4.6v-3H7.6Zm6.6 0v3h10.2v-3H14.2Z" />
          <rect x="14" y="22" width="4" height="5" />
          <rect x="8" y="27" width="16" height="3" rx="1" />
        </svg>
      );
    case "hourglass":
      return (
        <svg {...common}>
          <path d="M6.5 3h19v3.4h-1.7c0 4.3-2.4 7.3-5.7 9.6 3.3 2.3 5.7 5.3 5.7 9.6h1.7V29h-19v-3.4h1.7c0-4.3 2.4-7.3 5.7-9.6-3.3-2.3-5.7-5.3-5.7-9.6H6.5V3Z" />
        </svg>
      );
    case "tail":
      // an aircraft tail fin with its livery stripe cut out
      return (
        <svg {...common}>
          <path fillRule="evenodd" d="M5.5 29 14.6 3H22l4.5 26h-21Zm8.6-9.6 2.5-7.4h3.6l-2.5 7.4h-3.6Z" />
        </svg>
      );
    case "spool":
      // a spool of thread between two flanges, the loose end trailing off
      return (
        <svg {...common}>
          <rect x="4.5" y="3" width="23" height="4.2" rx="1.2" />
          <rect x="4.5" y="24.8" width="23" height="4.2" rx="1.2" />
          <path
            fillRule="evenodd"
            d="M8.5 8.2h15v15.6h-15V8.2Zm0 4.1 15-1.6v1.6l-15 1.6v-1.6Zm0 4.4 15-1.6v1.6l-15 1.6v-1.6Zm0 4.4 15-1.6v1.6l-15 1.6v-1.6Z"
          />
        </svg>
      );
  }
}

type SignProps = {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: "sign" | "board" | "ink" | "cell";
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;

/* A wayfinding sign that works as a link. */
export function SignLink({ href, children, icon, variant = "sign", className, ...rest }: SignProps) {
  return (
    <Link href={href} className={`${s.sign} ${className ?? ""}`} data-variant={variant} {...rest}>
      <span className={s.signLabel}>{children}</span>
      <span className={s.signIcon}>{icon ?? <Pictogram name="arrow" />}</span>
    </Link>
  );
}
