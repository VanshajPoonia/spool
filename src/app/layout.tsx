import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { PrefsBoot } from "@/components/PrefsBoot";
import "./globals.css";

// Inter carries every word; its optical-size axis gives headlines the tighter display cut.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

// Small captions, IDs, counts and times.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spool: the open source manager that knows whose move it is",
  description:
    "Spool puts every PR, issue, review request and mention you have open on GitHub in one bay, sorted by who owes the next reply. Plus GSoC, YC and Product Hunt dates.",
};

export const viewport: Viewport = {
  themeColor: "#08090a",
};

// Sets the shift before first paint so a light-shift reader never sees the console flash dark.
const THEME_BOOT = `try{var p=JSON.parse(localStorage.getItem("spool:prefs")||"{}");if(p.theme==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: Spool is where a contributor's open threads wind up, sorted by whose move it is, built at Linear's craft and paced like Stripe. It refuses the dashboard-screenshot hero, feature-card bentos, stat-card rows and monospace costume.
OWN-WORLD: Near-black console, grey steps, white-alpha hairlines; Inter 510 set tight with an Ink Soft second voice; colour only in marks (yellow half circle, red stalled square, kind dots); light pills with a hover arrow; isometric hairline plates; letter faces; retyping numerals.
STORY: The visitor watches a real-scale Spool window play a contributor's day, reads the three ideas, learns to read one row, sees PRs land and silence turn red, finds what lies beyond their threads, then connects a token or opens the sample board.
FIRST VIEWPORT: A two-line H1 across the column, lede and two pills under it, a live next-deadline link at right; below, a full-width three-pane Spool window (sidebar, bay, thread activity) with a day scrubber, its top half above the fold.
FORM: The canon, pinned by the user: Linear-led, Stripe-paced, Cursor-framed. No seed; the pin beats the roll.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`,
          }}
        />
        <PrefsBoot />
        {children}
      </body>
    </html>
  );
}
