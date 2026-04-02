declare module "better-sqlite3" {
  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  interface Statement {
    run(parameters?: unknown): RunResult;
    get<T = unknown>(...parameters: unknown[]): T | undefined;
    all<T = unknown>(...parameters: unknown[]): T[];
  }

  interface Transaction<TArgs extends unknown[]> {
    (...args: TArgs): void;
  }

  class Database {
    constructor(filename: string);
    exec(sql: string): this;
    close(): void;
    prepare(sql: string): Statement;
    transaction<TArgs extends unknown[]>(fn: (...args: TArgs) => void): Transaction<TArgs>;
  }

  namespace Database {
    export { Database };
  }

  export default Database;
}
