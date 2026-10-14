import { getPrograms } from "@/lib/programs";

export async function GET() {
  return Response.json(await getPrograms());
}
