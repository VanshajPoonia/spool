"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { padText, print, type PrintOpts } from "./engine";

export type Tone = "go" | "wait" | "stop" | "dim" | undefined;

type Props = {
  value: string;
  /** fixed character count, so the field never changes width; defaults to the first value's length */
  length?: number;
  align?: "left" | "right" | "center";
  tone?: Tone;
  /** print in from blank on mount */
  intro?: boolean;
  /** print in from blank the first time the field scrolls into view */
  introOnView?: boolean;
  introDelay?: number;
  className?: string;
  style?: CSSProperties;
  /** spoken text; defaults to the value */
  label?: string;
  /** hide from assistive tech entirely */
  decorative?: boolean;
  opts?: PrintOpts;
};

/* A field set by the strip printer: monospaced, fixed width, retyped left to right when it changes. */
export function PrintText({
  value,
  length,
  align = "left",
  tone,
  intro = false,
  introOnView = false,
  introDelay = 0,
  className,
  style,
  label,
  decorative = false,
  opts,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [len] = useState(() => length ?? value.length);
  const [initial] = useState(() => padText(value, length ?? value.length, align));
  const mounted = useRef(false);
  const optsRef = useRef(opts);
  const valueRef = useRef(value);
  useEffect(() => {
    optsRef.current = opts;
    valueRef.current = value;
  });

  useEffect(() => {
    const el = ref.current;
    if (!introOnView || !el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        print(el, padText(valueRef.current, len, align), { delay: introDelay, ...optsRef.current, fromBlank: true });
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [introOnView, introDelay, len, align]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const text = padText(value, len, align);
    if (!mounted.current) {
      mounted.current = true;
      if (intro) print(el, text, { delay: introDelay, ...optsRef.current, fromBlank: true });
      return;
    }
    print(el, text, optsRef.current);
  }, [value, len, align, intro, introDelay]);

  const field = (
    <span ref={ref} className={`print${className ? ` ${className}` : ""}`} style={style} data-tone={tone} aria-hidden="true">
      {initial}
    </span>
  );

  if (decorative) return field;
  return (
    <>
      <span className="sr-only">{label ?? value.trim()}</span>
      {field}
    </>
  );
}
