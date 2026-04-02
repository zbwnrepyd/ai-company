"use client";

import { useState } from "react";

import { StartupCard } from "./startup-card";
import type { StartupCardState, StartupEntry } from "./types";

interface HeroSectionProps {
  previewEntries: StartupEntry[];
  cardCache: Record<string, StartupCardState>;
  isCalculating: boolean;
  onActivateSlug: (slug: string) => void;
}

export function HeroSection({
  previewEntries,
  cardCache,
  isCalculating,
  onActivateSlug,
}: HeroSectionProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const activeCompany = previewEntries.find((entry) => entry.slug === activeSlug);
  const activeCardState = activeSlug ? cardCache[activeSlug] : undefined;

  const scrollToLeaderboard = () => {
    document
      .getElementById("leaderboard")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="hero-shell">
      <span className="hero-tag">AI Startups</span>

      <div className="hero-grid">
        <div className="hero-copy">
          <h1 id="hero-title">AI初创公司增长榜单</h1>
          <p>
            用更克制的方式看清谁在过去 7 天真正长起来，先看预览，再进入完整榜单。
          </p>
        </div>

        <div className="preview-panel">
          {previewEntries.length > 0 ? (
            <ol className="preview-list">
              {previewEntries.map((entry) => (
                <li key={entry.slug}>
                  <button
                    type="button"
                    className="preview-item"
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
                    <span className="preview-rank">{entry.rank}</span>
                    <span className="preview-company">
                      <strong>{entry.name}</strong>
                    </span>
                    <span className="preview-growth">{entry.growth7dLabel}</span>
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
            />
          ) : null}
        </div>
      </div>

      <button type="button" className="hero-cta" onClick={scrollToLeaderboard}>
        查看榜单
      </button>
    </div>
  );
}
