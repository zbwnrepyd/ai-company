import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { closeDatabase } from "../../lib/db/connection";
import { migrate } from "../../lib/db/migrate";

function slugify(input: string) {
  return input.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

export function initTestDatabase(name: string) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ai-startups-"));
  const databasePath = path.join(directory, `${slugify(name) || "test"}.sqlite`);

  process.env.DATABASE_PATH = databasePath;
  closeDatabase();
  migrate();

  return databasePath;
}

export function cleanupTestDatabase() {
  closeDatabase();
}
