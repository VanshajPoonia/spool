import type { Metadata, Viewport } from "next";
import { Archivo, Martian_Mono } from "next/font/google";
import { PrefsBoot } from "@/components/PrefsBoot";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

// What the strip printer sets: a monospace with a width axis, run condensed like a thermal printer.
const martian = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spool: the open source manager that knows whose move it is",
  description:
    "Spool puts every PR, issue, review request and mention you have open on GitHub in one bay, sorted by who owes the next reply. Plus GSoC, YC and Product Hunt dates.",
};

export const viewport: Viewport = {
  themeColor: "#14181d",
};

// Sets the shift before first paint so a light-shift reader never sees the console flash dark.
const THEME_BOOT = `try{var p=JSON.parse(localStorage.getItem("spool:prefs")||"{}");if(p.theme==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${martian.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: Spool is a flight strip bay: every thread is a printed strip that slides between Your move and Their move. It refuses the dev-tool hero with a dashboard screenshot, the bento grid, and the airport costume it replaces.
OWN-WORLD: A flat blue-grey night console; paper strips in black holders, coloured by kind (buff PR, blue issue, pink review, green talk), printed in condensed Martian Mono boxes split by hairlines; red grease-pencil ticks, circles and silence tabs; amber only for what is your move.
STORY: The visitor watches a strip hand off between bays, learns Spool sorts their GitHub threads by whose move it is, sees silence counted in days, then signs on with a token or opens the sample bay.
FIRST VIEWPORT: Headline, lede and two strip buttons on the left; a live two-bay rack on the right, one strip sliding across every few seconds; the count waiting on you printed above the rack.
FORM: Flight Strip Bay, candidate 1 of 7 (impeccable's pick), seed key 04a12bd9.
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
