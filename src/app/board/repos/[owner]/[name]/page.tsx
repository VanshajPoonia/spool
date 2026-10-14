import { Suspense } from "react";
import { GitHubOnly } from "@/components/app/ConnectPanel";
import { RepoTimetable } from "@/components/app/RepoTimetable";

export default function RepoPage() {
  return (
    <Suspense>
      <GitHubOnly what="repos">
        <RepoTimetable />
      </GitHubOnly>
    </Suspense>
  );
}
