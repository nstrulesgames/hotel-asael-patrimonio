import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = resolve(import.meta.dirname, "..");
const migrationPaths = [
  resolve(root, "supabase/migrations/202608250000_initial_schema.sql"),
  resolve(root, "supabase/migrations/202608250001_security_and_integrity.sql"),
  resolve(root, "supabase/migrations/202608250002_foreign_key_indexes.sql"),
];

const db = new PGlite();

async function one(sql) {
  const result = await db.query(sql);
  return result.rows[0];
}

try {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema storage;
    create table storage.buckets (
      id text primary key,
      name text not null,
      public boolean default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
  `);

  for (const path of migrationPaths) {
    await db.exec(await readFile(path, "utf8"));
  }

  const { table_count: tableCount } = await one(`
    select count(*)::int as table_count
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  `);
  const { rls_count: rlsCount } = await one(`
    select count(*)::int as rls_count
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  `);
  const { foreign_key_count: foreignKeyCount } = await one(`
    select count(*)::int as foreign_key_count
    from information_schema.table_constraints
    where table_schema = 'public' and constraint_type = 'FOREIGN KEY'
  `);
  const { direct_grant_count: directGrantCount } = await one(`
    select count(*)::int as direct_grant_count
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated')
  `);
  const { distribution_total: distributionTotal } = await one(`
    select coalesce(sum(percentage), 0)::int as distribution_total
    from public.patrimony_distribution
  `);
  const { location_count: locationCount } = await one(`
    select count(*)::int as location_count from public.stock_locations
  `);
  const { bucket_count: bucketCount } = await one(`
    select count(*)::int as bucket_count
    from storage.buckets
    where id = 'hotel-asael-evidencias' and public = false
  `);

  const assertions = [
    [tableCount === 44, `tablas esperadas: 44; obtenidas: ${tableCount}`],
    [rlsCount === 44, `tablas con RLS esperadas: 44; obtenidas: ${rlsCount}`],
    [foreignKeyCount >= 100, `relaciones esperadas: al menos 100; obtenidas: ${foreignKeyCount}`],
    [directGrantCount === 0, `permisos directos anon/authenticated: ${directGrantCount}`],
    [distributionTotal === 100, `distribución esperada: 100; obtenida: ${distributionTotal}`],
    [locationCount === 2, `ubicaciones esperadas: 2; obtenidas: ${locationCount}`],
    [bucketCount === 1, `bucket privado esperado: 1; obtenido: ${bucketCount}`],
  ];

  for (const [valid, message] of assertions) {
    if (!valid) throw new Error(String(message));
  }

  let invalidDistributionRejected = false;
  try {
    await db.exec(`update public.patrimony_distribution set percentage = 14 where code = 'FAMILIAR_1'`);
  } catch {
    invalidDistributionRejected = true;
  }
  if (!invalidDistributionRejected) {
    throw new Error("La base aceptó una distribución patrimonial distinta de 100%.");
  }

  console.log(
    `Migraciones válidas: ${tableCount} tablas, ${foreignKeyCount} relaciones, ${rlsCount} tablas con RLS.`,
  );
} finally {
  await db.close();
}