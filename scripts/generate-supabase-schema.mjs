import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const sourcePath = resolve(projectRoot, "db/schema.ts");
const targetPath = resolve(projectRoot, "db/schema.supabase.ts");

const source = await readFile(sourcePath, "utf8");

const transformed = source
  .replace(
    'import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";',
    'import { boolean, index, integer, pgTable, serial, text } from "drizzle-orm/pg-core";',
  )
  .replaceAll("sqliteTable(", "pgTable(")
  .replace(
    /integer\(("[^"]+")\)\.primaryKey\(\{ autoIncrement: true \}\)/g,
    "serial($1).primaryKey()",
  )
  .replace(
    /integer\(("[^"]+"), \{ mode: "boolean" \}\)/g,
    "boolean($1)",
  );

if (transformed === source) {
  throw new Error("No se detectaron construcciones SQLite para convertir.");
}

if (/sqliteTable|sqlite-core|autoIncrement|mode: "boolean"/.test(transformed)) {
  throw new Error("La conversión dejó construcciones exclusivas de SQLite.");
}

const output = [
  "// Archivo generado desde db/schema.ts.",
  "// Ejecuta `npm run db:generate:supabase` después de cambiar el esquema D1.",
  transformed,
].join("\n");

await mkdir(dirname(targetPath), { recursive: true });
await writeFile(targetPath, output, "utf8");
console.log(`Esquema PostgreSQL generado en ${targetPath}`);