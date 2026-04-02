import type Database from "better-sqlite3";

import type { TrustMrrStartupDetail } from "../trustmrr/types";
import { getDatabase } from "./connection";

type StartupDetailsRow = {
  slug: string;
  description: string | null;
  target_audience: string | null;
  on_sale: number | null;
  asking_price: string | null;
  tech_stack_json: string | null;
  updated_at: string;
};

export type StartupDetailRecord = {
  slug: string;
  description: string | null;
  targetAudience: string | null;
  onSale: boolean | null;
  askingPrice: string | null;
  techStack: string[];
  updatedAt: string;
};

function mapRow(row: StartupDetailsRow): StartupDetailRecord {
  return {
    slug: row.slug,
    description: row.description,
    targetAudience: row.target_audience,
    onSale: row.on_sale == null ? null : Boolean(row.on_sale),
    askingPrice: row.asking_price,
    techStack: row.tech_stack_json ? (JSON.parse(row.tech_stack_json) as string[]) : [],
    updatedAt: row.updated_at,
  };
}

export function upsertStartupDetail(
  detail: TrustMrrStartupDetail,
  database: Database.Database = getDatabase(),
) {
  database
    .prepare(
      `
        insert into startup_details (
          slug,
          description,
          target_audience,
          on_sale,
          asking_price,
          tech_stack_json,
          updated_at
        )
        values (
          @slug,
          @description,
          @targetAudience,
          @onSale,
          @askingPrice,
          @techStackJson,
          @updatedAt
        )
        on conflict(slug) do update set
          description = excluded.description,
          target_audience = excluded.target_audience,
          on_sale = excluded.on_sale,
          asking_price = excluded.asking_price,
          tech_stack_json = excluded.tech_stack_json,
          updated_at = excluded.updated_at
      `,
    )
    .run({
      slug: detail.slug,
      description: detail.description ?? null,
      targetAudience: detail.targetAudience ?? null,
      onSale: detail.onSale == null ? null : Number(detail.onSale),
      askingPrice: detail.askingPrice == null ? null : String(detail.askingPrice),
      techStackJson: JSON.stringify(detail.techStack ?? []),
      updatedAt: new Date().toISOString(),
    });
}

export function getStartupDetailBySlug(
  slug: string,
  database: Database.Database = getDatabase(),
) {
  const row = database
    .prepare("select * from startup_details where slug = ?")
    .get(slug) as StartupDetailsRow | undefined;

  return row ? mapRow(row) : undefined;
}
