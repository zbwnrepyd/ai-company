import { afterEach, describe, expect, it } from "vitest";

import { listRecentLeaderboardRuns } from "../../lib/db/leaderboard-runs-repo";
import { listSnapshotsForDate } from "../../lib/db/snapshots-repo";
import { runDailySnapshot } from "../../scripts/fetch-daily-snapshot";
import { cleanupTestDatabase, initTestDatabase } from "../helpers/test-database";

describe("runDailySnapshot", () => {
  afterEach(() => {
    cleanupTestDatabase();
  });

  it("stores daily snapshots and a leaderboard run without fetching details", async () => {
    initTestDatabase("fetch-daily-snapshot");

    const client = {
      async listAllStartups() {
        return [
          {
            slug: "alpha",
            name: "Alpha",
            icon: "https://cdn.example.com/alpha.png",
            rank: 1,
            growth30d: 30,
            revenue: { total: 12000, last30Days: 4000 },
          },
        ];
      },
      async getStartup() {
        throw new Error("detail fetch should not be used by the daily snapshot job");
      },
    };

    const result = await runDailySnapshot({
      snapshotDate: "2026-03-26",
      client,
    });

    expect(result).toEqual({
      snapshotCount: 1,
      detailCount: 0,
      leaderboardCount: 1,
    });
    expect(listSnapshotsForDate("2026-03-26")).toHaveLength(1);
    expect(listRecentLeaderboardRuns(7)).toHaveLength(1);
  });
});
