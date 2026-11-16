import { CalendarDays, Compass, FolderGit2, Inbox, Settings, SquareKanban, type LucideIcon } from "lucide-react";

/* The app's places, in sidebar order. The landing page's sample window draws the same list.
   Find and Repos each hold two pages, switched at the top of the page. */
export type NavItem = { href: string; label: string; icon: LucideIcon; also?: string[] };

export const NAV: NavItem[] = [
  { href: "/board", label: "Bay", icon: Inbox },
  { href: "/board/plan", label: "Plan", icon: SquareKanban },
  { href: "/board/discover", label: "Find", icon: Compass, also: ["/board/following"] },
  { href: "/board/repos", label: "Repos", icon: FolderGit2, also: ["/board/orgs"] },
  { href: "/board/programs", label: "Programs", icon: CalendarDays },
  { href: "/board/settings", label: "Settings", icon: Settings },
];

export function isActive(href: string, pathname: string | null, also: string[] = []) {
  if (!pathname) return false;
  if (href === "/board") return pathname === "/board";
  return [href, ...also].some((h) => pathname.startsWith(h));
}
