import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";

export const metadata: Metadata = {
  title: "Board · Spool",
};

export default function BoardLayout({ children }: LayoutProps<"/board">) {
  return <AppShell>{children}</AppShell>;
}
