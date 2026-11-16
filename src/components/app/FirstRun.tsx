"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { useBoard } from "./BoardProvider";
import s from "./firstrun.module.css";

const STEPS: { title: string; body: string }[] = [
  {
    title: "Your bay sorts everything by whose move it is",
    body: "Your move is what waits on you: a reply, a review, a failing check. Their move is where you wait, and it turns stalled after two weeks of quiet. The row says why.",
  },
  {
    title: "Today and Claims keep the rest in view",
    body: "Today lists what changed since your last visit and dates coming up. Claims holds issues you asked to take, and says when someone else got there first.",
  },
  {
    title: "Find more, and jump anywhere",
    body: "Find has Discover and Following, for repos and maintainers you keep an eye on. Repos has your logbook and Orgs. Press Cmd K (Ctrl K) to jump to any thread, repo or page.",
  },
];

/* Three short steps the first time the board opens with something on it; never again once closed. */
export function FirstRun() {
  const { mode } = useBoard();
  const { tourDone } = usePrefs();
  const [step, setStep] = useState(0);
  if (tourDone || (mode !== "live" && mode !== "sample")) return null;
  const done = () => setPrefs({ tourDone: true });
  const last = step === STEPS.length - 1;
  return (
    <section className={s.card} aria-label="Getting started">
      <div className={s.top}>
        <span className={s.count}>
          {step + 1} of {STEPS.length}
        </span>
        <button type="button" className={s.close} onClick={done} title="Close the tour">
          <X size={16} aria-hidden="true" />
          <span className="sr-only">Close the tour</span>
        </button>
      </div>
      <h2 className={s.title}>{STEPS[step].title}</h2>
      <p className={s.body}>{STEPS[step].body}</p>
      <div className={s.actions}>
        {step > 0 && (
          <button type="button" className={s.back} onClick={() => setStep((n) => n - 1)}>
            Back
          </button>
        )}
        <button type="button" className={s.next} onClick={() => (last ? done() : setStep((n) => n + 1))}>
          {last ? "Got it" : "Next"}
        </button>
        <span className={s.dots} aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} data-on={i === step || undefined} />
          ))}
        </span>
      </div>
    </section>
  );
}
