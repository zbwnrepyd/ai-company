"use client";

import { useEffect, useState } from "react";

import type { PlaybackFrame } from "./types";

interface PlaybackControlProps {
  frames: PlaybackFrame[];
  initialIndex?: number;
  onFrameChange?: (index: number) => void;
}

export function PlaybackControl({
  frames,
  initialIndex = 0,
  onFrameChange,
}: PlaybackControlProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const canPlay = frames.length > 1;

  useEffect(() => {
    const nextIndex =
      frames.length > 0 ? Math.min(initialIndex, frames.length - 1) : 0;

    setCurrentIndex(nextIndex);
    setIsPlaying(false);
  }, [frames, initialIndex, onFrameChange]);

  useEffect(() => {
    onFrameChange?.(currentIndex);
  }, [currentIndex, onFrameChange]);

  useEffect(() => {
    if (!isPlaying || !canPlay) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((current) => {
        if (current >= frames.length - 1) {
          setIsPlaying(false);
          return current;
        }

        return current + 1;
      });
    }, 1500);

    return () => window.clearInterval(timer);
  }, [canPlay, frames.length, isPlaying]);

  const handleToggle = () => {
    if (!frames.length || !canPlay) {
      setIsPlaying(false);
      return;
    }

    if (!isPlaying && currentIndex === frames.length - 1) {
      setCurrentIndex(0);
    }

    setIsPlaying((current) => !current);
  };

  const currentFrame = frames[currentIndex];

  return (
    <div className="playback-control">
      <button
        type="button"
        className="playback-button"
        aria-label="播放最近7天变化"
        aria-pressed={isPlaying}
        disabled={!canPlay}
        onClick={handleToggle}
      >
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 2.2L9.2 6 3 9.8V2.2Z" fill="currentColor" />
        </svg>
      </button>

      <div className="playback-meta" aria-live="polite">
        <strong>{isPlaying ? "回放中" : "已暂停"}</strong>
        <span>{currentFrame?.snapshotDate ?? "暂无数据"}</span>
      </div>
    </div>
  );
}
