import { afterEach, describe, expect, it, vi } from "vitest";

import { createTrustMrrClient } from "../../lib/trustmrr/client";

function createJsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("createTrustMrrClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("paginates through all startup list pages", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          items: [
            {
              slug: "alpha",
              name: "Alpha",
              icon: "https://cdn.example.com/alpha.png",
              rank: 1,
              growth30d: 12,
              revenue: { total: 12000, last30Days: 5000 },
            },
          ],
          nextPage: 2,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          items: [
            {
              slug: "beta",
              name: "Beta",
              icon: null,
              rank: 2,
              growth30d: 10,
              revenue: { total: 9000, last30Days: 3000 },
            },
          ],
          nextPage: null,
        }),
      );

    const client = createTrustMrrClient({
      apiKey: "test-key",
      baseUrl: "https://trustmrr.example/api/v1",
      fetch: fetchMock,
    });

    const startups = await client.listAllStartups();

    expect(startups.map((item) => item.slug)).toEqual(["alpha", "beta"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/startups?page=1&pageSize=50");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/startups?page=2&pageSize=50");
  });

  it("fetches startup detail payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        slug: "alpha",
        description: "AI assistant",
        targetAudience: "Founders",
        onSale: true,
        askingPrice: 30000,
        techStack: ["TypeScript", "SQLite"],
      }),
    );

    const client = createTrustMrrClient({
      apiKey: "test-key",
      baseUrl: "https://trustmrr.example/api/v1",
      fetch: fetchMock,
    });

    const detail = await client.getStartup("alpha");

    expect(detail).toMatchObject({
      slug: "alpha",
      description: "AI assistant",
      targetAudience: "Founders",
      onSale: true,
      askingPrice: 30000,
      techStack: ["TypeScript", "SQLite"],
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/startups/alpha");
  });

  it("passes a proxy dispatcher when HTTPS_PROXY is configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        items: [],
        nextPage: null,
      }),
    );

    const client = createTrustMrrClient({
      apiKey: "test-key",
      baseUrl: "https://trustmrr.example/api/v1",
      fetch: fetchMock,
      env: {
        DATABASE_PATH: "./data/test.sqlite",
        TRUSTMRR_BASE_URL: "https://trustmrr.example/api/v1",
        TRUSTMRR_API_KEY: "test-key",
        HTTPS_PROXY: "http://127.0.0.1:7890",
      } as NodeJS.ProcessEnv,
    });

    await client.listStartupsPage(1);

    const init = fetchMock.mock.calls[0]?.[1] as
      | (RequestInit & { dispatcher?: unknown })
      | undefined;

    expect(init?.dispatcher).toBeDefined();
  });
});
