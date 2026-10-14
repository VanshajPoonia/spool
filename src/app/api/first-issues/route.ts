import type { NextRequest } from "next/server";
import { firstIssues } from "@/lib/programs";

const ALLOWED = /^[a-z0-9+#.-]{1,24}$/;

export async function GET(request: NextRequest) {
  const langs = (request.nextUrl.searchParams.get("langs") ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => ALLOWED.test(t))
    .slice(0, 3)
    .sort();
  if (!langs.length) return Response.json({ error: "Pass ?langs=rust,go" }, { status: 400 });
  return Response.json(await firstIssues(langs));
}
