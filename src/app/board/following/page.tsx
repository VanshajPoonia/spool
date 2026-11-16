import { GitHubOnly } from "@/components/app/ConnectPanel";
import { FollowingView } from "@/components/app/FollowingView";
import { SubNav } from "@/components/app/SubNav";

export default function FollowingPage() {
  return (
    <>
      <SubNav group="find" />
      <GitHubOnly what="following">
        <FollowingView />
      </GitHubOnly>
    </>
  );
}
