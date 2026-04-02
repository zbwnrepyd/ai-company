import type Database from "better-sqlite3";

import type { LeaderboardEntry } from "../leaderboard/build-leaderboard";
import type { PlaybackFrame } from "../leaderboard/build-playback";
import { getDatabase } from "./connection";

type LeaderboardRunRow = {
  snapshot_date: string;
  leaderboard_json: string;
  playback_json: string;
  created_at: string;
};

export type LeaderboardRunRecord = {
  snapshotDate: string;
  leaderboard: LeaderboardEntry[];
  playback: PlaybackFrame[];
  createdAt: string;
};

function mapRun(row: LeaderboardRunRow): LeaderboardRunRecord {
  return {
    snapshotDate: row.snapshot_date,
    leaderboard: JSON.parse(row.leaderboard_json) as LeaderboardEntry[],
    playback: JSON.parse(row.playback_json) as PlaybackFrame[],
    createdAt: row.created_at,
  };
}

export function saveLeaderboardRun(
  input: {
    snapshotDate: string;
    leaderboard: LeaderboardEntry[];
    playback: PlaybackFrame[];
  },
  database: Database.Database = getDatabase(),
) {
  database
    .prepare(
      `
        insert into leaderboard_runs (
          snapshot_date,
          leaderboard_json,
          playback_json,
          created_at
        )
        values (
          @snapshotDate,
          @leaderboardJson,
          @playbackJson,
          @createdAt
        )
        on conflict(snapshot_date) do update set
          leaderboard_json = excluded.leaderboard_json,
          playback_json = excluded.playback_json,
          created_at = excluded.created_at
      `,
    )
    .run({
      snapshotDate: input.snapshotDate,
      leaderboardJson: JSON.stringify(input.leaderboard),
      playbackJson: JSON.stringify(input.playback),
      createdAt: new Date().toISOString(),
    });
}

export function listRecentLeaderboardRuns(
  limit: number,
  database: Database.Database = getDatabase(),
) {
  const rows = database
    .prepare("select * from leaderboard_runs order by snapshot_date desc limit ?")
    .all(limit) as LeaderboardRunRow[];

  return rows.map(mapRun);
}
