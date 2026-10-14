import type { CSSProperties, ReactNode, Ref } from "react";
import { PencilRing } from "./Kit";
import s from "./strip.module.css";

export type StripKind = "pr" | "issue" | "review" | "talk" | "plain";
export type StripState = "you" | "them" | "stalled" | "done" | "idle";

const KIND_LABEL: Record<StripKind, string> = {
  pr: "PR",
  issue: "ISSUE",
  review: "REVIEW",
  talk: "TALK",
  plain: "",
};

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
  /** the strip is synthetic demonstration data */
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
 * A flight strip: printed paper in a black holder. The holder's tab says the state; the paper's
 * colour says what kind of thread it carries; the boxes read left to right, callsign to silence.
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
      <span className={s.cs}>
        <span className={s.code}>{callsign}</span>
        {num != null && <span className={s.num}>{num}</span>}
        {KIND_LABEL[kind] && <span className={s.kind}>{sample ? `${KIND_LABEL[kind]} · SAMPLE` : KIND_LABEL[kind]}</span>}
      </span>
      <span className={s.body}>
        <span className={s.title} data-struck={struck || undefined}>
          {title}
        </span>
        {note && <span className={s.note}>{note}</span>}
      </span>
      {(who || age) && (
        <span className={s.last}>
          {who && <span className={s.who}>{who}</span>}
          {age && <span className={s.age}>{age}</span>}
        </span>
      )}
      {extra}
      {quiet != null && (
        <span className={s.quiet} title={`${quiet} ${quiet === 1 ? "day" : "days"} since the last move`}>
          <PencilRing on={stalled}>
            <span className={s.quietNum}>{quietText ?? quiet}</span>
          </PencilRing>
          <span className={s.quietUnit}>{quiet === 1 ? "day" : "days"}</span>
        </span>
      )}
      {ticked && (
        <svg className={s.tick} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 13.5 9.2 18.4 20 5.6" pathLength={1} />
        </svg>
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

/* A bay: a designated rack of strips. Your move is the one bay the console lights. */
export function Bay({ name, which = "plain", count, hint, tools, children, empty, className, id, as = "section" }: BayProps) {
  const Tag = as;
  const headId = id ? `${id}-name` : undefined;
  return (
    <Tag className={`${s.bay}${className ? ` ${className}` : ""}`} data-which={which} id={id} aria-labelledby={headId}>
      <header className={s.bayHead}>
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
