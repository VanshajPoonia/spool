import { OrgsView } from "@/components/app/OrgsView";
import { SubNav } from "@/components/app/SubNav";

export default function OrgsPage() {
  return (
    <>
      <SubNav group="repos" />
      <OrgsView />
    </>
  );
}
