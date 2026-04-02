import { afterEach, describe, expect, it } from "vitest";

import { saveLeaderboardRun } from "../../lib/db/leaderboard-runs-repo";
import { GET } from "../../app/api/leaderboard/route";
import { cleanupTestDatabase, initTestDatabase } from "../helpers/test-database";

describe("GET /api/leaderboard", () => {
  afterEach(() => {
    cleanupTestDatabase();
  });

  it("uses the latest leaderboard and the most recent seven saved runs for playback", async () => {
    initTestDatabase("leaderboard-route");

    for (let day = 1; day <= 8; day += 1) {
      const snapshotDate = `2026-03-${String(day).padStart(2, "0")}`;
      saveLeaderboardRun({
        snapshotDate,
        leaderboard: [
          {
            rank: 1,
            slug: `startup-${day}`,
            name: `Startup ${day}`,
            icon: null,
            status: "ready",
            growth7d: day,
            growth7dLabel: `${day}.00%`,
            growth28d: null,
            recent7: 1000 + day,
            previous7: 1000,
            sourceRank: day,
          },
        ],
        playback: [{ snapshotDate: "stale", leaderboard: [] }],
      });
    }

    const response = await GET();
    const payload = (await response.json()) as {
      leaderboard: Array<{ slug: string }>;
      playback: Array<{ snapshotDate: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.leaderboard[0]?.slug).toBe("startup-8");
    expect(payload.playback).toHaveLength(7);
    expect(payload.playback[0]?.snapshotDate).toBe("2026-03-02");
    expect(payload.playback[6]?.snapshotDate).toBe("2026-03-08");
  });
});
