import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return Response.json({ error: "No disponible." }, { status: 404 });
  }

  const databaseUrl = process.env.SUPABASE_DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "hotel-asael-evidencias";
  if (!databaseUrl || !supabaseUrl || !secretKey) {
    return Response.json({ ok: false, database: false, storage: false }, { status: 503 });
  }

  let database = false;
  let storage = false;
  let publicTables = 0;
  const sql = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 15 });
  try {
    const rows = await sql<{ total: number }[]>`
      select count(*)::int as total
      from information_schema.tables
      where table_schema = 'public'
    `;
    database = true;
    publicTables = rows[0]?.total || 0;
  } catch (error) {
    console.error("Preview database health check failed", error);
  } finally {
    await sql.end();
  }

  try {
    const supabase = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.storage.from(bucket).list("", { limit: 1 });
    if (error) throw error;
    storage = true;
  } catch (error) {
    console.error("Preview storage health check failed", error);
  }

  const ok = database && storage;
  return Response.json({ ok, database, storage, publicTables }, { status: ok ? 200 : 503 });
}
