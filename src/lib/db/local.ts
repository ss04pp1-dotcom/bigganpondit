// Local SQLite adapter that implements the D1 API surface.
// Runtime resolution order: bun:sqlite -> node:sqlite -> better-sqlite3.
// Used automatically when Cloudflare D1 bindings are not present (local dev).

import path from "node:path";
import fs from "node:fs";
import type {
  D1Database,
  D1PreparedStatement,
  D1Result,
} from "./types";

interface SqliteStatement {
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
}

interface SqliteDatabase {
  prepare(sql: string): SqliteStatement;
  exec(sql: string): unknown;
  close?(): unknown;
}

let cachedRaw: SqliteDatabase | null = null;

async function openLocalSqlite(): Promise<SqliteDatabase> {
  if (cachedRaw) return cachedRaw;

  const dbDir = path.join(process.cwd(), "db");
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, "academy.db");

  // Dynamic import helper that bypasses bundler static analysis (Turbopack/esbuild)
  const dynamicImport = (name: string): Promise<any> => {
    try {
      const fn = new Function("n", "return import(n)");
      return fn(name);
    } catch {
      return Promise.reject(new Error("Dynamic import unsupported"));
    }
  };

  // 1) Bun built-in SQLite
  try {
    if (typeof (globalThis as any).Bun !== "undefined") {
      const mod: any = await dynamicImport("bun:sqlite");
      const raw: SqliteDatabase = new mod.Database(dbPath);
      raw.exec("PRAGMA foreign_keys = ON");
      raw.exec("PRAGMA journal_mode = WAL");
      cachedRaw = raw;
      return raw;
    }
  } catch {
    /* not on bun */
  }

  // 2) Node built-in SQLite (node:sqlite, Node >= 22.5)
  try {
    const mod: any = await dynamicImport("node:sqlite");
    const raw: SqliteDatabase = new mod.DatabaseSync(dbPath);
    raw.exec("PRAGMA foreign_keys = ON");
    raw.exec("PRAGMA journal_mode = WAL");
    cachedRaw = raw;
    return raw;
  } catch {
    /* not on node >= 22.5 */
  }

  // 3) better-sqlite3 fallback
  try {
    const mod: any = await dynamicImport("better-sqlite3");
    const raw: SqliteDatabase = new mod.default(dbPath);
    raw.exec("PRAGMA foreign_keys = ON");
    raw.exec("PRAGMA journal_mode = WAL");
    cachedRaw = raw;
    return raw;
  } catch {
    /* not installed */
  }

  throw new Error(
    "No SQLite runtime found. Run the dev server with bun (bun run dev) or Node >= 22.5."
  );
}

class LocalStatement implements D1PreparedStatement {
  constructor(
    private raw: SqliteDatabase,
    private sql: string,
    private params: unknown[]
  ) {}

  /** Loud failure when a placeholder is left un-bound (never silent). */
  private assertBound(): void {
    const expected = (this.sql.match(/\?/g) || []).length;
    if (expected > this.params.length) {
      throw new Error(
        `Missing bind parameters for query (${expected} placeholders, ${this.params.length} bound): ${this.sql.slice(0, 80)}`
      );
    }
  }

  bind(...values: unknown[]): D1PreparedStatement {
    return new LocalStatement(this.raw, this.sql, values);
  }

  async first<T = unknown>(): Promise<T | null> {
    this.assertBound();
    const stmt = this.raw.prepare(this.sql);
    const row = stmt.get(...this.params) ?? null;
    return row as T | null;
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    this.assertBound();
    const stmt = this.raw.prepare(this.sql);
    const results = stmt.all(...this.params) ?? [];
    return { results: results as T[], success: true, meta: {} };
  }

  async run<T = unknown>(): Promise<D1Result<T>> {
    return this.syncRun<T>();
  }

  /**
   * Synchronous execution — used by the local batch so that a whole
   * transaction runs in a single task without yielding to other requests
   * sharing the connection.
   */
  syncRun<T = unknown>(): D1Result<T> {
    this.assertBound();
    const stmt = this.raw.prepare(this.sql);
    const info = stmt.run(...this.params);
    return {
      results: [],
      success: true,
      meta: {
        changes: Number(info.changes ?? 0),
        last_row_id: Number(info.lastInsertRowid ?? 0),
      },
    };
  }
}

/** Wrap a raw local SQLite connection behind the D1 API. */
export function wrapLocalSqlite(raw: SqliteDatabase): D1Database {
  const db: D1Database = {
    prepare(sql: string) {
      return new LocalStatement(raw, sql, []);
    },
    // NOTE: no awaits inside — the transaction runs atomically in one task.
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      raw.exec("BEGIN");
      try {
        const out: D1Result<T>[] = [];
        for (const st of statements) {
          if (st instanceof LocalStatement) {
            out.push(st.syncRun());
          } else {
            out.push(await st.run());
          }
        }
        raw.exec("COMMIT");
        return out;
      } catch (e) {
        try {
          raw.exec("ROLLBACK");
        } catch {
          /* already rolled back */
        }
        throw e;
      }
    },
    async exec(sql: string) {
      raw.exec(sql);
      return { results: [], success: true, meta: {} };
    },
  };
  return db;
}

export async function getLocalD1(): Promise<D1Database> {
  const raw = await openLocalSqlite();
  return wrapLocalSqlite(raw);
}
