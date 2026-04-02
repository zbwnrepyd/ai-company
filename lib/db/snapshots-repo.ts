import type Database from "better-sqlite3";

import type { TrustMrrStartupListItem } from "../trustmrr/types";
import { getDatabase } from "./connection";

export type SnapshotRecord = {
  snapshotDate: string;
  slug: string;
  name: string;
  icon: string | null;
  sourceRank: number | null;
  revenueTotal: number;
  revenueLast30Days: number | null;
  growth30d: number | null;
};

type SnapshotRow = {
  snapshot_date: string;
  slug: string;
  name: string;
  icon: string | null;
  source_rank: number | null;
  revenue_total: number;
  revenue_last_30_days: number | null;
  growth_30d: number | null;
};

function mapSnapshotRow(row: SnapshotRow): SnapshotRecord {
  return {
    snapshotDate: row.snapshot_date,
    slug: row.slug,
    name: row.name,
    icon: row.icon,
    sourceRank: row.source_rank,
    revenueTotal: row.revenue_total,
    revenueLast30Days: row.revenue_last_30_days,
    growth30d: row.growth_30d,
  };
}

export function saveDailySnapshots(
  snapshotDate: string,
  startups: TrustMrrStartupListItem[],
  database: Database.Database = getDatabase(),
) {
  const statement = database.prepare(
    `
      insert into daily_snapshots (
        snapshot_date,
        slug,
        name,
        icon,
        source_rank,
        revenue_total,
        revenue_last_30_days,
        growth_30d
      )
      values (
        @snapshotDate,
        @slug,
        @name,
        @icon,
        @sourceRank,
        @revenueTotal,
        @revenueLast30Days,
        @growth30d
      )
      on conflict(snapshot_date, slug) do update set
        name = excluded.name,
        icon = excluded.icon,
        source_rank = excluded.source_rank,
        revenue_total = excluded.revenue_total,
        revenue_last_30_days = excluded.revenue_last_30_days,
        growth_30d = excluded.growth_30d
    `,
  );

  const transaction = database.transaction((items: TrustMrrStartupListItem[]) => {
    for (const startup of items) {
      statement.run({
        snapshotDate,
        slug: startup.slug,
        name: startup.name,
        icon: startup.icon ?? null,
        sourceRank: startup.rank ?? null,
        revenueTotal: startup.revenue.total,
        revenueLast30Days: startup.revenue.last30Days ?? null,
        growth30d: startup.growth30d ?? null,
      });
    }
  });

  transaction(startups);
}

export function listSnapshotsForSlug(
  slug: string,
  database: Database.Database = getDatabase(),
) {
  const rows = database
    .prepare("select * from daily_snapshots where slug = ? order by snapshot_date asc")
    .all(slug) as SnapshotRow[];

  return rows.map(mapSnapshotRow);
}

export function listSnapshotsForDate(
  snapshotDate: string,
  database: Database.Database = getDatabase(),
) {
  const rows = database
    .prepare("select * from daily_snapshots where snapshot_date = ? order by source_rank asc, slug asc")
    .all(snapshotDate) as SnapshotRow[];

  return rows.map(mapSnapshotRow);
}
