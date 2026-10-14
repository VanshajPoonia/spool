import type { NextRequest } from "next/server";
import { discover } from "@/lib/programs";

const ALLOWED = /^[a-z0-9+#.-]{1,32}$/;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("topics") ?? "";
  const topics = raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => ALLOWED.test(t))
    .slice(0, 4)
    .sort();
  if (!topics.length) return Response.json({ error: "Pass ?topics=rust,cli" }, { status: 400 });
  return Response.json(await discover(topics));
}
