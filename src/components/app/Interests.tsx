"use client";

import { FormEvent, useState } from "react";
import { Plus, X } from "lucide-react";
import { updateSettings, useSettings } from "@/lib/store";
import s from "./interests.module.css";

const SUGGEST = ["typescript", "rust", "python", "go", "cli", "devtools", "ai", "database", "react", "wasm", "kubernetes", "compilers", "security", "accessibility", "observability"];

export function Interests({ compact = false }: { compact?: boolean }) {
  const { interests } = useSettings();
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t || !/^[a-z0-9+#.-]{1,32}$/.test(t) || interests.includes(t)) return;
    updateSettings({ interests: [...interests, t].slice(0, 12) });
  };
  const remove = (t: string) => updateSettings({ interests: interests.filter((x) => x !== t) });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    add(draft);
    setDraft("");
  };

  const suggestions = SUGGEST.filter((x) => !interests.includes(x)).slice(0, compact ? 6 : 10);

  return (
    <div className={s.wrap}>
      <ul className={s.list} aria-label="Your interests">
        {interests.map((t) => (
          <li key={t}>
            <span>{t}</span>
            <button type="button" onClick={() => remove(t)} aria-label={`Remove ${t}`}>
              <X size={13} aria-hidden="true" />
            </button>
          </li>
        ))}
        <li className={s.add}>
          <form onSubmit={submit}>
            <label className="sr-only" htmlFor="interest-input">
              Add a language or topic
            </label>
            <input id="interest-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a language or topic" maxLength={32} />
            <button type="submit" aria-label="Add" disabled={!draft.trim()}>
              <Plus size={15} aria-hidden="true" />
            </button>
          </form>
        </li>
      </ul>
      {suggestions.length > 0 && (
        <div className={s.suggest}>
          <span>Try</span>
          {suggestions.map((t) => (
            <button key={t} type="button" onClick={() => add(t)}>
              {t}
            </button>
          ))}
        </div>
      )}
      <p className={s.hint}>Languages search by repo language; anything else searches GitHub topics.</p>
    </div>
  );
}
