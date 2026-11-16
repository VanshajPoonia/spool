"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./subnav.module.css";

/* Two places that share one tab: Find holds Discover and Following, Repos holds your repos and orgs. */
const GROUPS = {
  find: [
    { href: "/board/discover", label: "Discover" },
    { href: "/board/following", label: "Following" },
  ],
  repos: [
    { href: "/board/repos", label: "Repos" },
    { href: "/board/orgs", label: "Orgs" },
  ],
};

export function SubNav({ group }: { group: keyof typeof GROUPS }) {
  const pathname = usePathname();
  return (
    <nav className={s.sub} aria-label={group === "find" ? "Find" : "Repos and orgs"}>
      {GROUPS[group].map((l) => (
        <Link key={l.href} href={l.href} className={s.link} aria-current={pathname === l.href ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
