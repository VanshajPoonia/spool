import type { Metadata } from "next";
import { PlanView } from "@/components/app/PlanView";

export const metadata: Metadata = {
  title: "Plan · Spool",
};

export default function PlanPage() {
  return <PlanView />;
}
