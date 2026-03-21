#!/usr/bin/env node
"use strict";

require("dotenv").config({ quiet: true });

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

const explicitDatabaseUrl =
  argValue("database-url") ||
  process.env.COUNT_DATABASE_URL ||
  process.env.BACKUP_DATABASE_URL;

if (explicitDatabaseUrl) {
  process.env.DIRECT_DATABASE_URL = explicitDatabaseUrl;
  process.env.DATABASE_URL = explicitDatabaseUrl;
}

const { prisma } = require("../src/prisma");

async function listPublicTables(db) {
  const rows = await db.$queryRaw`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `;

  return rows.map((row) => String(row.tablename));
}

async function main() {
  try {
    const tables = await listPublicTables(prisma);
    const counts = {};
    let totalRows = 0;

    for (const table of tables) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS count FROM "public".${quoteIdent(table)}`
      );
      const count = Number(rows?.[0]?.count || 0);
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
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[count] ERROR:", error?.message || error);
  process.exit(1);
});
