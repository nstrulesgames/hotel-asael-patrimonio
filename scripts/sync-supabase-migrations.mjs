import { copyFile, mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const drizzleDirectory = resolve(projectRoot, "supabase/drizzle");
const migrationDirectory = resolve(projectRoot, "supabase/migrations");
const entries = (await readdir(drizzleDirectory)).filter((name) => name.endsWith(".sql"));

if (entries.length !== 1) {
  throw new Error(`Se esperaba una migración base de Drizzle y se encontraron ${entries.length}.`);
}

await mkdir(migrationDirectory, { recursive: true });
const source = resolve(drizzleDirectory, entries[0]);
const target = resolve(migrationDirectory, "202608250000_initial_schema.sql");
await copyFile(source, target);
console.log(`Migración base sincronizada en ${target}`);