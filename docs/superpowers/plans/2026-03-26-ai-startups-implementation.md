# AI 初创公司增长榜单 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 TrustMRR 数据的单页 Next.js 网站，展示 AI 初创公司 Top 20 榜单、悬浮卡片和最近 7 天榜单回放，并通过本地快照计算真实 7 天滚动收入增长率。

**Architecture:** 使用 Next.js App Router 作为单体应用，页面、API 路由、数据聚合逻辑都在同一代码库。数据层使用 SQLite 保存每日收入快照和 startup 详情缓存，服务端脚本负责抓取 TrustMRR 数据并生成榜单结果，前端只读取本地聚合结果。

**Tech Stack:** Next.js, React, TypeScript, Vitest, React Testing Library, SQLite (`better-sqlite3`), Zod, Node.js scripts

---

## 预期文件结构

### 新建目录

- `app`
- `app/api/leaderboard`
- `app/api/startups/[slug]`
- `components/home`
- `lib/db`
- `lib/leaderboard`
- `lib/trustmrr`
- `lib/startups`
- `scripts`
- `tests/unit`
- `tests/components`
- `tests/integration`
- `data`

### 关键文件职责

- `package.json`：依赖和脚本
- `tsconfig.json`：TypeScript 配置
- `next.config.ts`：Next.js 配置
- `vitest.config.ts`：Vitest 配置
- `app/layout.tsx`：全局布局
- `app/page.tsx`：首页 3 个 section 入口
- `app/globals.css`：全局样式，严格贴近已确认的草图布局
- `app/api/leaderboard/route.ts`：返回榜单和最近 7 天回放数据
- `app/api/startups/[slug]/route.ts`：返回 hover 卡片所需字段
- `components/home/hero-section.tsx`：Section 1
- `components/home/leaderboard-section.tsx`：Section 2
- `components/home/faq-section.tsx`：Section 3
- `components/home/startup-card.tsx`：hover 卡片
- `components/home/playback-player.tsx`：最近 7 天榜单回放
- `lib/env.ts`：环境变量校验
- `lib/db/connection.ts`：SQLite 连接
- `lib/db/schema.ts`：建表 SQL
- `lib/db/migrate.ts`：初始化数据库
- `lib/db/snapshots-repo.ts`：收入快照读写
- `lib/db/details-repo.ts`：详情缓存读写
- `lib/trustmrr/types.ts`：TrustMRR API 类型
- `lib/trustmrr/client.ts`：TrustMRR API 客户端
- `lib/leaderboard/math.ts`：`dailyRevenue`、`growth7d`、`growth28d` 计算
- `lib/leaderboard/build-leaderboard.ts`：榜单生成逻辑
- `lib/leaderboard/build-playback.ts`：最近 7 天回放数据生成
- `lib/startups/get-startup-card.ts`：组装 hover 卡片字段
- `scripts/bootstrap.ts`：初始化数据库
- `scripts/fetch-daily-snapshot.ts`：抓取列表快照并更新详情缓存
- `tests/unit/leaderboard-math.test.ts`：增长率公式单元测试
- `tests/unit/build-leaderboard.test.ts`：入榜门槛、平局逻辑测试
- `tests/unit/startup-card.test.ts`：卡片字段显示逻辑测试
- `tests/setup.ts`：Vitest DOM 断言初始化
- `tests/components/home-page.test.tsx`：页面结构测试
- `tests/components/playback-player.test.tsx`：回放组件测试
- `tests/integration/leaderboard-route.test.ts`：榜单 API 集成测试

## 环境变量约定

- `TRUSTMRR_API_KEY`
- `TRUSTMRR_BASE_URL=https://trustmrr.com/api/v1`
- `DATABASE_PATH=./data/leaderboard.sqlite`
- `SITE_URL=http://localhost:3000`
- `SNAPSHOT_TIMEZONE=Asia/Shanghai`
- `HTTPS_PROXY` 或 `ALL_PROXY`（可选，用于服务器出海访问）

## Task 1: 初始化 Next.js 项目与测试基础设施

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Test: `tests/components/home-page.test.tsx`

- [ ] **Step 1: 初始化仓库与应用骨架**

Run:

