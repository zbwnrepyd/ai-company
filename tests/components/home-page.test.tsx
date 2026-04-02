import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "../../app/page";

type LeaderboardEntry = {
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

type PlaybackFrame = {
  snapshotDate: string;
  leaderboard: LeaderboardEntry[];
};

const latestEntries: LeaderboardEntry[] = [
  {
    rank: 1,
    slug: "realtime-one",
    name: "Realtime One",
    icon: null,
    sourceRank: 1,
    status: "ready",
    growth7d: 72.4,
    growth7dLabel: "72.40%",
    growth28d: 118.5,
    recent7: 5400,
    previous7: 3132,
  },
  {
    rank: 2,
    slug: "realtime-two",
    name: "Realtime Two",
    icon: null,
    sourceRank: 2,
    status: "calculating",
    growth7d: null,
    growth7dLabel: "计算中",
    growth28d: null,
    recent7: null,
    previous7: null,
  },
  {
    rank: 3,
    slug: "realtime-three",
    name: "Realtime Three",
    icon: null,
    sourceRank: 3,
    status: "ready",
    growth7d: 18.1,
    growth7dLabel: "18.10%",
    growth28d: 28.4,
    recent7: 2900,
    previous7: 2455,
  },
];

const playbackFrames: PlaybackFrame[] = [
  {
    snapshotDate: "2026-03-24",
    leaderboard: [
      {
        rank: 1,
        slug: "playback-alpha",
        name: "Playback Alpha",
        icon: null,
        sourceRank: 1,
        status: "ready",
        growth7d: 31,
        growth7dLabel: "31.00%",
        growth28d: null,
        recent7: 2200,
        previous7: 1680,
      },
    ],
  },
  {
    snapshotDate: "2026-03-25",
    leaderboard: [
      {
        rank: 1,
        slug: "playback-beta",
        name: "Playback Beta",
        icon: null,
        sourceRank: 1,
        status: "ready",
        growth7d: 44,
        growth7dLabel: "44.00%",
        growth28d: null,
        recent7: 2600,
        previous7: 1805,
      },
    ],
  },
  {
    snapshotDate: "2026-03-26",
    leaderboard: latestEntries,
  },
];

function createJsonResponse(payload: unknown, init?: { status?: number }) {
  const status = init?.status ?? 200;

  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  });
}

