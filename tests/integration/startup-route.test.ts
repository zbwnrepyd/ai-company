import { afterEach, describe, expect, it, vi } from "vitest";

import { getStartupDetailBySlug, upsertStartupDetail } from "../../lib/db/details-repo";
import { GET } from "../../app/api/startups/[slug]/route";
import { cleanupTestDatabase, initTestDatabase } from "../helpers/test-database";

function createJsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/startups/[slug]", () => {
  afterEach(() => {
    cleanupTestDatabase();
    vi.restoreAllMocks();
  });

  it("returns card rows from cache first", async () => {
    initTestDatabase("startup-route-cache");

    upsertStartupDetail({
      slug: "alpha",
      description: "AI tutor",
      targetAudience: "学生",
      onSale: true,
      askingPrice: 25000,
      techStack: ["Swift"],
    });

    const response = await GET(
      new Request("http://localhost/api/startups/alpha"),
      { params: Promise.resolve({ slug: "alpha" }) },
    );

    const payload = (await response.json()) as {
      slug: string;
      rows: Array<{ label: string; value: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.slug).toBe("alpha");
    expect(payload.rows).toEqual([
      { label: "产品描述", value: "AI tutor" },
      { label: "目标用户", value: "学生" },
      { label: "是否可售", value: "是" },
      { label: "报价", value: "$25,000" },
      { label: "技术栈", value: "Swift" },
    ]);
  });

  it("fetches, caches, and formats detail rows on cache miss", async () => {
    initTestDatabase("startup-route-miss");
    process.env.TRUSTMRR_API_KEY = "test-key";

    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        slug: "beta",
        description: "AI SDR",
        targetAudience: "销售团队",
        onSale: false,
        askingPrice: "$50k",
        techStack: ["Next.js", "SQLite"],
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new Request("http://localhost/api/startups/beta"),
      { params: Promise.resolve({ slug: "beta" }) },
    );

    const payload = (await response.json()) as {
      slug: string;
      rows: Array<{ label: string; value: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.rows).toEqual([
      { label: "产品描述", value: "AI SDR" },
      { label: "目标用户", value: "销售团队" },
      { label: "是否可售", value: "否" },
      { label: "报价", value: "$50k" },
      { label: "技术栈", value: "Next.js, SQLite" },
    ]);
    expect(getStartupDetailBySlug("beta")).toMatchObject({
      slug: "beta",
      description: "AI SDR",
      targetAudience: "销售团队",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
