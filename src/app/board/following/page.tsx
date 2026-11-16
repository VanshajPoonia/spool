import { GitHubOnly } from "@/components/app/ConnectPanel";
import { FollowingView } from "@/components/app/FollowingView";

export default function FollowingPage() {
  return (
    <GitHubOnly what="following">
      <FollowingView />
    </GitHubOnly>
  );
}
