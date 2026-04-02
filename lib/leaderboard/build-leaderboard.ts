export type DailySnapshotRow = {
  snapshotDate: string;
  slug: string;
  name: string;
  icon: string | null;
  sourceRank: number | null;
  revenueTotal: number;
};

export type LeaderboardEntry = {
  rank: number;
  slug: string;
  name: string;
  icon: string | null;
  sourceRank: number | null;
  status: "ready" | "calculating";
  growth7d: number | null;
  growth7dLabel: string;
  growth28d: number | null;
  recent7: number | null;
  previous7: number | null;
};

const MINIMUM_PREVIOUS_7_REVENUE = 1000;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function buildDailyRevenueSeries(totals: number[]) {
  const series: number[] = [];

  for (let index = 1; index < totals.length; index += 1) {
    series.push(totals[index] - totals[index - 1]);
  }

  return series;
}

function sumWindow(values: number[], start: number, windowSize: number) {
  return values.slice(start, start + windowSize).reduce((total, value) => total + value, 0);
}

function formatGrowthLabel(value: number | null) {
  return value == null ? "计算中" : `${value.toFixed(2)}%`;
}

function calculateGrowth(recent: number, previous: number) {
  if (previous <= 0) {
    return null;
  }

  return (recent / previous - 1) * 100;
}

function toDayNumber(snapshotDate: string) {
  const [year, month, day] = snapshotDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_IN_MS;
}

function takeTrailingConsecutiveSnapshots(
  snapshots: DailySnapshotRow[],
  asOfDate: string,
  requiredSnapshotCount: number,
) {
  const lastSnapshot = snapshots.at(-1);

  if (!lastSnapshot || lastSnapshot.snapshotDate !== asOfDate) {
    return [];
  }

  const consecutiveSnapshots: DailySnapshotRow[] = [];
  let expectedDayNumber = toDayNumber(asOfDate);

  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    const snapshot = snapshots[index];

    if (toDayNumber(snapshot.snapshotDate) !== expectedDayNumber) {
      break;
    }

    consecutiveSnapshots.push(snapshot);
    expectedDayNumber -= 1;

    if (consecutiveSnapshots.length === requiredSnapshotCount) {
      break;
    }
  }

  return consecutiveSnapshots.reverse();
}

function compareReadyEntries(left: Omit<LeaderboardEntry, "rank">, right: Omit<LeaderboardEntry, "rank">) {
  if ((right.growth7d ?? -Infinity) !== (left.growth7d ?? -Infinity)) {
    return (right.growth7d ?? -Infinity) - (left.growth7d ?? -Infinity);
  }

  if (left.growth28d != null && right.growth28d != null && right.growth28d !== left.growth28d) {
    return right.growth28d - left.growth28d;
  }

  if ((right.recent7 ?? -Infinity) !== (left.recent7 ?? -Infinity)) {
    return (right.recent7 ?? -Infinity) - (left.recent7 ?? -Infinity);
  }

  if ((left.sourceRank ?? Infinity) !== (right.sourceRank ?? Infinity)) {
    return (left.sourceRank ?? Infinity) - (right.sourceRank ?? Infinity);
  }

  return left.slug.localeCompare(right.slug);
}

export function buildLeaderboard(input: {
  asOfDate: string;
  snapshotsBySlug: Record<string, DailySnapshotRow[]>;
}) {
  const readyEntries: Array<Omit<LeaderboardEntry, "rank">> = [];
  const calculatingEntries: Array<Omit<LeaderboardEntry, "rank">> = [];

  for (const snapshots of Object.values(input.snapshotsBySlug)) {
    const relevantSnapshots = snapshots
      .filter((snapshot) => snapshot.snapshotDate <= input.asOfDate)
      .sort((left, right) => left.snapshotDate.localeCompare(right.snapshotDate));

    if (relevantSnapshots.length === 0) {
      continue;
    }

    const latest = relevantSnapshots.at(-1);

    if (!latest) {
      continue;
    }

    const trailing15Snapshots = takeTrailingConsecutiveSnapshots(relevantSnapshots, input.asOfDate, 15);

    if (trailing15Snapshots.length < 15) {
      calculatingEntries.push({
        slug: latest.slug,
        name: latest.name,
        icon: latest.icon,
        sourceRank: latest.sourceRank,
        status: "calculating",
        growth7d: null,
        growth7dLabel: "计算中",
        growth28d: null,
        recent7: null,
        previous7: null,
      });
      continue;
    }

    const dailyRevenue = buildDailyRevenueSeries(trailing15Snapshots.map((snapshot) => snapshot.revenueTotal));
    const previous7 = sumWindow(dailyRevenue, dailyRevenue.length - 14, 7);

    if (previous7 < MINIMUM_PREVIOUS_7_REVENUE) {
      continue;
    }

    const recent7 = sumWindow(dailyRevenue, dailyRevenue.length - 7, 7);
    const growth7d = calculateGrowth(recent7, previous7);
    const trailing57Snapshots = takeTrailingConsecutiveSnapshots(relevantSnapshots, input.asOfDate, 57);
    const growth28d =
      trailing57Snapshots.length === 57
        ? (() => {
            const trailing57DailyRevenue = buildDailyRevenueSeries(
              trailing57Snapshots.map((snapshot) => snapshot.revenueTotal),
            );

            return calculateGrowth(
              sumWindow(trailing57DailyRevenue, trailing57DailyRevenue.length - 28, 28),
              sumWindow(trailing57DailyRevenue, trailing57DailyRevenue.length - 56, 28),
            );
          })()
        : null;

    readyEntries.push({
      slug: latest.slug,
      name: latest.name,
      icon: latest.icon,
      sourceRank: latest.sourceRank,
      status: "ready",
      growth7d,
      growth7dLabel: formatGrowthLabel(growth7d),
      growth28d,
      recent7,
      previous7,
    });
  }

  const sortedReadyEntries = readyEntries.sort(compareReadyEntries);
  const sortedCalculatingEntries = calculatingEntries.sort((left, right) => {
    if ((left.sourceRank ?? Infinity) !== (right.sourceRank ?? Infinity)) {
      return (left.sourceRank ?? Infinity) - (right.sourceRank ?? Infinity);
    }

    return left.slug.localeCompare(right.slug);
  });

  return [...sortedReadyEntries, ...sortedCalculatingEntries]
    .slice(0, 20)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