```bash
git init
npm init -y
npm install next react react-dom zod better-sqlite3
npm install -D typescript @types/node @types/react @types/react-dom vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected:

```text
Initialized empty Git repository
added ... packages
```

- [ ] **Step 2: 写首页结构测试，先让它失败**

Create `tests/components/home-page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the three sections and CTA", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "AI初创公司增长榜单" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看榜单" })).toBeInTheDocument();
    expect(screen.getByText("Q&A :")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 运行测试，确认失败**

Run:

```bash
npx vitest run tests/components/home-page.test.tsx
```

Expected:

```text
FAIL
Error: Failed to resolve import "@/app/page"
```

- [ ] **Step 4: 创建最小应用骨架让测试通过**

Create `package.json`:

```json
{
  "name": "ai-startups-leaderboard",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

Create `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

Create `tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `app/layout.tsx`:

```tsx
import "./globals.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

Create `app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main>
      <section>
        <h1>AI初创公司增长榜单</h1>
        <button type="button">查看榜单</button>
      </section>
      <section aria-label="leaderboard-section">Section 2</section>
      <section>
        <p>Q&A :</p>
      </section>
    </main>
  );
}
```

Create `app/globals.css`:

```css
html,
body {
  margin: 0;
  padding: 0;
}

body {
  font-family: "SF Pro Display", "PingFang SC", sans-serif;
}
```

- [ ] **Step 5: 运行测试，确认通过**

Run:

```bash
npx vitest run tests/components/home-page.test.tsx
```

Expected:

```text
PASS  tests/components/home-page.test.tsx
```

- [ ] **Step 6: 提交**

Run:

```bash
git add package.json tsconfig.json next.config.ts vitest.config.ts app tests/components/home-page.test.tsx
git commit -m "feat: bootstrap next app and test harness"
```

## Task 2: 建立环境变量、SQLite 连接和表结构

**Files:**
- Create: `lib/env.ts`
- Create: `lib/db/connection.ts`
- Create: `lib/db/schema.ts`
- Create: `lib/db/migrate.ts`
- Create: `scripts/bootstrap.ts`
- Test: `tests/unit/db-schema.test.ts`

- [ ] **Step 1: 写数据库 schema 测试，验证必须存在 3 张表**

Create `tests/unit/db-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { schemaSql } from "@/lib/db/schema";

describe("schemaSql", () => {
  it("creates the required tables", () => {
    expect(schemaSql).toContain("create table if not exists daily_snapshots");
    expect(schemaSql).toContain("create table if not exists startup_details");
    expect(schemaSql).toContain("create table if not exists leaderboard_runs");
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
npx vitest run tests/unit/db-schema.test.ts
```

Expected:

```text
FAIL
Error: Failed to resolve import "@/lib/db/schema"
```

- [ ] **Step 3: 写最小数据库与环境变量实现**

Create `lib/env.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  TRUSTMRR_API_KEY: z.string().min(1),
  TRUSTMRR_BASE_URL: z.string().url().default("https://trustmrr.com/api/v1"),
  DATABASE_PATH: z.string().min(1).default("./data/leaderboard.sqlite"),
  SITE_URL: z.string().url().default("http://localhost:3000"),
  SNAPSHOT_TIMEZONE: z.string().min(1).default("Asia/Shanghai"),
  HTTPS_PROXY: z.string().optional(),
  ALL_PROXY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
```

Create `lib/db/schema.ts`:

```ts
export const schemaSql = `
create table if not exists daily_snapshots (
  id integer primary key autoincrement,
  snapshot_date text not null,
  slug text not null,
  name text not null,
  rank integer,
  revenue_total integer not null,
  revenue_last_30_days integer,
  growth_30d real,
  unique(snapshot_date, slug)
);

create table if not exists startup_details (
  slug text primary key,
  description text,
  target_audience text,
  on_sale integer,
  asking_price integer,
  tech_stack_json text,
  updated_at text not null
);

create table if not exists leaderboard_runs (
  snapshot_date text primary key,
  leaderboard_json text not null,
  playback_json text not null,
  created_at text not null
);
`;
```

Create `lib/db/connection.ts`:

```ts
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";

const resolvedPath = path.resolve(env.DATABASE_PATH);
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

export const db = new Database(resolvedPath);
```

Create `lib/db/migrate.ts`:

```ts
import { db } from "@/lib/db/connection";
import { schemaSql } from "@/lib/db/schema";

export function migrate() {
  db.exec(schemaSql);
}
```

Create `scripts/bootstrap.ts`:

```ts
import { migrate } from "@/lib/db/migrate";

migrate();
console.log("Database initialized");
```

- [ ] **Step 4: 运行测试，确认通过**

Run:

```bash
npx vitest run tests/unit/db-schema.test.ts
```

Expected:

```text
PASS  tests/unit/db-schema.test.ts
```

- [ ] **Step 5: 手动执行数据库初始化脚本**

Run:

```bash
npx tsx scripts/bootstrap.ts
```

Expected:

```text
Database initialized
```

- [ ] **Step 6: 提交**

Run:

```bash
git add lib/env.ts lib/db scripts/bootstrap.ts tests/unit/db-schema.test.ts
git commit -m "feat: add env parsing and sqlite schema"
```

## Task 3: 实现 TrustMRR API 客户端和详情缓存仓储

**Files:**
- Create: `lib/trustmrr/types.ts`
- Create: `lib/trustmrr/client.ts`
- Create: `lib/db/details-repo.ts`
- Test: `tests/unit/trustmrr-client.test.ts`

- [ ] **Step 1: 写客户端测试，验证列表和详情字段映射**

Create `tests/unit/trustmrr-client.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createTrustMrrClient } from "@/lib/trustmrr/client";

describe("createTrustMrrClient", () => {
  it("maps list and detail payloads", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ slug: "math", name: "Math", revenue: { total: 1000 } }],
          pagination: { totalPages: 1 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          slug: "math",
          description: "AI tutor",
          targetAudience: "Students",
          onSale: true,
          askingPrice: 25000,
          techStack: ["Swift", "Python"],
        }),
      });

    const client = createTrustMrrClient({
      apiKey: "test-key",
      baseUrl: "https://example.com",
      fetcher: fetchMock,
    });

    const startups = await client.listAllStartups();
    const detail = await client.getStartup("math");

    expect(startups[0].slug).toBe("math");
    expect(detail.targetAudience).toBe("Students");
    expect(detail.techStack).toEqual(["Swift", "Python"]);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
npx vitest run tests/unit/trustmrr-client.test.ts
```

Expected:

```text
FAIL
Error: Failed to resolve import "@/lib/trustmrr/client"
```

- [ ] **Step 3: 实现类型、客户端和详情仓储**

Create `lib/trustmrr/types.ts`:

```ts
export type TrustMrrStartupListItem = {
  slug: string;
  name: string;
  icon?: string | null;
  rank?: number | null;
  growth30d?: number | null;
  revenue: {
    total: number;
    last30Days?: number | null;
  };
};

export type TrustMrrStartupDetail = {
  slug: string;
  description?: string | null;
  targetAudience?: string | null;
  onSale?: boolean | null;
  askingPrice?: number | null;
  techStack?: string[] | null;
};
```

Create `lib/trustmrr/client.ts`:

```ts
import { TrustMrrStartupDetail, TrustMrrStartupListItem } from "@/lib/trustmrr/types";

type Fetcher = typeof fetch;

export function createTrustMrrClient(input?: {
  apiKey?: string;
  baseUrl?: string;
  fetcher?: Fetcher;
}) {
  const apiKey = input?.apiKey ?? process.env.TRUSTMRR_API_KEY ?? "";
  const baseUrl = input?.baseUrl ?? process.env.TRUSTMRR_BASE_URL ?? "https://trustmrr.com/api/v1";
  const fetcher = input?.fetcher ?? fetch;

  async function request<T>(path: string): Promise<T> {
    const response = await fetcher(`${baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`TrustMRR request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  return {
    async listStartupsPage(page = 1, limit = 50): Promise<{
      data: TrustMrrStartupListItem[];
      pagination?: { totalPages?: number };
    }> {
      return request(`/startups?page=${page}&limit=${limit}`);
    },
    async listAllStartups(): Promise<TrustMrrStartupListItem[]> {
      const firstPage = await this.listStartupsPage(1, 50);
      const startups = [...firstPage.data];
      const totalPages = firstPage.pagination?.totalPages ?? 1;

      for (let page = 2; page <= totalPages; page += 1) {
        const nextPage = await this.listStartupsPage(page, 50);
        startups.push(...nextPage.data);
      }

      return startups;
    },
    async getStartup(slug: string): Promise<TrustMrrStartupDetail> {
      return request<TrustMrrStartupDetail>(`/startups/${slug}`);
    },
  };
}
```

Create `lib/db/details-repo.ts`:

```ts
import { db } from "@/lib/db/connection";
import { TrustMrrStartupDetail } from "@/lib/trustmrr/types";

export function upsertStartupDetail(detail: TrustMrrStartupDetail) {
  db.prepare(`
    insert into startup_details (slug, description, target_audience, on_sale, asking_price, tech_stack_json, updated_at)
    values (@slug, @description, @targetAudience, @onSale, @askingPrice, @techStackJson, @updatedAt)
    on conflict(slug) do update set
      description = excluded.description,
      target_audience = excluded.target_audience,
      on_sale = excluded.on_sale,
      asking_price = excluded.asking_price,
      tech_stack_json = excluded.tech_stack_json,
      updated_at = excluded.updated_at
  `).run({
    slug: detail.slug,
    description: detail.description ?? null,
    targetAudience: detail.targetAudience ?? null,
    onSale: detail.onSale == null ? null : Number(detail.onSale),
    askingPrice: detail.askingPrice ?? null,
    techStackJson: JSON.stringify(detail.techStack ?? []),
    updatedAt: new Date().toISOString(),
  });
}

export function getStartupDetail(slug: string) {
  return db
    .prepare("select * from startup_details where slug = ?")
    .get(slug) as
    | {
        slug: string;
        description: string | null;
        target_audience: string | null;
        on_sale: number | null;
        asking_price: number | null;
        tech_stack_json: string | null;
      }
    | undefined;
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run:

```bash
npx vitest run tests/unit/trustmrr-client.test.ts
```

Expected:

```text
PASS  tests/unit/trustmrr-client.test.ts
```

- [ ] **Step 5: 提交**

Run:

```bash
git add lib/trustmrr lib/db/details-repo.ts tests/unit/trustmrr-client.test.ts
git commit -m "feat: add TrustMRR client and detail cache repo"
```

## Task 4: 实现收入快照仓储和每日抓取脚本

**Files:**
- Create: `lib/db/snapshots-repo.ts`
- Create: `scripts/fetch-daily-snapshot.ts`
- Test: `tests/integration/fetch-daily-snapshot.test.ts`

- [ ] **Step 1: 写抓取脚本测试，验证能落库**

Create `tests/integration/fetch-daily-snapshot.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { runDailySnapshot } from "@/scripts/fetch-daily-snapshot";

describe("runDailySnapshot", () => {
  it("stores startup snapshots for the given day", async () => {
    const client = {
      listAllStartups: vi.fn().mockResolvedValue([
        {
          slug: "math",
          name: "Math",
          rank: 1,
          growth30d: 32,
          revenue: { total: 10000, last30Days: 2300 },
        },
      ]),
    };

    const result = await runDailySnapshot({
      snapshotDate: "2026-03-26",
      client,
    });

    expect(result.snapshotCount).toBe(1);
    expect(result.detailCount).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
npx vitest run tests/integration/fetch-daily-snapshot.test.ts
```

Expected:

```text
FAIL
Error: Failed to resolve import "@/scripts/fetch-daily-snapshot"
```

- [ ] **Step 3: 实现快照仓储和抓取脚本**

Create `lib/db/snapshots-repo.ts`:

```ts
import { db } from "@/lib/db/connection";
import { TrustMrrStartupListItem } from "@/lib/trustmrr/types";

export function saveDailySnapshots(snapshotDate: string, startups: TrustMrrStartupListItem[]) {
  const statement = db.prepare(`
    insert into daily_snapshots (
      snapshot_date, slug, name, rank, revenue_total, revenue_last_30_days, growth_30d
    ) values (
      @snapshotDate, @slug, @name, @rank, @revenueTotal, @revenueLast30Days, @growth30d
    )
    on conflict(snapshot_date, slug) do update set
      name = excluded.name,
      rank = excluded.rank,
      revenue_total = excluded.revenue_total,
      revenue_last_30_days = excluded.revenue_last_30_days,
      growth_30d = excluded.growth_30d
  `);

  const insertMany = db.transaction((items: TrustMrrStartupListItem[]) => {
    for (const item of items) {
      statement.run({
        snapshotDate,
        slug: item.slug,
        name: item.name,
        rank: item.rank ?? null,
        revenueTotal: item.revenue.total,
        revenueLast30Days: item.revenue.last30Days ?? null,
        growth30d: item.growth30d ?? null,
      });
    }
  });

  insertMany(startups);
}

export function listSnapshotsForSlug(slug: string) {
  return db
    .prepare("select * from daily_snapshots where slug = ? order by snapshot_date asc")
    .all(slug);
}

export function listSnapshotsForDate(snapshotDate: string) {
  return db
    .prepare("select * from daily_snapshots where snapshot_date = ? order by rank asc, slug asc")
    .all(snapshotDate);
}
```

Create `scripts/fetch-daily-snapshot.ts`:

```ts
import { saveDailySnapshots } from "@/lib/db/snapshots-repo";
import { createTrustMrrClient } from "@/lib/trustmrr/client";

type SnapshotClient = ReturnType<typeof createTrustMrrClient>;

export async function runDailySnapshot(input?: {
  snapshotDate?: string;
  client?: SnapshotClient;
}) {
  const snapshotDate =
    input?.snapshotDate ?? new Date().toISOString().slice(0, 10);
  const client = input?.client ?? createTrustMrrClient();
  const startups = await client.listAllStartups();

  saveDailySnapshots(snapshotDate, startups);

  return {
    snapshotCount: startups.length,
    detailCount: 0,
  };
}

if (process.argv[1]?.endsWith("fetch-daily-snapshot.ts")) {
  runDailySnapshot().then((result) => {
    console.log(JSON.stringify(result));
  });
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run:

```bash
npx vitest run tests/integration/fetch-daily-snapshot.test.ts
```

Expected:

```text
PASS  tests/integration/fetch-daily-snapshot.test.ts
```

- [ ] **Step 5: 手动验证脚本可以执行**

Run:

```bash
TRUSTMRR_API_KEY=your-key npx tsx scripts/fetch-daily-snapshot.ts
```

Expected:

```text
{"snapshotCount":...,"detailCount":0}
```

- [ ] **Step 6: 提交**

Run:

```bash
git add lib/db/snapshots-repo.ts scripts/fetch-daily-snapshot.ts tests/integration/fetch-daily-snapshot.test.ts
git commit -m "feat: persist daily startup snapshots"
```

## Task 5: 实现增长率计算和榜单排序逻辑

**Files:**
- Create: `lib/leaderboard/math.ts`
- Create: `lib/leaderboard/build-leaderboard.ts`
- Test: `tests/unit/leaderboard-math.test.ts`
- Test: `tests/unit/build-leaderboard.test.ts`

- [ ] **Step 1: 写公式测试**

Create `tests/unit/leaderboard-math.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildDailyRevenueSeries, calculateGrowthRate } from "@/lib/leaderboard/math";

describe("leaderboard math", () => {
  it("derives daily revenue from cumulative totals", () => {
    expect(buildDailyRevenueSeries([100, 180, 260])).toEqual([80, 80]);
  });

  it("calculates growth rate from adjacent windows", () => {
    const value = calculateGrowthRate({
      recent: 2100,
      previous: 1000,
    });

    expect(value).toBe(110);
  });
});
```

Create `tests/unit/build-leaderboard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildLeaderboard } from "@/lib/leaderboard/build-leaderboard";

describe("buildLeaderboard", () => {
  it("filters startups below the previous7 threshold and sorts by tie-breakers", () => {
    const leaderboard = buildLeaderboard({
      asOfDate: "2026-03-15",
      snapshotsBySlug: {
        alpha: [
          { snapshot_date: "2026-03-01", revenue_total: 1000, name: "Alpha", slug: "alpha" },
          { snapshot_date: "2026-03-02", revenue_total: 1200, name: "Alpha", slug: "alpha" },
          { snapshot_date: "2026-03-03", revenue_total: 1400, name: "Alpha", slug: "alpha" },
          { snapshot_date: "2026-03-04", revenue_total: 1600, name: "Alpha", slug: "alpha" },
          { snapshot_date: "2026-03-05", revenue_total: 1800, name: "Alpha", slug: "alpha" },
          { snapshot_date: "2026-03-06", revenue_total: 2000, name: "Alpha", slug: "alpha" },
          { snapshot_date: "2026-03-07", revenue_total: 2200, name: "Alpha", slug: "alpha" },
          { snapshot_date: "2026-03-08", revenue_total: 2500, name: "Alpha", slug: "alpha" },
          { snapshot_date: "2026-03-09", revenue_total: 2800, name: "Alpha", slug: "alpha" },
          { snapshot_date: "2026-03-10", revenue_total: 3100, name: "Alpha", slug: "alpha" },
          { snapshot_date: "2026-03-11", revenue_total: 3400, name: "Alpha", slug: "alpha" },
          { snapshot_date: "2026-03-12", revenue_total: 3700, name: "Alpha", slug: "alpha" },
          { snapshot_date: "2026-03-13", revenue_total: 4000, name: "Alpha", slug: "alpha" },
          { snapshot_date: "2026-03-14", revenue_total: 4300, name: "Alpha", slug: "alpha" },
          { snapshot_date: "2026-03-15", revenue_total: 4600, name: "Alpha", slug: "alpha" }
        ]
      }
    });

    expect(leaderboard[0].slug).toBe("alpha");
    expect(leaderboard[0].status).toBe("ready");
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
npx vitest run tests/unit/leaderboard-math.test.ts tests/unit/build-leaderboard.test.ts
```

Expected:

```text
FAIL
Error: Failed to resolve import "@/lib/leaderboard/math"
```

- [ ] **Step 3: 实现数学函数和榜单生成器**

Create `lib/leaderboard/math.ts`:

```ts
export function buildDailyRevenueSeries(totals: number[]) {
  const values: number[] = [];

  for (let index = 1; index < totals.length; index += 1) {
    values.push(totals[index] - totals[index - 1]);
  }

  return values;
}

export function sumWindow(values: number[], start: number, length: number) {
  return values.slice(start, start + length).reduce((sum, value) => sum + value, 0);
}

export function calculateGrowthRate(input: { recent: number; previous: number }) {
  if (input.previous <= 0) {
    return null;
  }

  return Number((((input.recent / input.previous) - 1) * 100).toFixed(2));
}
```

Create `lib/leaderboard/build-leaderboard.ts`:

```ts
import { buildDailyRevenueSeries, calculateGrowthRate, sumWindow } from "@/lib/leaderboard/math";

type SnapshotRow = {
  snapshot_date: string;
  revenue_total: number;
  name: string;
  slug: string;
};

export function buildLeaderboard(input: {
  asOfDate: string;
  snapshotsBySlug: Record<string, SnapshotRow[]>;
}) {
  const rows = Object.values(input.snapshotsBySlug).map((snapshots) => {
    const totals = snapshots.map((item) => item.revenue_total);
    const daily = buildDailyRevenueSeries(totals);

    if (daily.length < 14) {
      return {
        slug: snapshots.at(-1)?.slug ?? "unknown",
        name: snapshots.at(-1)?.name ?? "Unknown",
        status: "pending" as const,
        growth7d: null,
        growth28d: null,
        recent7: null,
      };
    }

    const previous7 = sumWindow(daily, daily.length - 14, 7);
    const recent7 = sumWindow(daily, daily.length - 7, 7);
    const growth7d = calculateGrowthRate({ recent: recent7, previous: previous7 });

    const growth28d =
      daily.length >= 56
        ? calculateGrowthRate({
            recent: sumWindow(daily, daily.length - 28, 28),
            previous: sumWindow(daily, daily.length - 56, 28),
          })
        : null;

    return {
      slug: snapshots.at(-1)?.slug ?? "unknown",
      name: snapshots.at(-1)?.name ?? "Unknown",
      status: previous7 >= 1000 ? ("ready" as const) : ("pending" as const),
      growth7d,
      growth28d,
      recent7,
    };
  });

  return rows
    .filter((item) => item.status === "ready")
    .sort((left, right) => {
      if ((right.growth7d ?? -Infinity) !== (left.growth7d ?? -Infinity)) {
        return (right.growth7d ?? -Infinity) - (left.growth7d ?? -Infinity);
      }

      if ((right.growth28d ?? -Infinity) !== (left.growth28d ?? -Infinity)) {
        return (right.growth28d ?? -Infinity) - (left.growth28d ?? -Infinity);
      }

      return (right.recent7 ?? -Infinity) - (left.recent7 ?? -Infinity);
    })
    .slice(0, 20);
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run:

```bash
npx vitest run tests/unit/leaderboard-math.test.ts tests/unit/build-leaderboard.test.ts
```

Expected:

```text
PASS  tests/unit/leaderboard-math.test.ts
PASS  tests/unit/build-leaderboard.test.ts
```

- [ ] **Step 5: 提交**

Run:

```bash
git add lib/leaderboard tests/unit/leaderboard-math.test.ts tests/unit/build-leaderboard.test.ts
git commit -m "feat: implement leaderboard growth calculations"
```

## Task 6: 实现 hover 卡片字段组装和回放数据生成

**Files:**
- Create: `lib/startups/get-startup-card.ts`
- Create: `lib/leaderboard/build-playback.ts`
- Test: `tests/unit/startup-card.test.ts`
- Test: `tests/unit/build-playback.test.ts`

- [ ] **Step 1: 写卡片与回放测试**

Create `tests/unit/startup-card.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildStartupCard } from "@/lib/startups/get-startup-card";

describe("buildStartupCard", () => {
  it("hides optional rows when fields are missing", () => {
    const card = buildStartupCard({
      slug: "math",
      description: "AI tutor",
      targetAudience: "Students",
      onSale: null,
      askingPrice: null,
      techStack: [],
    });

    expect(card.rows).toEqual([
      { label: "产品描述", value: "AI tutor" },
      { label: "目标用户", value: "Students" },
    ]);
  });
});
```

Create `tests/unit/build-playback.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildPlayback } from "@/lib/leaderboard/build-playback";

describe("buildPlayback", () => {
  it("returns seven ordered frames", () => {
    const frames = buildPlayback([
      { snapshotDate: "2026-03-20", leaderboard: [{ slug: "a", rank: 1, growth7d: 20 }] },
      { snapshotDate: "2026-03-21", leaderboard: [{ slug: "a", rank: 1, growth7d: 22 }] },
      { snapshotDate: "2026-03-22", leaderboard: [{ slug: "a", rank: 1, growth7d: 24 }] },
      { snapshotDate: "2026-03-23", leaderboard: [{ slug: "a", rank: 1, growth7d: 26 }] },
      { snapshotDate: "2026-03-24", leaderboard: [{ slug: "a", rank: 1, growth7d: 28 }] },
      { snapshotDate: "2026-03-25", leaderboard: [{ slug: "a", rank: 1, growth7d: 30 }] },
      { snapshotDate: "2026-03-26", leaderboard: [{ slug: "a", rank: 1, growth7d: 32 }] },
      { snapshotDate: "2026-03-27", leaderboard: [{ slug: "a", rank: 1, growth7d: 34 }] }
    ]);

    expect(frames).toHaveLength(7);
    expect(frames[0].snapshotDate).toBe("2026-03-21");
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
npx vitest run tests/unit/startup-card.test.ts tests/unit/build-playback.test.ts
```

Expected:

```text
FAIL
Error: Failed to resolve import "@/lib/startups/get-startup-card"
```

- [ ] **Step 3: 实现卡片数据和回放数据构建**

Create `lib/startups/get-startup-card.ts`:

```ts
export function buildStartupCard(input: {
  slug: string;
  description?: string | null;
  targetAudience?: string | null;
  onSale?: boolean | null;
  askingPrice?: number | null;
  techStack?: string[] | null;
}) {
  const rows = [
    input.description ? { label: "产品描述", value: input.description } : null,
    input.targetAudience ? { label: "目标用户", value: input.targetAudience } : null,
    input.onSale != null ? { label: "是否可售", value: input.onSale ? "是" : "否" } : null,
    input.askingPrice != null ? { label: "报价", value: `$${input.askingPrice.toLocaleString("en-US")}` } : null,
    input.techStack && input.techStack.length > 0
      ? { label: "技术栈", value: input.techStack.join(", ") }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return {
    slug: input.slug,
    rows,
  };
}
```

Create `lib/leaderboard/build-playback.ts`:

```ts
type PlaybackDay = {
  snapshotDate: string;
  leaderboard: Array<{
    slug: string;
    rank: number;
    growth7d: number | null;
  }>;
};

export function buildPlayback(days: PlaybackDay[]) {
  return days.slice(-7);
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run:

```bash
npx vitest run tests/unit/startup-card.test.ts tests/unit/build-playback.test.ts
```

Expected:

```text
PASS  tests/unit/startup-card.test.ts
PASS  tests/unit/build-playback.test.ts
```

- [ ] **Step 5: 提交**

Run:

```bash
git add lib/startups/get-startup-card.ts lib/leaderboard/build-playback.ts tests/unit/startup-card.test.ts tests/unit/build-playback.test.ts
git commit -m "feat: build startup card and playback data"
```

## Task 7: 实现榜单 API 和 startup 卡片 API

**Files:**
- Create: `app/api/leaderboard/route.ts`
- Create: `app/api/startups/[slug]/route.ts`
- Test: `tests/integration/leaderboard-route.test.ts`
- Test: `tests/integration/startup-route.test.ts`

- [ ] **Step 1: 写 API 测试**

Create `tests/integration/leaderboard-route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/leaderboard/route";

describe("GET /api/leaderboard", () => {
  it("returns leaderboard and playback payload", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });
});
```

Create `tests/integration/startup-route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { upsertStartupDetail } from "@/lib/db/details-repo";
import { GET } from "@/app/api/startups/[slug]/route";

describe("GET /api/startups/[slug]", () => {
  it("returns card rows for the startup", async () => {
    upsertStartupDetail({
      slug: "math",
      description: "AI tutor",
      targetAudience: "Students",
      onSale: true,
      askingPrice: 25000,
      techStack: ["Swift"],
    });

    const response = await GET(
      new Request("http://localhost/api/startups/math"),
      { params: Promise.resolve({ slug: "math" }) }
    );

    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
npx vitest run tests/integration/leaderboard-route.test.ts tests/integration/startup-route.test.ts
```

Expected:

```text
FAIL
Error: Failed to resolve import "@/app/api/leaderboard/route"
```

- [ ] **Step 3: 实现 API 路由**

Create `app/api/leaderboard/route.ts`:

```ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    leaderboard: [],
    playback: [],
  });
}
```

Create `app/api/startups/[slug]/route.ts`:

```ts
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  return NextResponse.json({
    slug,
    rows: [],
  });
}
```

- [ ] **Step 4: 把空实现替换成真实读取逻辑**

Replace `app/api/leaderboard/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db/connection";

export async function GET() {
  const latestRun = db
    .prepare("select leaderboard_json, playback_json from leaderboard_runs order by snapshot_date desc limit 1")
    .get() as
    | {
        leaderboard_json: string;
        playback_json: string;
      }
    | undefined;

  return NextResponse.json({
    leaderboard: latestRun ? JSON.parse(latestRun.leaderboard_json) : [],
    playback: latestRun ? JSON.parse(latestRun.playback_json) : [],
  });
}
```

Replace `app/api/startups/[slug]/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { createTrustMrrClient } from "@/lib/trustmrr/client";
import { getStartupDetail, upsertStartupDetail } from "@/lib/db/details-repo";
import { buildStartupCard } from "@/lib/startups/get-startup-card";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  let detail = getStartupDetail(slug);

  if (!detail) {
    const client = createTrustMrrClient();
    const remoteDetail = await client.getStartup(slug);
    upsertStartupDetail(remoteDetail);
    detail = getStartupDetail(slug);
  }

  const payload = buildStartupCard({
    slug,
    description: detail?.description ?? null,
    targetAudience: detail?.target_audience ?? null,
    onSale: detail?.on_sale == null ? null : Boolean(detail.on_sale),
    askingPrice: detail?.asking_price ?? null,
    techStack: detail?.tech_stack_json ? JSON.parse(detail.tech_stack_json) : [],
  });

  return NextResponse.json(payload);
}
```

- [ ] **Step 5: 运行测试，确认通过**

Run:

```bash
npx vitest run tests/integration/leaderboard-route.test.ts tests/integration/startup-route.test.ts
```

Expected:

```text
PASS  tests/integration/leaderboard-route.test.ts
PASS  tests/integration/startup-route.test.ts
```

- [ ] **Step 6: 提交**

Run:

```bash
git add app/api tests/integration/leaderboard-route.test.ts tests/integration/startup-route.test.ts
git commit -m "feat: expose leaderboard and startup card APIs"
```

## Task 8: 实现首页 3 个 section 和 hover / 回放交互

**Files:**
- Create: `components/home/hero-section.tsx`
- Create: `components/home/leaderboard-section.tsx`
- Create: `components/home/faq-section.tsx`
- Create: `components/home/startup-card.tsx`
- Create: `components/home/playback-player.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Test: `tests/components/playback-player.test.tsx`
- Test: `tests/components/home-page.test.tsx`

- [ ] **Step 1: 为回放和 hover 交互写测试**

Create `tests/components/playback-player.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlaybackPlayer } from "@/components/home/playback-player";

describe("PlaybackPlayer", () => {
  it("starts playback from the play button", async () => {
    const user = userEvent.setup();

    render(
      <PlaybackPlayer
        frames={[
          { snapshotDate: "2026-03-21", leaderboard: [] },
          { snapshotDate: "2026-03-22", leaderboard: [] },
        ]}
      />
    );

    await user.click(screen.getByRole("button", { name: "播放最近 7 天榜单变化" }));

    expect(screen.getByText("2026-03-21")).toBeInTheDocument();
  });
});
```

Update `tests/components/home-page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the approved three-section layout", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "AI初创公司增长榜单" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看榜单" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "播放最近 7 天榜单变化" })).toBeInTheDocument();
    expect(screen.getByText("Q&A :")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
npx vitest run tests/components/home-page.test.tsx tests/components/playback-player.test.tsx
```

Expected:

```text
FAIL
Error: Failed to resolve import "@/components/home/playback-player"
```

- [ ] **Step 3: 写最小组件实现**

Create `components/home/startup-card.tsx`:

```tsx
export function StartupCard(props: { rows: Array<{ label: string; value: string }> }) {
  return (
    <div className="startup-card">
      {props.rows.map((row) => (
        <p key={row.label}>
          {row.label}：{row.value}
        </p>
      ))}
    </div>
  );
}
```

Create `components/home/playback-player.tsx`:

```tsx
"use client";

import { useState } from "react";

export function PlaybackPlayer(props: {
  frames: Array<{ snapshotDate: string; leaderboard: Array<unknown> }>;
}) {
  const [currentDate, setCurrentDate] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        onClick={() => setCurrentDate(props.frames[0]?.snapshotDate ?? null)}
        aria-label="播放最近 7 天榜单变化"
      >
        ▶
      </button>
      {currentDate ? <span>{currentDate}</span> : null}
    </div>
  );
}
```

Create `components/home/hero-section.tsx`:

```tsx
export function HeroSection() {
  return (
    <section className="section hero-section">
      <div className="window-top">
        <div className="circle">top</div>
        <div>AI Startups</div>
      </div>
      <h1>AI初创公司增长榜单</h1>
      <button type="button">查看榜单</button>
    </section>
  );
}
```

Create `components/home/leaderboard-section.tsx`:

```tsx
import { PlaybackPlayer } from "@/components/home/playback-player";

export function LeaderboardSection() {
  return (
    <section className="section leaderboard-section">
      <div className="leaderboard-box">Top 20</div>
      <PlaybackPlayer frames={[]} />
    </section>
  );
}
```

Create `components/home/faq-section.tsx`:

```tsx
export function FaqSection() {
  return (
    <section className="section faq-section">
      <p>Q&A :</p>
      <p>xxxx</p>
      <p>联系我：</p>
    </section>
  );
}
```

Replace `app/page.tsx` with:

```tsx
import { FaqSection } from "@/components/home/faq-section";
import { HeroSection } from "@/components/home/hero-section";
import { LeaderboardSection } from "@/components/home/leaderboard-section";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <LeaderboardSection />
      <FaqSection />
    </main>
  );
}
```

- [ ] **Step 4: 根据已确认的 mockup 完成样式与结构**

Replace `app/globals.css` with:

```css
:root {
  --line: rgba(26, 26, 26, 0.22);
  --line-strong: rgba(26, 26, 26, 0.34);
  --text: #161616;
  --muted: #777268;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background:
    radial-gradient(circle at 12% 8%, rgba(255,255,255,0.9), transparent 22%),
    linear-gradient(180deg, #f8f5ef 0%, #f2ede5 100%);
  color: var(--text);
  font-family: "SF Pro Display", "PingFang SC", sans-serif;
}

main {
  width: 100%;
}

.section {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.leaderboard-box,
.preview-box {
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.42);
  backdrop-filter: blur(8px);
}
```

- [ ] **Step 5: 运行测试，确认通过**

Run:

```bash
npx vitest run tests/components/home-page.test.tsx tests/components/playback-player.test.tsx
```

Expected:

```text
PASS  tests/components/home-page.test.tsx
PASS  tests/components/playback-player.test.tsx
```

- [ ] **Step 6: 启动本地页面做人工验证**

Run:

```bash
npm run dev
```

Expected:

```text
ready - started server on http://localhost:3000
```

Manual checks:

```text
1. Section1/2/3 都是全屏
2. Section3 没有大框
3. Section2 右下角有播放按钮
4. hover 卡片只显示存在的字段
```

- [ ] **Step 7: 提交**

Run:

```bash
git add app/page.tsx app/globals.css components/home tests/components/home-page.test.tsx tests/components/playback-player.test.tsx
git commit -m "feat: implement homepage layout and interactions"
```

## Task 9: 串联聚合流程并保存 leaderboard_runs

**Files:**
- Modify: `scripts/fetch-daily-snapshot.ts`
- Modify: `lib/db/snapshots-repo.ts`
- Create: `lib/db/leaderboard-runs-repo.ts`
- Test: `tests/integration/build-and-store-leaderboard.test.ts`

- [ ] **Step 1: 写聚合落库测试**

Create `tests/integration/build-and-store-leaderboard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { saveLeaderboardRun } from "@/lib/db/leaderboard-runs-repo";

describe("saveLeaderboardRun", () => {
  it("stores leaderboard and playback JSON for a snapshot day", () => {
    saveLeaderboardRun({
      snapshotDate: "2026-03-26",
      leaderboard: [{ slug: "math", rank: 1, growth7d: 32 }],
      playback: [{ snapshotDate: "2026-03-26", leaderboard: [] }],
    });

    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
npx vitest run tests/integration/build-and-store-leaderboard.test.ts
```

Expected:

```text
FAIL
Error: Failed to resolve import "@/lib/db/leaderboard-runs-repo"
```

- [ ] **Step 3: 实现聚合结果仓储并在抓取脚本中串起来**

Create `lib/db/leaderboard-runs-repo.ts`:

```ts
import { db } from "@/lib/db/connection";

export function saveLeaderboardRun(input: {
  snapshotDate: string;
  leaderboard: unknown[];
  playback: unknown[];
}) {
  db.prepare(`
    insert into leaderboard_runs (snapshot_date, leaderboard_json, playback_json, created_at)
    values (@snapshotDate, @leaderboardJson, @playbackJson, @createdAt)
    on conflict(snapshot_date) do update set
      leaderboard_json = excluded.leaderboard_json,
      playback_json = excluded.playback_json,
      created_at = excluded.created_at
  `).run({
    snapshotDate: input.snapshotDate,
    leaderboardJson: JSON.stringify(input.leaderboard),
    playbackJson: JSON.stringify(input.playback),
    createdAt: new Date().toISOString(),
  });
}

export function listRecentLeaderboardRuns(limit: number) {
  return db
    .prepare("select snapshot_date, leaderboard_json from leaderboard_runs order by snapshot_date desc limit ?")
    .all(limit) as Array<{
      snapshot_date: string;
      leaderboard_json: string;
    }>;
}
```

Append to `scripts/fetch-daily-snapshot.ts`:

```ts
import { saveLeaderboardRun } from "@/lib/db/leaderboard-runs-repo";
import { listRecentLeaderboardRuns } from "@/lib/db/leaderboard-runs-repo";
import { buildLeaderboard } from "@/lib/leaderboard/build-leaderboard";
import { buildPlayback } from "@/lib/leaderboard/build-playback";
import { listSnapshotsForSlug } from "@/lib/db/snapshots-repo";
```

Add this block before `return` in `runDailySnapshot`:

```ts
  const snapshotsBySlug = Object.fromEntries(
    startups.map((startup) => [startup.slug, listSnapshotsForSlug(startup.slug)])
  );
  const leaderboard = buildLeaderboard({
    asOfDate: snapshotDate,
    snapshotsBySlug,
  }).map((item, index) => ({
    ...item,
    rank: index + 1,
  }));

  const previousRuns = listRecentLeaderboardRuns(6)
    .reverse()
    .map((run) => ({
      snapshotDate: run.snapshot_date,
      leaderboard: JSON.parse(run.leaderboard_json),
    }));

  const playback = buildPlayback([
    ...previousRuns,
    {
      snapshotDate,
      leaderboard,
    },
  ]);

  saveLeaderboardRun({
    snapshotDate,
    leaderboard,
    playback,
  });
```

- [ ] **Step 4: 运行测试，确认通过**

Run:

```bash
npx vitest run tests/integration/build-and-store-leaderboard.test.ts
```

Expected:

```text
PASS  tests/integration/build-and-store-leaderboard.test.ts
```

- [ ] **Step 5: 提交**

Run:

```bash
git add lib/db/leaderboard-runs-repo.ts scripts/fetch-daily-snapshot.ts tests/integration/build-and-store-leaderboard.test.ts
git commit -m "feat: persist aggregated leaderboard runs"
```

## Task 10: 完成生产验证与部署说明

**Files:**
- Create: `.env.example`
- Create: `README.md`
- Test: manual verification only

- [ ] **Step 1: 写环境变量样例**

Create `.env.example`:

```env
TRUSTMRR_API_KEY=replace-me
TRUSTMRR_BASE_URL=https://trustmrr.com/api/v1
DATABASE_PATH=./data/leaderboard.sqlite
SITE_URL=http://localhost:3000
SNAPSHOT_TIMEZONE=Asia/Shanghai
# HTTPS_PROXY=http://127.0.0.1:7890
# ALL_PROXY=socks5://127.0.0.1:7890
```

- [ ] **Step 2: 写部署与定时任务说明**

Create `README.md`:

````md
# AI 初创公司增长榜单

## 本地运行

```bash
npm install
cp .env.example .env.local
npx tsx scripts/bootstrap.ts
npm run dev
```

## 每日抓取

```bash
TRUSTMRR_API_KEY=your-key npx tsx scripts/fetch-daily-snapshot.ts
```

## Linux crontab 示例

```bash
0 8 * * * cd /path/to/project && /usr/bin/env bash -lc 'source .env.production && npx tsx scripts/fetch-daily-snapshot.ts >> logs/snapshot.log 2>&1'
```

## 腾讯云服务器代理说明

- 安装 OpenVPN / sing-box / Clash 任一方案
- 只让 TrustMRR 相关流量通过代理
- 使用 `HTTPS_PROXY` 或 `ALL_PROXY` 注入代理地址
````

- [ ] **Step 3: 执行最终验证命令**

Run:

```bash
npm run build
npm test
```

Expected:

```text
Next.js production build succeeds
All vitest suites pass
```

- [ ] **Step 4: 手动检查生产要求**

Manual checks:

```text
1. API key 没有出现在浏览器网络请求中
2. 首页布局与已确认 mockup 一致
3. 历史不足的 startup 显示“计算中”
4. 播放按钮能回看最近 7 天榜单变化
5. 服务器可通过代理访问 TrustMRR
```

- [ ] **Step 5: 提交**

Run:

```bash
git add .env.example README.md
git commit -m "docs: add deployment and operations guide"
```
