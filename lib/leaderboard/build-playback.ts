import type { LeaderboardEntry } from "./build-leaderboard";

export type PlaybackFrame = {
  snapshotDate: string;
  leaderboard: LeaderboardEntry[];
};

export function buildPlayback(frames: PlaybackFrame[]) {
  return frames
    .slice()
    .sort((left, right) => left.snapshotDate.localeCompare(right.snapshotDate))
    .slice(-7);
}
