import { ProgramsView } from "@/components/app/ProgramsView";
import { getPrograms } from "@/lib/programs";

export default async function ProgramsPage() {
  const data = await getPrograms();
  return <ProgramsView data={data} />;
}
