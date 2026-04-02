import {
  fetch as undiciFetch,
  ProxyAgent,
  type Dispatcher,
  type RequestInit as UndiciRequestInit,
} from "undici";

import { getEnv, getTrustMrrApiKey, getTrustMrrProxyUrl } from "../env";
import {
  trustMrrStartupDetailSchema,
  trustMrrStartupListResponseSchema,
  type TrustMrrStartupDetail,
  type TrustMrrStartupListItem,
} from "./types";

type TrustMrrRequestInit = UndiciRequestInit & { dispatcher?: Dispatcher };
type TrustMrrResponse = {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
};
type FetchLike = (input: string, init?: TrustMrrRequestInit) => Promise<TrustMrrResponse>;

export interface TrustMrrClient {
  listStartupsPage(page: number, pageSize?: number): Promise<{
    items: TrustMrrStartupListItem[];
    nextPage: number | null;
  }>;
  listAllStartups(options?: {
    pageSize?: number;
    pageDelayMs?: number;
    onPage?: (info: { page: number; pageSize: number; totalSoFar: number }) => void;
  }): Promise<TrustMrrStartupListItem[]>;
  getStartup(slug: string): Promise<TrustMrrStartupDetail>;
}

export function createTrustMrrClient(options?: {
  apiKey?: string;
  baseUrl?: string;
  fetch?: FetchLike;
  env?: NodeJS.ProcessEnv;
  sleep?: (ms: number) => Promise<void>;
}): TrustMrrClient {
  const envSource = options?.env ?? process.env;
  const baseUrl = (options?.baseUrl ?? getEnv(envSource).TRUSTMRR_BASE_URL).replace(/\/+$/, "");
  const apiKey = options?.apiKey ?? getTrustMrrApiKey(envSource);
  const fetchImpl = options?.fetch ?? undiciFetch;
  const sleep = options?.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const proxyUrl = getTrustMrrProxyUrl(envSource);
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

  function getRetryDelayMs(response: TrustMrrResponse) {
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;

    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      return retryAfterSeconds * 1000;
    }

    return 65_000;
  }

  async function request<T>(path: string, attempt = 0): Promise<T> {
    const requestInit: TrustMrrRequestInit = {
      headers: {
        authorization: `Bearer ${apiKey}`,
        accept: "application/json",
      },
      ...(dispatcher ? { dispatcher } : {}),
    };

    const response = await fetchImpl(`${baseUrl}${path}`, requestInit);

    if (response.status === 429 && attempt < 2) {
      await sleep(getRetryDelayMs(response));
      return request<T>(path, attempt + 1);
    }

    if (!response.ok) {
      throw new Error(`TrustMRR request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }

  return {
    async listStartupsPage(page: number, pageSize = 50) {
      const payload = trustMrrStartupListResponseSchema.parse(
        await request<unknown>(`/startups?page=${page}&limit=${pageSize}`),
      );

      return {
        items: payload.data,
        nextPage: payload.meta?.hasMore ? page + 1 : null,
      };
    },
    async listAllStartups(options) {
      const startups: TrustMrrStartupListItem[] = [];
      let page = 1;
      const pageSize = options?.pageSize ?? 50;
      const pageDelayMs = options?.pageDelayMs ?? 0;

      while (page) {
        const result = await this.listStartupsPage(page, pageSize);
        startups.push(...result.items);
        options?.onPage?.({
          page,
          pageSize,
          totalSoFar: startups.length,
        });
        if (result.nextPage && pageDelayMs > 0) {
          await sleep(pageDelayMs);
        }
        page = result.nextPage ?? 0;
      }

      return startups;
    },
    async getStartup(slug: string) {
      const payload = await request<unknown>(`/startups/${slug}`);
      return trustMrrStartupDetailSchema.parse(payload);
    },
  };
}
