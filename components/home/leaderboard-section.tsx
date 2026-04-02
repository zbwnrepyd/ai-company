"use client";

import { useEffect, useState } from "react";

import { PlaybackControl } from "./playback-control";
import { StartupCard } from "./startup-card";
import type {
  PlaybackFrame,
  StartupCardState,
  StartupEntry,
} from "./types";

interface LeaderboardSectionProps {
  entries: StartupEntry[];
  frames: PlaybackFrame[];
  cardCache: Record<string, StartupCardState>;
  isCalculating: boolean;
  onActivateSlug: (slug: string) => void;
}

export function LeaderboardSection({
  entries,
  frames,
  cardCache,
  isCalculating,
  onActivateSlug,
}: LeaderboardSectionProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number | null>(null);

  useEffect(() => {
    setCurrentFrameIndex(null);
  }, [frames]);

  const visibleFrameIndex =
    currentFrameIndex ?? (frames.length > 0 ? frames.length - 1 : 0);
  const visibleEntries =
    frames.length > 0
      ? (frames[visibleFrameIndex]?.leaderboard ?? [])
      : entries;
  const activeCompany = visibleEntries.find((entry) => entry.slug === activeSlug);
  const activeCardState = activeSlug ? cardCache[activeSlug] : undefined;

  return (
    <div className="leaderboard-shell">
      <div className="leaderboard-box" data-testid="leaderboard-box">
        <h2 id="leaderboard-title" className="section-title">
          增长榜单
        </h2>

        <div className="leaderboard-header" aria-hidden="true">
          <span>Rank</span>
          <span>公司</span>
          <span>7日增长</span>
        </div>

        {visibleEntries.length > 0 ? (
          <ol className="leaderboard-list">
            {visibleEntries.map((entry) => (
              <li key={`${entry.slug}-${entry.rank}`}>
                <button
                  type="button"
                  className="leaderboard-row"
                  onMouseEnter={() => {
                    setActiveSlug(entry.slug);
                    onActivateSlug(entry.slug);
                  }}
                  onMouseLeave={() => setActiveSlug(null)}
                  onFocus={() => {
                    setActiveSlug(entry.slug);
                    onActivateSlug(entry.slug);
                  }}
                  onBlur={() => setActiveSlug(null)}
                >
                  <span className="leaderboard-rank">{entry.rank}</span>
                  <span className="leaderboard-company">
                    <strong>{entry.name}</strong>
                  </span>
                  <span className="leaderboard-growth">{entry.growth7dLabel}</span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-state">{isCalculating ? "榜单计算中" : "暂无数据"}</p>
        )}

        {activeCompany ? (
          <StartupCard
            title={activeCompany.name}
            state={activeCardState}
            className="leaderboard-card"
          />
        ) : null}

        <PlaybackControl
          key={frames.at(-1)?.snapshotDate ?? "empty"}
          frames={frames}
          initialIndex={frames.length > 0 ? frames.length - 1 : 0}
          onFrameChange={setCurrentFrameIndex}
        />
      </div>
    </div>
  );
}
