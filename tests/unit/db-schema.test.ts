import { describe, expect, it } from "vitest";

import { schemaSql } from "../../lib/db/schema";

describe("schemaSql", () => {
  it("creates the required tables", () => {
    expect(schemaSql).toContain("create table if not exists daily_snapshots");
    expect(schemaSql).toContain("create table if not exists startup_details");
    expect(schemaSql).toContain("create table if not exists leaderboard_runs");
  });
});