describe("HomePage", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockImplementation((input) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url === "/api/leaderboard") {
        return createJsonResponse({
          leaderboard: latestEntries,
          playback: playbackFrames,
        }) as ReturnType<typeof fetch>;
      }

      if (url === "/api/startups/realtime-one") {
        return createJsonResponse({
          slug: "realtime-one",
          rows: [
            { label: "产品描述", value: "真实接口返回的产品描述" },
            { label: "目标用户", value: "真实接口返回的目标用户" },
            { label: "报价", value: "$199" },
          ],
        }) as ReturnType<typeof fetch>;
      }

      if (url === "/api/startups/realtime-two") {
        return createJsonResponse({
          slug: "realtime-two",
          rows: [
            { label: "产品描述", value: "第二家公司的描述" },
            { label: "目标用户", value: "第二家公司的用户" },
          ],
        }) as ReturnType<typeof fetch>;
      }

      return createJsonResponse({ error: `Unhandled URL: ${url}` }, { status: 404 }) as ReturnType<
        typeof fetch
      >;
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renders the homepage from /api/leaderboard instead of mock entries", async () => {
    const { container } = render(<HomePage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/leaderboard");
    });

    const sections = screen.getAllByRole("region");
    expect(sections).toHaveLength(3);
    expect(sections[0]?.getAttribute("aria-labelledby")).toBe("hero-title");
    expect(sections[1]?.getAttribute("aria-labelledby")).toBe("leaderboard-title");
    expect(sections[2]?.getAttribute("aria-labelledby")).toBe("faq-title");

    const heroSection = screen.getByRole("region", {
      name: "AI初创公司增长榜单",
    });
    expect(within(heroSection).getAllByRole("listitem")).toHaveLength(3);
    expect(within(heroSection).getByRole("button", { name: /Realtime One/ })).toBeTruthy();
    expect(within(heroSection).queryByRole("button", { name: /AgentFlow/ })).toBeNull();

    const leaderboard = screen.getByRole("region", { name: "增长榜单" });
    expect(
      within(leaderboard).getByRole("heading", { level: 2, name: "增长榜单" }),
    ).toBeInTheDocument();
    const leaderboardBoxes = container.querySelectorAll("[data-testid='leaderboard-box']");
    expect(leaderboardBoxes).toHaveLength(1);
    expect(within(leaderboard).getAllByRole("listitem")).toHaveLength(3);
    expect(within(leaderboard).getByRole("button", { name: /Realtime Two/ })).toBeTruthy();
    expect(within(leaderboard).getByText("72.40%")).toBeInTheDocument();
    expect(within(leaderboard).getByText("计算中")).toBeInTheDocument();
    expect(
      within(leaderboardBoxes[0] as HTMLElement).getByRole("button", {
        name: "播放最近7天变化",
      }),
    ).toBeInTheDocument();

    const faq = screen.getByRole("region", { name: "Q&A" });
    expect(within(faq).getAllByRole("listitem")).toHaveLength(3);
  });

  it("replays real playback frames so leaderboard rows change over time", async () => {
    render(<HomePage />);

    const leaderboard = screen.getByRole("region", { name: "增长榜单" });
    await waitFor(() => {
      expect(
        within(leaderboard).getByRole("button", { name: /Realtime One/ }),
      ).toBeInTheDocument();
    });
    const playButton = within(leaderboard).getByRole("button", {
      name: "播放最近7天变化",
    });

    expect(within(leaderboard).getByRole("button", { name: /Realtime One/ })).toBeInTheDocument();

    vi.useFakeTimers();
    fireEvent.click(playButton);

    expect(
      within(leaderboard).getByRole("button", { name: /Playback Alpha/ }),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(
      within(leaderboard).getByRole("button", { name: /Playback Beta/ }),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(within(leaderboard).getByRole("button", { name: /Realtime One/ })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("fetches startup cards lazily, caches by slug, and uses API rows", async () => {
    render(<HomePage />);

    const heroSection = screen.getByRole("region", {
      name: "AI初创公司增长榜单",
    });
    await waitFor(() => {
      expect(
        within(heroSection).getByRole("button", { name: /Realtime One/ }),
      ).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const previewButton = within(heroSection).getByRole("button", {
      name: /Realtime One/,
    });

    fireEvent.mouseEnter(previewButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/startups/realtime-one");
    });

    const card = await screen.findByRole("complementary", {
      name: "Realtime One 信息卡",
    });
    expect(within(card).getByText("真实接口返回的产品描述")).toBeInTheDocument();
    expect(within(card).getByText("真实接口返回的目标用户")).toBeInTheDocument();
    expect(within(card).getByText("$199")).toBeInTheDocument();

    fireEvent.mouseLeave(previewButton);
    await waitFor(() => {
      expect(
        screen.queryByRole("complementary", { name: "Realtime One 信息卡" }),
      ).toBeNull();
    });

    const leaderboardSection = screen.getByRole("region", { name: "增长榜单" });
    const leaderboardButton = within(leaderboardSection).getByRole("button", {
      name: /Realtime One/,
    });
    fireEvent.focus(leaderboardButton);

    const cachedCard = await screen.findByRole("complementary", {
      name: "Realtime One 信息卡",
    });
    expect(within(cachedCard).getByText("真实接口返回的产品描述")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a calculating empty state when the API has no leaderboard data", async () => {
    fetchMock.mockImplementation((input) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url === "/api/leaderboard") {
        return createJsonResponse({
          leaderboard: [],
          playback: [],
        }) as ReturnType<typeof fetch>;
      }

      return createJsonResponse({ error: "unexpected" }, { status: 404 }) as ReturnType<typeof fetch>;
    });

    render(<HomePage />);

    expect(await screen.findAllByText("榜单计算中")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Realtime One/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /AgentFlow/ })).toBeNull();
  });
});
