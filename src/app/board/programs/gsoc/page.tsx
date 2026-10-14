import type { Metadata } from "next";
import { GsocView } from "@/components/app/GsocView";
import { getGsocBrowser } from "@/lib/programs";

export const metadata: Metadata = {
  title: "GSoC organisations · Spool",
};

export default async function GsocPage() {
  const data = await getGsocBrowser();
  return <GsocView data={data} />;
}
