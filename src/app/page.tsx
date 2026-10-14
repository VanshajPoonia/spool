import { BoardingPass } from "@/components/landing/BoardingPass";
import { BuildRow } from "@/components/landing/BuildRow";
import { Carriers } from "@/components/landing/Carriers";
import { DaySection } from "@/components/landing/DaySection";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { MoodProvider } from "@/components/landing/mood";
import { ProgramsWall } from "@/components/landing/ProgramsWall";
import { Routes } from "@/components/landing/Routes";
import { SignSway } from "@/components/landing/SignSway";
import { SiteNav } from "@/components/landing/SiteNav";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { Stalled } from "@/components/landing/Stalled";
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
  if (!yc) return ["SPOOL", "WHO MOVES NEXT?", ""];
  const [month, day] = yc.deadline.split(/\s+/);
  const short = `${SHORT_MONTH[month?.toLowerCase()] ?? month} ${day ?? ""}`.trim();
  return ["NEXT DEADLINE", `YC ${yc.batch}`, `${yc.afterDeadline ? "LATE APPS" : "APPLY BY"} ${short}`];
}

export default async function Home() {
  const [programs, routes] = await Promise.all([getPrograms(), discover(["cli", "typescript"])]);

  return (
    <MoodProvider>
      <SmoothScroll />
      <SignSway />
      <SiteNav />
      <main>
        <Hero />
        <BuildRow />
        <DaySection />
        <Stalled />
        <Carriers />
        <Routes initial={routes} />
        <ProgramsWall data={programs} />
        <BoardingPass />
      </main>
      <Footer lines={footerLines(programs.yc)} />
    </MoodProvider>
  );
}
