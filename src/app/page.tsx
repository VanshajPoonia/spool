import { Callsigns } from "@/components/landing/Callsigns";
import { DaySection } from "@/components/landing/DaySection";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { Inbound } from "@/components/landing/Inbound";
import { MoodProvider } from "@/components/landing/mood";
import { Programs } from "@/components/landing/Programs";
import { SignOn } from "@/components/landing/SignOn";
import { SiteNav } from "@/components/landing/SiteNav";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { Stalled } from "@/components/landing/Stalled";
import { StripPrint } from "@/components/landing/StripPrint";
import { discover, getPrograms } from "@/lib/programs";

const SHORT_MONTH: Record<string, string> = {
  january: "JAN",
  february: "FEB",
  march: "MAR",
  april: "APR",
  may: "MAY",
  june: "JUN",
  july: "JUL",
  august: "AUG",
  september: "SEP",
  october: "OCT",
  november: "NOV",
  december: "DEC",
};

function footerLines(yc: Awaited<ReturnType<typeof getPrograms>>["yc"]) {
  if (!yc) return ["SPOOL", "WHOSE MOVE IS IT?", ""];
  const [month, day] = yc.deadline.split(/\s+/);
  const short = `${SHORT_MONTH[month?.toLowerCase()] ?? month} ${day ?? ""}`.trim();
  return ["NEXT DEADLINE", `YC ${yc.batch}`, `${yc.afterDeadline ? "LATE APPS" : "APPLY BY"} ${short}`];
}

export default async function Home() {
  const [programs, repos] = await Promise.all([getPrograms(), discover(["cli", "typescript"])]);

  return (
    <MoodProvider>
      <SmoothScroll />
      <SiteNav />
      <main>
        <Hero />
        <StripPrint />
        <DaySection />
        <Stalled />
        <Callsigns />
        <Inbound initial={repos} />
        <Programs data={programs} />
        <SignOn />
      </main>
      <Footer lines={footerLines(programs.yc)} />
    </MoodProvider>
  );
}
