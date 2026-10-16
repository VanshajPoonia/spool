import { CalendarDays, Compass, FolderGit2, Inbox, Settings, SquareKanban, type LucideIcon } from "lucide-react";

/* The app's places, in sidebar order. The landing page's sample window draws the same list. */
export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV: NavItem[] = [
  { href: "/board", label: "Bay", icon: Inbox },
  { href: "/board/plan", label: "Plan", icon: SquareKanban },
  { href: "/board/repos", label: "Repos", icon: FolderGit2 },
  { href: "/board/discover", label: "Discover", icon: Compass },
  { href: "/board/programs", label: "Programs", icon: CalendarDays },
  { href: "/board/settings", label: "Settings", icon: Settings },
];

export function isActive(href: string, pathname: string | null) {
  if (!pathname) return false;
  return href === "/board" ? pathname === "/board" : pathname.startsWith(href);
}
