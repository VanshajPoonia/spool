import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next, Barlow_Condensed } from "next/font/google";
import { PrefsBoot } from "@/components/PrefsBoot";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  display: "swap",
});

const atkinsonMono = Atkinson_Hyperlegible_Mono({
  variable: "--font-atkinson-mono",
  subsets: ["latin"],
  display: "swap",
});

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spool: who moves next on your open source",
  description:
    "Spool keeps every PR, issue and comment thread you have open on GitHub on one board, sorted by who owes the next reply. Plus GSoC, YC and Product Hunt dates.",
};

export const viewport: Viewport = {
  themeColor: "#101113",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${atkinson.variable} ${atkinsonMono.variable} ${barlow.variable}`}>
      <body>
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: Spool's landing is a split-flap departures board answering one question, who moves next. It refuses the dark dev-tool hero with a lit dashboard screenshot and a bento grid of features.
OWN-WORLD: Graphite board housing with corner screws; two-leaf flap tiles with hinge gap and warm-white condensed characters; sign-yellow wayfinding bands with black humanist sans and filled pictograms; status lamps whose shape carries state. Yellow only for the primary action and what changed.
STORY: The visitor watches a contributor's day play out on a board, sees threads split into waiting on you and waiting on them, sees live GSoC, YC and Product Hunt dates, then pastes a token on a boarding pass or opens the sample board.
FIRST VIEWPORT: Full-bleed housing. Giant flaps spell WHO MOVES / NEXT? with a five-tile flap face closing row two. A yellow band carries the one-line offer, Connect GitHub and Sample board. A sample board with a scrub clock starts above the fold.
FORM: Departures Board, candidate 4 of 7, seed key 9f103c2f. Signature: flap faces that react to the cursor and to each section; a scrubbable sample day.
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
