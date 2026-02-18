#!/usr/bin/env node
"use strict";

const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config();

function argValue(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      env,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} finalizo con codigo ${code}`));
    });
  });
}

async function main() {
  const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DIRECT_DATABASE_URL o DATABASE_URL no definido");
  }

  const fileArg = argValue("--file");
  if (!fileArg) {
    throw new Error("Uso: npm run db:restore -- --file <ruta_backup.dump|ruta.sql>");
  }

  const filePath = path.resolve(fileArg);
  const isSql = filePath.toLowerCase().endsWith(".sql");
  const clean = hasFlag("--clean");

  if (isSql) {
    console.log(`[restore] restaurando SQL: ${filePath}`);
    await run("psql", ["-d", databaseUrl, "-f", filePath], process.env);
    console.log("[restore] OK");
    return;
  }

  const args = [
    "--no-owner",
    "--no-privileges",
    ...(clean ? ["--clean", "--if-exists"] : []),
    "--dbname",
    databaseUrl,
    filePath,
  ];

  console.log(`[restore] restaurando dump: ${filePath}`);
  await run("pg_restore", args, process.env);
  console.log("[restore] OK");
}

main().catch((err) => {
  console.error(`[restore] ERROR: ${err.message}`);
  process.exit(1);
});
