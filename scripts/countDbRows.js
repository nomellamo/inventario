#!/usr/bin/env node
"use strict";

require("dotenv").config({ quiet: true });

const { Pool } = require("pg");

function argValue(name, fallback = undefined) {
  const prefix = `--${name}=`;
  const exact = process.argv.find((arg) => arg.startsWith(prefix));
  if (exact) return exact.slice(prefix.length);

  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    const next = process.argv[idx + 1];
    if (!String(next).startsWith("--")) return next;
  }

  return fallback;
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function resolveDatabaseUrl() {
  return (
    argValue("database-url") ||
    process.env.COUNT_DATABASE_URL ||
    process.env.BACKUP_DATABASE_URL ||
    process.env.DIRECT_DATABASE_URL ||
    process.env.DATABASE_URL
  );
}

async function main() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "Falta COUNT_DATABASE_URL, BACKUP_DATABASE_URL, DIRECT_DATABASE_URL o DATABASE_URL en .env"
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
  });

  try {
    const tablesResult = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> '_prisma_migrations'
      ORDER BY tablename
    `);

    const tables = tablesResult.rows.map((row) => String(row.tablename));
    const counts = {};
    let totalRows = 0;

    for (const table of tables) {
      const result = await pool.query(
        `SELECT COUNT(*)::int AS count FROM "public".${quoteIdent(table)}`
      );
      const count = Number(result.rows?.[0]?.count || 0);
      counts[table] = count;
      totalRows += count;
    }

    if (process.argv.includes("--json")) {
      console.log(
        JSON.stringify(
          {
            ok: true,
            totalRows,
            tables: tables.length,
            counts,
          },
          null,
          2
        )
      );
      return;
    }

    if (process.argv.includes("--total-only")) {
      console.log(String(totalRows));
      return;
    }

    console.table(counts);
    console.log(`Total rows: ${totalRows}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[count] ERROR:", error?.message || error);
  process.exit(1);
});
