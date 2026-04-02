import { listRecentLeaderboardRuns } from "../../../lib/db/leaderboard-runs-repo";
import { migrate } from "../../../lib/db/migrate";
import { buildPlayback } from "../../../lib/leaderboard/build-playback";

export async function GET() {
  migrate();

  const runs = listRecentLeaderboardRuns(7).reverse();
  const latestRun = runs.at(-1);
  const playback = buildPlayback(
    runs.map((run) => ({
      snapshotDate: run.snapshotDate,
      leaderboard: run.leaderboard,
    })),
  );

  return Response.json({
    leaderboard: latestRun?.leaderboard ?? [],
    playback,
  });
}
