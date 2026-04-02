import { describe, expect, it } from "vitest";

import {
  buildDailyRevenueSeries,
  buildLeaderboard,
  type DailySnapshotRow,
} from "../../lib/leaderboard/build-leaderboard";

function totalsFromDailyRevenue(dailyRevenue: number[]) {
  const totals = [0];

  for (const amount of dailyRevenue) {
    totals.push((totals.at(-1) ?? 0) + amount);
  }

  return totals;
}

function buildSnapshots(
  slug: string,
  name: string,
  dailyRevenue: number[],
  startingDate: string,
  latestRank = 1,
): DailySnapshotRow[] {
  const start = new Date(`${startingDate}T00:00:00.000Z`);

  return totalsFromDailyRevenue(dailyRevenue).map((revenueTotal, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);

    return {
      snapshotDate: date.toISOString().slice(0, 10),
      slug,
      name,
      icon: null,
      sourceRank: latestRank,
      revenueTotal,
    };
  });
}

function omitSnapshotDate(snapshots: DailySnapshotRow[], snapshotDate: string) {
  return snapshots.filter((snapshot) => snapshot.snapshotDate !== snapshotDate);
}

describe("buildDailyRevenueSeries", () => {
  it("converts cumulative totals into daily revenue deltas", () => {
    expect(buildDailyRevenueSeries([100, 140, 200, 260])).toEqual([40, 60, 60]);
  });
});

describe("buildLeaderboard", () => {
  it("sorts ready startups by growth and keeps insufficient-history startups as calculating", () => {
    const leaderboard = buildLeaderboard({
      asOfDate: "2026-01-15",
      snapshotsBySlug: {
        alpha: buildSnapshots(
          "alpha",
          "Alpha",
          [100, 100, 100, 100, 100, 200, 300, 200, 200, 200, 200, 300, 400, 500],
          "2026-01-01",
          3,
        ),
        beta: buildSnapshots(
          "beta",
          "Beta",
          [50, 50, 50, 50, 50, 100, 100, 100, 100, 100, 100, 100, 100, 100],
          "2026-01-01",
          2,
        ),
        gamma: buildSnapshots("gamma", "Gamma", [100, 100, 100, 100, 100, 100], "2026-01-01", 1),
      },
    });

    expect(leaderboard.map((entry) => entry.slug)).toEqual(["alpha", "gamma"]);
    expect(leaderboard[0]).toMatchObject({
      slug: "alpha",
      status: "ready",
      rank: 1,
      growth7dLabel: "100.00%",
    });
    expect(leaderboard[1]).toMatchObject({
      slug: "gamma",
      status: "calculating",
      rank: 2,
      growth7d: null,
      growth7dLabel: "计算中",
    });
  });

  it("breaks ties with 28-day growth and then recent 7-day revenue", () => {
    const weeksToDaily = (weeks: number[]) => weeks.flatMap((weeklyAmount) => Array.from({ length: 7 }, () => weeklyAmount / 7));

    const leaderboard = buildLeaderboard({
      asOfDate: "2026-03-02",
      snapshotsBySlug: {
        alpha: buildSnapshots(
          "alpha",
          "Alpha",
          weeksToDaily([700, 700, 700, 700, 1050, 1050, 1400, 2100]),
          "2026-01-05",
          2,
        ),
        beta: buildSnapshots(
          "beta",
          "Beta",
          weeksToDaily([700, 700, 700, 700, 700, 700, 1400, 2100]),
          "2026-01-05",
          1,
        ),
      },
    });

    expect(leaderboard[0]).toMatchObject({
      slug: "alpha",
      growth7dLabel: "50.00%",
      growth28d: 100,
    });
    expect(leaderboard[1]).toMatchObject({
      slug: "beta",
      growth7dLabel: "50.00%",
      growth28d: 75,
    });
  });

  it("keeps a startup in calculating state when a required natural day snapshot is missing", () => {
    const leaderboard = buildLeaderboard({
      asOfDate: "2026-01-16",
      snapshotsBySlug: {
        alpha: omitSnapshotDate(
          buildSnapshots(
            "alpha",
            "Alpha",
            Array.from({ length: 15 }, () => 200),
            "2026-01-01",
            1,
          ),
          "2026-01-08",
        ),
      },
    });

    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0]).toMatchObject({
      slug: "alpha",
      status: "calculating",
      growth7d: null,
      growth7dLabel: "计算中",
      previous7: null,
      recent7: null,
    });
  });

  it("still marks a startup ready when older history has gaps outside the required trailing window", () => {
    const leaderboard = buildLeaderboard({
      asOfDate: "2026-01-20",
      snapshotsBySlug: {
        alpha: omitSnapshotDate(
          buildSnapshots(
            "alpha",
            "Alpha",
            Array.from({ length: 19 }, () => 200),
            "2026-01-01",
            1,
          ),
          "2026-01-02",
        ),
      },
    });

    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0]).toMatchObject({
      slug: "alpha",
      status: "ready",
      growth7dLabel: "0.00%",
      previous7: 1400,
      recent7: 1400,
    });
  });
});
