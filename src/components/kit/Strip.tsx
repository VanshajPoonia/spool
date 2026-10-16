import type { CSSProperties, ReactNode, Ref } from "react";
import s from "./strip.module.css";

export type StripKind = "pr" | "issue" | "review" | "talk" | "plain";
export type StripState = "you" | "them" | "stalled" | "done" | "idle";

const KIND_LABEL: Record<StripKind, string> = {
  pr: "PR",
  issue: "Issue",
  review: "Review",
  talk: "Talk",
  plain: "",
};

/*
 * A status circle, read the way Linear's are: yellow half-filled for your move, an open circle for
 * theirs, a red square for stalled, a filled check for done, a dashed circle for anything idle.
 */
export function StatusIcon({ state, className }: { state: StripState; className?: string }) {
  return (
    <svg className={`${s.status}${className ? ` ${className}` : ""}`} data-state={state} viewBox="0 0 16 16" aria-hidden="true">
      {state === "you" && (
        <>
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 3.9a4.1 4.1 0 0 1 0 8.2z" fill="currentColor" />
        </>
      )}
      {state === "them" && <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {state === "idle" && <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.2 2.2" />}
      {state === "stalled" && (
        <>
          <rect x="1.5" y="1.5" width="13" height="13" rx="3.2" fill="currentColor" />
          <path d="M8 4.6v4.1" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="8" cy="11.2" r="1" fill="#fff" />
        </>
      )}
      {state === "done" && (
        <>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="M5 8.3 7.1 10.3 11 6.2" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

export type StripProps = {
  kind: StripKind;
  /** the repo's callsign, printed in the first box */
  callsign: ReactNode;
  num?: ReactNode;
  title: ReactNode;
  /** the line under the title: why it sits in this bay */
  note?: ReactNode;
  /** last person to move, and when */
  who?: ReactNode;
  age?: ReactNode;
  /** whole days since the last human move; drawn round in pencil once stalled */
  quiet?: number | null;
  /** the printed silence figure, when it should print in rather than just appear */
  quietText?: ReactNode;
  state?: StripState;
  /** a pencil tick in the corner: you have answered */
  ticked?: boolean;
  /** a pencil line through the title: closed */
  struck?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  /** synthetic demonstration data; the section around it says so */
  sample?: boolean;
  /** extra printed box before the silence box */
  extra?: ReactNode;
  /** controls that sit on the holder beside the paper */
  aside?: ReactNode;
  /** the controls float over the paper's right end on hover or focus instead of taking a column */
  asideOverlay?: boolean;
  /** content that opens under the strip, inside its holder */
  below?: ReactNode;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  /** the strip opens something below it (its history) */
  expanded?: boolean;
  label?: string;
  as?: "div" | "li";
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
  data?: Record<string, string | undefined>;
};

/*
 * A thread as one row: status circle, ID, title and note, a label for its kind, the last move, and the
 * days since anyone spoke, tinted red once it stalls. Inside a group it lies flat; on its own it is a card.
 */
export function Strip({
  kind,
  callsign,
  num,
  title,
  note,
  who,
  age,
  quiet,
  quietText,
  state = "idle",
  ticked,
  struck,
  size = "md",
  sample,
  extra,
  aside,
  asideOverlay,
  below,
  href,
  external,
  onClick,
  expanded,
  label,
  as = "div",
  className,
  style,
  ref,
  data,
}: StripProps) {
  const Holder = as;
  const stalled = state === "stalled";
  const paper = (
    <>
      <StatusIcon state={state} />
      <span className={s.cs}>
        <span className={s.code}>{callsign}</span>
        {num != null && <span className={s.num}>{num}</span>}
      </span>
      <span className={s.body}>
        <span className={s.title} data-struck={struck || undefined}>
          {title}
        </span>
        {note && <span className={s.note}>{note}</span>}
      </span>
      {KIND_LABEL[kind] && (
        <span className={s.kind} data-kind={kind}>
          <span className={s.kindDot} aria-hidden="true" />
          {KIND_LABEL[kind]}
        </span>
      )}
      {(who || age) && (
        <span className={s.last}>
          {who && <span className={s.who}>{who}</span>}
          {age && <span className={s.age}>{age}</span>}
        </span>
      )}
      {extra}
      {ticked && (
        <svg className={s.tick} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 8.4 6.6 11.4 12.6 4.8" pathLength={1} />
        </svg>
      )}
      {quiet != null && (
        <span className={s.quiet} data-stalled={stalled || undefined} title={`${quiet} ${quiet === 1 ? "day" : "days"} since the last move`}>
          <span className={s.quietNum}>{quietText ?? quiet}</span>
          <span className={s.quietUnit}>d</span>
        </span>
      )}
    </>
  );

  return (
    <Holder
      ref={ref as Ref<never>}
      className={`${s.holder}${className ? ` ${className}` : ""}`}
      data-state={state}
      data-size={size}
      data-aside={aside ? (asideOverlay ? "overlay" : "beside") : undefined}
      data-sample={sample || undefined}
      style={style}
      {...data}
    >
      {href ? (
        <a
          className={s.paper}
          data-kind={kind}
          href={href}
          aria-label={label}
          {...(external ? { target: "_blank", rel: "noreferrer" } : null)}
        >
          {paper}
        </a>
      ) : onClick ? (
        <button type="button" className={s.paper} data-kind={kind} onClick={onClick} aria-label={label} aria-expanded={expanded}>
          {paper}
        </button>
      ) : (
        <div className={s.paper} data-kind={kind} aria-label={label}>
          {paper}
        </div>
      )}
      {aside && <span className={s.aside}>{aside}</span>}
      {below}
    </Holder>
  );
}

type BayProps = {
  /** the designator printed on the bay's header */
  name: string;
  which?: "you" | "them" | "stalled" | "plain";
  count?: ReactNode;
  hint?: ReactNode;
  tools?: ReactNode;
  children: ReactNode;
  empty?: ReactNode;
  className?: string;
  id?: string;
  as?: "section" | "div";
};

/* A group of threads under one status, the way a list view groups issues. */
export function Bay({ name, which = "plain", count, hint, tools, children, empty, className, id, as = "section" }: BayProps) {
  const Tag = as;
  const headId = id ? `${id}-name` : undefined;
  return (
    <Tag className={`${s.bay}${className ? ` ${className}` : ""}`} data-which={which} id={id} aria-labelledby={headId}>
      <header className={s.bayHead}>
        {which !== "plain" && <StatusIcon state={which} />}
        <h3 className={s.bayName} id={headId}>
          {name}
        </h3>
        {count != null && <span className={s.bayCount}>{count}</span>}
        {hint && <span className={s.bayHint}>{hint}</span>}
        {tools && <span className={s.bayTools}>{tools}</span>}
      </header>
      <div className={s.rack}>{children}</div>
      {empty}
    </Tag>
  );
}
