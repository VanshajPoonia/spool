"use client";

import { createContext, ReactNode, RefObject, useContext, useEffect, useMemo, useState } from "react";

type MoodCtx = { face: string | null; setFace: (f: string | null) => void };

const Ctx = createContext<MoodCtx>({ face: null, setFace: () => {} });
// The setter on its own: it never changes, so sections that only report a face never re-render when it does.
const SetCtx = createContext<(f: string | null) => void>(() => {});

export function MoodProvider({ children }: { children: ReactNode }) {
  const [face, setFace] = useState<string | null>(null);
  const value = useMemo(() => ({ face, setFace }), [face]);
  return (
    <SetCtx.Provider value={setFace}>
      <Ctx.Provider value={value}>{children}</Ctx.Provider>
    </SetCtx.Provider>
  );
}

/* For the nav, the one place that shows the face. */
export function usePageFace() {
  return useContext(Ctx);
}

/* Report this section's face to the nav while the section holds the middle of the viewport. */
export function useSectionFace(ref: RefObject<HTMLElement | null>, face: string | null) {
  const setFace = useContext(SetCtx);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setFace(face);
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, face, setFace]);
}

/* True once the element has been on screen; used to start section boards. */
export function useInView(ref: RefObject<HTMLElement | null>, margin = "0px 0px -20% 0px") {
  const [seen, setSeen] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (e.isIntersecting) setSeen(true);
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return { seen, visible };
}
