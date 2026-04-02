"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { FAQSection } from "./faq-section";
import { HeroSection } from "./hero-section";
import { LeaderboardSection } from "./leaderboard-section";
import type {
  PlaybackFrame,
  QAItem,
  StartupCardPayload,
  StartupCardState,
  StartupEntry,
} from "./types";

const qaItems: QAItem[] = [
  { text: "数据来自 TrustMRR，每日同步一次。" },
  { text: "主指标是真实 7 天滚动收入增长率。" },
  { text: "字段缺失时卡片只显示接口返回的已有信息。" },
];

type LeaderboardPayload = {
  leaderboard?: StartupEntry[];
  playback?: PlaybackFrame[];
};

type LeaderboardState = {
  status: "loading" | "ready" | "error";
  leaderboard: StartupEntry[];
  playback: PlaybackFrame[];
};

export function HomePageClient() {
  const [leaderboardState, setLeaderboardState] = useState<LeaderboardState>({
    status: "loading",
    leaderboard: [],
    playback: [],
  });
  const [cardCache, setCardCache] = useState<Record<string, StartupCardState>>({});
  const cardCacheRef = useRef<Record<string, StartupCardState>>({});

  useEffect(() => {
    let ignore = false;

    const loadLeaderboard = async () => {
      try {
        const response = await fetch("/api/leaderboard");

        if (!response.ok) {
          throw new Error(`Failed to load leaderboard: ${response.status}`);
        }

        const payload = (await response.json()) as LeaderboardPayload;

        if (ignore) {
          return;
        }

        setLeaderboardState({
          status: "ready",
          leaderboard: Array.isArray(payload.leaderboard) ? payload.leaderboard : [],
          playback: Array.isArray(payload.playback) ? payload.playback : [],
        });
      } catch {
        if (ignore) {
          return;
        }

        setLeaderboardState({
          status: "error",
          leaderboard: [],
          playback: [],
        });
      }
    };

    void loadLeaderboard();

    return () => {
      ignore = true;
    };
  }, []);

  const loadStartupCard = async (slug: string) => {
    const cached = cardCacheRef.current[slug];

    if (cached?.status === "loading" || cached?.status === "ready") {
      return;
    }

    const loadingState: StartupCardState = { status: "loading" };
    cardCacheRef.current = {
      ...cardCacheRef.current,
      [slug]: loadingState,
    };
    setCardCache(cardCacheRef.current);

    try {
      const response = await fetch(`/api/startups/${slug}`);

      if (!response.ok) {
        throw new Error(`Failed to load startup card: ${response.status}`);
      }

      const payload = (await response.json()) as StartupCardPayload;
      const nextState: StartupCardState = {
        status: "ready",
        rows: Array.isArray(payload.rows) ? payload.rows : [],
      };

      cardCacheRef.current = {
        ...cardCacheRef.current,
        [slug]: nextState,
      };
      setCardCache(cardCacheRef.current);
    } catch {
      const nextState: StartupCardState = { status: "error" };
      cardCacheRef.current = {
        ...cardCacheRef.current,
        [slug]: nextState,
      };
      setCardCache(cardCacheRef.current);
    }
  };

  const previewEntries = useMemo(
    () => leaderboardState.leaderboard.slice(0, 4),
    [leaderboardState.leaderboard],
  );
  const isCalculating =
    leaderboardState.status !== "ready" || leaderboardState.leaderboard.length === 0;

  return (
    <main className="home-page">
      <section
        className="home-section home-section-hero"
        aria-labelledby="hero-title"
      >
        <HeroSection
          previewEntries={previewEntries}
          cardCache={cardCache}
          isCalculating={isCalculating}
          onActivateSlug={loadStartupCard}
        />
      </section>

      <section
        id="leaderboard"
        className="home-section home-section-leaderboard"
        aria-labelledby="leaderboard-title"
      >
        <LeaderboardSection
          entries={leaderboardState.leaderboard}
          frames={leaderboardState.playback}
          cardCache={cardCache}
          isCalculating={isCalculating}
          onActivateSlug={loadStartupCard}
        />
      </section>

      <section
        className="home-section home-section-faq"
        aria-labelledby="faq-title"
      >
        <FAQSection items={qaItems} />
      </section>
    </main>
  );
}
