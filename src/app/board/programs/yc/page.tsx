import type { Metadata } from "next";
import { YcView } from "@/components/app/YcView";
import { getYcOpenSource } from "@/lib/programs";

export const metadata: Metadata = {
  title: "YC open source companies · Spool",
};

export default async function YcPage() {
  const data = await getYcOpenSource();
  return <YcView data={data} />;
}
