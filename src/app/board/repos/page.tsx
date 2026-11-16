import { GitHubOnly } from "@/components/app/ConnectPanel";
import { ReposView } from "@/components/app/ReposView";
import { SubNav } from "@/components/app/SubNav";

export default function ReposPage() {
  return (
    <>
      <SubNav group="repos" />
      <GitHubOnly what="repos">
        <ReposView />
      </GitHubOnly>
    </>
  );
}
