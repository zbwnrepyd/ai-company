export interface StartupEntry {
  slug: string;
  rank: number;
  name: string;
  icon: string | null;
  sourceRank: number | null;
  status: "ready" | "calculating";
  growth7d: number | null;
  growth7dLabel: string;
  growth28d: number | null;
  recent7: number | null;
  previous7: number | null;
}

export interface PlaybackFrame {
  snapshotDate: string;
  leaderboard: StartupEntry[];
}

export interface StartupCardRow {
  label: string;
  value: string;
}

export interface StartupCardPayload {
  slug: string;
  rows: StartupCardRow[];
}

export interface StartupCardState {
  status: "loading" | "ready" | "error";
  rows?: StartupCardRow[];
}

export interface QAItem {
  text: string;
}
