import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { carrier } from "@/lib/carriers";
import s from "./kit.module.css";

/*
 * The arrow on an action. At rest it is a chevron; when its control is hovered or focused the shaft
 * draws in and the head steps forward, so the arrow points the way the click goes.
 */
export function HoverArrow({ className }: { className?: string }) {
  return (
    <svg className={`${s.hoverArrow}${className ? ` ${className}` : ""}`} viewBox="0 0 10 10" aria-hidden="true">
      <path className={s.arrowShaft} d="M0 5h7" />
      <path className={s.arrowHead} d="M1 1l4 4-4 4" />
    </svg>
  );
}

/* A repo's callsign: a short code the strip printer sets, collision-free within any visible set. */
export function Callsign({ repo, size = "md", title, code, onStrip = false }: { repo: string; size?: "sm" | "md" | "lg"; title?: string; code?: string; onStrip?: boolean }) {
  const c = carrier(repo, code);
  return (
    <span className={s.callsign} data-size={size} data-on-strip={onStrip || undefined} title={title ?? repo}>
      <span aria-hidden="true">{c.code}</span>
      <span className="sr-only">{repo}</span>
    </span>
  );
}

export type MarkState = "go" | "wait" | "stop" | "idle";

const MARK_PATH: Record<MarkState, string> = {
  go: "M3.5 9.6 7.1 13.2 14.6 4.6",
  wait: "M9 3.2c3.4 0 5.9 2.5 5.9 5.8 0 3.3-2.6 5.8-5.9 5.8S3.1 12.3 3.1 9c0-2.1 1.1-3.9 2.9-4.9",
  stop: "M4.2 4.4 13.8 13.6M13.6 4.2 4.4 13.8",
  idle: "M4 9.2h10",
};

/* A grease-pencil mark: shape and colour both carry the state (tick, ring, cross, dash). */
export function StateMark({ state, label }: { state: MarkState; label?: string }) {
  return (
    <svg
      className={s.mark}
      data-state={state}
      viewBox="0 0 18 18"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={MARK_PATH[state]} pathLength={1} />
    </svg>
  );
}

/* A pencil ring drawn around whatever it wraps: a silence count gone stale, a date that matters. */
export function PencilRing({ children, on = true }: { children: ReactNode; on?: boolean }) {
  return (
    <span className={s.ringWrap}>
      {children}
      {on && (
        <svg className={s.ring} viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
          <path d="M58 6C30 4 6 10 5 25s22 21 46 20 46-6 45-21S70 3 40 7" pathLength={1} />
        </svg>
      )}
    </span>
  );
}

type StripLinkProps = {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: "primary" | "quiet";
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;

/* An action as a pill: light for the main way in, a quiet wash beside it. */
export function StripLink({ href, children, icon, variant = "primary", className, ...rest }: StripLinkProps) {
  return (
    <Link href={href} className={`${s.stripLink} ${className ?? ""}`} data-variant={variant} {...rest}>
      <span className={s.stripLinkPaper}>
        <span className={s.stripLinkLabel}>{children}</span>
        <span className={s.stripLinkIcon} aria-hidden="true">
          {icon ?? <HoverArrow />}
        </span>
      </span>
    </Link>
  );
}

type StripButtonProps = {
  children: ReactNode;
  icon?: ReactNode;
  variant?: "primary" | "quiet";
  className?: string;
} & Omit<ComponentProps<"button">, "className" | "children">;

/* The same strip as a button, for actions that stay on the page. */
export function StripButton({ children, icon, variant = "primary", className, type = "button", ...rest }: StripButtonProps) {
  return (
    <button type={type} className={`${s.stripLink} ${className ?? ""}`} data-variant={variant} {...rest}>
      <span className={s.stripLinkPaper}>
        <span className={s.stripLinkLabel}>{children}</span>
        <span className={s.stripLinkIcon} aria-hidden="true">
          {icon ?? <HoverArrow />}
        </span>
      </span>
    </button>
  );
}
