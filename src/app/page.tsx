import { Anatomy } from "@/components/landing/Anatomy";
import { Approach } from "@/components/landing/Approach";
import { Chapter } from "@/components/landing/Chapter";
import { Footer } from "@/components/landing/Footer";
import { Gsoc } from "@/components/landing/Gsoc";
import { Hero } from "@/components/landing/Hero";
import { Inbound } from "@/components/landing/Inbound";
import { MoodProvider } from "@/components/landing/mood";
import { Principles } from "@/components/landing/Principles";
import { Programs } from "@/components/landing/Programs";
import { SignOn } from "@/components/landing/SignOn";
import { Shine } from "@/components/landing/Shine";
import { SiteNav } from "@/components/landing/SiteNav";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { Stalled } from "@/components/landing/Stalled";
import { Tour } from "@/components/landing/Tour";
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
      <Shine />
      <SiteNav />
      <main>
        <Hero yc={programs.yc} />
        <Principles />
        <Tour />
        <Anatomy />
        <Approach />
        <Stalled />
        <Chapter
          id="beyond"
          title="Beyond your threads."
          rest="Fresh repos in the topics you follow, the deadlines open source plans around, and Google Summer of Code, stop by stop. All of it live."
        >
          <Inbound initial={repos} />
          <Programs data={programs} />
          <Gsoc data={programs.gsoc} fetchedAt={programs.fetchedAt} />
        </Chapter>
        <SignOn />
      </main>
      <Footer lines={footerLines(programs.yc)} />
    </MoodProvider>
  );
}
