import type Database from "better-sqlite3";

import { getDatabase } from "./connection";
import { schemaSql } from "./schema";

export function migrate(database: Database.Database = getDatabase()) {
  database.exec(schemaSql);
}
