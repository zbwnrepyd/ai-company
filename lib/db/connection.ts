import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { getEnv } from "../env";

let cachedConnection:
  | {
      databasePath: string;
      database: Database.Database;
    }
  | undefined;

function resolveDatabasePath(databasePath?: string) {
  const configuredPath = databasePath ?? getEnv().DATABASE_PATH;

  if (configuredPath === ":memory:") {
    return configuredPath;
  }

  return path.resolve(configuredPath);
}

export function getDatabase(databasePath?: string) {
  const resolvedPath = resolveDatabasePath(databasePath);

  if (cachedConnection && cachedConnection.databasePath === resolvedPath) {
    return cachedConnection.database;
  }

  closeDatabase();

  if (resolvedPath !== ":memory:") {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  }

  const database = new Database(resolvedPath);
  cachedConnection = {
    databasePath: resolvedPath,
    database,
  };

  return database;
}

export function closeDatabase() {
  if (!cachedConnection) {
    return;
  }

  cachedConnection.database.close();
  cachedConnection = undefined;
}
