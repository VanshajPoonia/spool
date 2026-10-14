import { GitHubOnly } from "@/components/app/ConnectPanel";
import { ReposView } from "@/components/app/ReposView";

export default function ReposPage() {
  return (
    <GitHubOnly what="repos">
      <ReposView />
    </GitHubOnly>
  );
}
