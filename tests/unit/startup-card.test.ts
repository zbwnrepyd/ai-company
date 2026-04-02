import { describe, expect, it } from "vitest";

import { buildStartupCard } from "../../lib/startups/get-startup-card";

describe("buildStartupCard", () => {
  it("always returns fixed rows and hides missing optional rows", () => {
    const card = buildStartupCard({
      slug: "alpha",
      description: null,
      targetAudience: "独立开发者",
      onSale: null,
      askingPrice: null,
      techStack: [],
    });

    expect(card.rows).toEqual([
      { label: "产品描述", value: "暂无" },
      { label: "目标用户", value: "独立开发者" },
    ]);
  });

  it("adds optional rows when the values are present", () => {
    const card = buildStartupCard({
      slug: "beta",
      description: "AI 销售助手",
      targetAudience: "B2B 团队",
      onSale: true,
      askingPrice: 25000,
      techStack: ["Next.js", "SQLite"],
    });

    expect(card.rows).toEqual([
      { label: "产品描述", value: "AI 销售助手" },
      { label: "目标用户", value: "B2B 团队" },
      { label: "是否可售", value: "是" },
      { label: "报价", value: "$25,000" },
      { label: "技术栈", value: "Next.js, SQLite" },
    ]);
  });
});
