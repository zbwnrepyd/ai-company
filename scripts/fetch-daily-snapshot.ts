import { pathToFileURL } from "node:url";

import { getDatabase } from "../lib/db/connection";
import { saveLeaderboardRun, listRecentLeaderboardRuns } from "../lib/db/leaderboard-runs-repo";
import { migrate } from "../lib/db/migrate";
import { listSnapshotsForSlug, saveDailySnapshots } from "../lib/db/snapshots-repo";
import { buildLeaderboard } from "../lib/leaderboard/build-leaderboard";
import { buildPlayback } from "../lib/leaderboard/build-playback";
import { createTrustMrrClient, type TrustMrrClient } from "../lib/trustmrr/client";

export async function runDailySnapshot(input?: {
  snapshotDate?: string;
  client?: TrustMrrClient;
}) {
  const database = getDatabase();
  migrate(database);

  const snapshotDate = input?.snapshotDate ?? new Date().toISOString().slice(0, 10);
  const client = input?.client ?? createTrustMrrClient();
  const startups = await client.listAllStartups({
    pageDelayMs: 3_500,
    onPage: ({ page, pageSize, totalSoFar }) => {
      console.log(
        `[snapshot] fetched page ${page} (${pageSize}/page), accumulated ${totalSoFar} startups`,
      );
    },
  });

  saveDailySnapshots(snapshotDate, startups, database);

  const snapshotsBySlug = Object.fromEntries(
    startups.map((startup) => [startup.slug, listSnapshotsForSlug(startup.slug, database)]),
  );

  const leaderboard = buildLeaderboard({
    asOfDate: snapshotDate,
    snapshotsBySlug,
  });

  const recentRuns = listRecentLeaderboardRuns(7, database)
    .map((run) => ({
      snapshotDate: run.snapshotDate,
      leaderboard: run.leaderboard,
    }))
    .concat([{ snapshotDate, leaderboard }]);

  const playback = buildPlayback(recentRuns);

  saveLeaderboardRun(
    {
      snapshotDate,
      leaderboard,
      playback,
    },
    database,
  );

  return {
    snapshotCount: startups.length,
    detailCount: 0,
    leaderboardCount: leaderboard.length,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDailySnapshot()
    .then((result) => {
      console.log(JSON.stringify(result));
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
