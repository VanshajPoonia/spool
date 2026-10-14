"use client";

import { useEffect } from "react";
import { initPrefs } from "@/lib/prefs";

export function PrefsBoot() {
  useEffect(() => {
    initPrefs();
  }, []);
  return null;
}
