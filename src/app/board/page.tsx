import { BoardView } from "@/components/app/BoardView";
import { GitHubOnly } from "@/components/app/ConnectPanel";

export default function BoardPage() {
  return (
    <GitHubOnly what="board">
      <BoardView />
    </GitHubOnly>
  );
}
