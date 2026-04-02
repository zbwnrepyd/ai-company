import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PlaybackControl } from "../../components/home/playback-control";

describe("PlaybackControl", () => {
  it("starts playback and advances through recent frames", async () => {
    vi.useFakeTimers();
    const onFrameChange = vi.fn();

    render(
      <PlaybackControl
        frames={[
          { snapshotDate: "03-20", leaderboard: [] },
          { snapshotDate: "03-21", leaderboard: [] },
          { snapshotDate: "03-22", leaderboard: [] },
        ]}
        onFrameChange={onFrameChange}
      />,
    );

    const button = screen.getByRole("button", { name: "播放最近7天变化" });

    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("已暂停")).toBeTruthy();
    expect(screen.getByText("03-20")).toBeTruthy();

    fireEvent.click(button);

    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("回放中")).toBeTruthy();
    expect(onFrameChange).toHaveBeenCalledWith(0);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByText("03-21")).toBeTruthy();
    expect(onFrameChange).toHaveBeenCalledWith(1);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByText("03-22")).toBeTruthy();
    expect(onFrameChange).toHaveBeenCalledWith(2);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("已暂停")).toBeTruthy();

    vi.useRealTimers();
  });

  it("stays paused when only a single frame is available", () => {
    render(
      <PlaybackControl
        frames={[{ snapshotDate: "03-26", leaderboard: [] }]}
      />,
    );

    const button = screen.getByRole("button", { name: "播放最近7天变化" });

    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("已暂停")).toBeTruthy();
    expect(screen.getByText("03-26")).toBeTruthy();

    fireEvent.click(button);

    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("已暂停")).toBeTruthy();
  });
});
