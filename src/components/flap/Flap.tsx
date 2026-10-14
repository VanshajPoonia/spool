"use client";

import { CSSProperties, memo, useEffect, useRef, useState } from "react";
import { adopt, padText, setTiles, type SetOpts, type Tile } from "./engine";

export type Tone = "sign" | "dim" | "go" | "wait" | "stop" | undefined;

const TileMarkup = memo(function TileMarkup({ ch }: { ch: string }) {
  return (
    <span className="flap">
      <span className="fh fh-t">
        <span className="fc">{ch}</span>
      </span>
      <span className="fh fh-b">
        <span className="fc">{ch}</span>
      </span>
      <span className="fh fh-t lf-t">
        <span className="fc">{ch}</span>
      </span>
      <span className="fh fh-b lf-b">
        <span className="fc">{ch}</span>
      </span>
    </span>
  );
});

type FlapTextProps = {
  value: string;
  /** fixed tile count; defaults to the first value's length */
  length?: number;
  align?: "left" | "right" | "center";
  /** tile height, any CSS length */
  size?: string;
  /** width as a ratio of height */
  ratio?: number;
  gap?: string;
  tone?: Tone;
  /** scramble in on mount */
  intro?: boolean | number;
  /** scramble in the first time the tiles scroll into view */
  introOnView?: boolean | number;
  introDelay?: number;
  className?: string;
  style?: CSSProperties;
  /** spoken text; defaults to the value */
  label?: string;
  /** hide from assistive tech entirely (decorative) */
  decorative?: boolean;
  opts?: SetOpts;
};

export function FlapText({
  value,
  length,
  align = "left",
  size,
  ratio,
  gap,
  tone,
  intro = false,
  introOnView = false,
  introDelay = 0,
  className,
  style,
  label,
  decorative = false,
  opts,
}: FlapTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const tiles = useRef<Tile[] | null>(null);
  const [len] = useState(() => length ?? value.length);
  const [initial] = useState(() => padText(value, length ?? value.length, align));
  const mounted = useRef(false);
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  useEffect(() => {
    if (!ref.current) return;
    tiles.current = Array.from(ref.current.children).map(adopt);
  }, []);

  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  });

  useEffect(() => {
    const el = ref.current;
    if (!introOnView || !el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || !tiles.current) return;
        io.disconnect();
        setTiles(tiles.current, padText(valueRef.current, len, align), {
          scramble: typeof introOnView === "number" ? introOnView : 5,
          delay: introDelay,
          ...optsRef.current,
        });
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [introOnView, introDelay, len, align]);

  useEffect(() => {
    const t = tiles.current;
    if (!t) return;
    const text = padText(value, len, align);
    if (!mounted.current) {
      mounted.current = true;
      if (intro) {
        setTiles(t, text, {
          scramble: typeof intro === "number" ? intro : 6,
          delay: introDelay,
          ...optsRef.current,
        });
      }
      return;
    }
    setTiles(t, text, optsRef.current);
  }, [value, len, align, intro, introDelay]);

  const css = {
    ...(size ? { "--fh": size } : null),
    ...(ratio ? { "--fw-ratio": ratio } : null),
    ...(gap ? { "--fgap": gap } : null),
    ...style,
  } as CSSProperties;

  const tilesEl = (
    <span ref={ref} className={`flaps${className ? ` ${className}` : ""}`} style={css} data-tone={tone} aria-hidden="true">
      {Array.from(initial).map((ch, i) => (
        <TileMarkup key={i} ch={ch} />
      ))}
    </span>
  );

  if (decorative) return tilesEl;
  return (
    <>
      <span className="sr-only">{label ?? value.trim()}</span>
      {tilesEl}
    </>
  );
}
