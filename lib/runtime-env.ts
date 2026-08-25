import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminConfig } from "@/db/supabase-admin";

const booleanColumns = new Set(["active", "blocks_room", "capacity_override", "identification_pending", "is_minor", "is_primary", "required_evidence", "returns_to_stock", "tracks_expiry"]);
const idTables = new Set(["users", "user_access_events", "floors", "rooms", "guests", "stays", "stay_room_segments", "stay_guests", "primary_guest_transfers", "exit_assessments", "exceptional_exit_requests", "room_events", "contracts", "documents", "inventory_items", "room_infrastructure_items", "inventory_movements", "inspections", "inspection_items", "room_turnovers", "work_orders", "work_order_history", "change_requests", "audit_logs", "commercial_products", "stock_locations", "stock_batches", "stock_movements", "cash_sessions", "sales", "sale_items", "sale_payments", "sale_returns", "sale_return_items", "payment_evidences", "replenishment_requests", "patrimony_properties", "patrimony_tenants", "patrimony_payments", "patrimony_expenses"]);

type QueryResult<T> = { results: T[]; success: boolean; meta: { changes: number; last_row_id?: number } };
type Executor = { unsafe: (query: string, params?: unknown[]) => Promise<unknown[]> };

let client: ReturnType<typeof postgres> | null = null;
function postgresClient() {
  const url = (process.env.SUPABASE_DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL)?.trim();
  if (!url) throw new Error("Falta configurar SUPABASE_DATABASE_URL (o POSTGRES_URL) con el pooler de Supabase.");
  client ??= postgres(url, { max: 1, idle_timeout: 5, connect_timeout: 15, prepare: false });
  return client;
}

function questionIndexes(text: string) {
  const indexes: number[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "'" && text[i - 1] !== "\\") quoted = !quoted;
    else if (!quoted && text[i] === "?") indexes.push(i);
  }
  return indexes;
}

function normalizeBooleanParams(text: string, params: unknown[]) {
  const indexes = questionIndexes(text);
  const converted = [...params];
  indexes.forEach((position, parameterIndex) => {
    const before = text.slice(0, position);
    const assignment = before.match(/([a-z_]+)\s*=\s*$/i)?.[1]?.toLowerCase();
    if (assignment && booleanColumns.has(assignment) && converted[parameterIndex] !== null) converted[parameterIndex] = Boolean(converted[parameterIndex]);
  });
  const insert = text.match(/^\s*INSERT(?:\s+OR\s+IGNORE)?\s+INTO\s+[a-z_]+\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (insert) {
    const columns = insert[1].split(",").map((value) => value.trim().replaceAll('"', "").toLowerCase());
    const values = insert[2].split(",").map((value) => value.trim());
    let parameterIndex = 0;
    values.forEach((value, valueIndex) => {
      if (value === "?") {
        if (booleanColumns.has(columns[valueIndex]) && converted[parameterIndex] !== null) converted[parameterIndex] = Boolean(converted[parameterIndex]);
        parameterIndex++;
      }
    });
  }
  return converted;
}

function translateSql(original: string, params: unknown[], returnId: boolean) {
  let text = original.trim();
  // Production uses the versioned Supabase migrations. Runtime schema checks are
  // retained for the legacy SQLite adapter, so PostgreSQL must ignore their DDL.
  if (/^(CREATE\s+(TABLE|INDEX)|ALTER\s+TABLE|PRAGMA\b)/i.test(text)) return { skip: true, text, params };
  const insertTable = text.match(/^INSERT(?:\s+OR\s+IGNORE)?\s+INTO\s+([a-z_]+)/i)?.[1]?.toLowerCase();
  const ignore = /^INSERT\s+OR\s+IGNORE/i.test(text);
  text = text.replace(/^INSERT\s+OR\s+IGNORE/i, "INSERT");
  const valuesMatch = text.match(/^(\s*INSERT\s+INTO\s+[a-z_]+\s*\()([^)]+)(\)\s*VALUES\s*\()([^)]+)(\).*)$/i);
  if (valuesMatch) {
    const columns = valuesMatch[2].split(",").map((value) => value.trim().replaceAll('"', "").toLowerCase());
    const values = valuesMatch[4].split(",").map((value) => value.trim());
    columns.forEach((column, index) => {
      if (booleanColumns.has(column) && values[index] === "1") values[index] = "TRUE";
      if (booleanColumns.has(column) && values[index] === "0") values[index] = "FALSE";
    });
    text = `${valuesMatch[1]}${valuesMatch[2]}${valuesMatch[3]}${values.join(", ")}${valuesMatch[5]}`;
  }
  text = text.replace(/\s+COLLATE\s+NOCASE/gi, "");
  for (const column of booleanColumns) {
    text = text.replace(new RegExp(`\\b${column}\\s*=\\s*1\\b`, "gi"), `${column} IS TRUE`);
    text = text.replace(new RegExp(`\\b${column}\\s*=\\s*0\\b`, "gi"), `${column} IS FALSE`);
  }
  text = text.replace(/SUM\(MAX\(0,/gi, "SUM(GREATEST(0,");
  text = text.replace(/strftime\('%Y-%m',\s*([^)]+)\)/gi, "to_char(($1)::timestamptz, 'YYYY-MM')");
  text = text.replace(/datetime\('now',\s*'\+1 day'\)/gi, "(CURRENT_TIMESTAMP + INTERVAL '1 day')");
  text = text.replace(/datetime\('now'\)/gi, "CURRENT_TIMESTAMP");
  text = text.replace(/datetime\(([^,)]+),\s*'\+1 day'\)/gi, "(($1)::timestamptz + INTERVAL '1 day')");
  text = text.replace(/datetime\(([^)]+)\)/gi, "($1)::timestamptz");
  text = text.replace(/date\('now',\s*'\+30 days'\)/gi, "(CURRENT_DATE + INTERVAL '30 days')::date");
  text = text.replace(/date\('now',\s*'\+7 days'\)/gi, "(CURRENT_DATE + INTERVAL '7 days')::date");
  text = text.replace(/date\('now',\s*'-6 days'\)/gi, "(CURRENT_DATE - INTERVAL '6 days')::date");
  text = text.replace(/date\('now'\)/gi, "CURRENT_DATE");
  text = text.replace(/date\(\?\)/gi, "CAST(? AS date)");
  text = text.replace(/date\(([^)]+)\)/gi, "($1)::date");
  text = text.replace(/CAST\(julianday\('now'\)\s*-\s*julianday\(([^)]+)\)\s+AS\s+INTEGER\)/gi, "FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ($1)::timestamptz)) / 86400)::integer");
  text = text.replace(/julianday\('now'\)\s*-\s*julianday\(([^)]+)\)/gi, "EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ($1)::timestamptz)) / 86400");
  if (ignore) text += " ON CONFLICT DO NOTHING";
  if (returnId && insertTable && idTables.has(insertTable) && !/\bRETURNING\b/i.test(text)) text += " RETURNING id";
  let counter = 0;
  text = text.replace(/\?/g, () => `$${++counter}`);
  return { skip: false, text, params: normalizeBooleanParams(original, params) };
}

class PreparedStatement {
  private params: unknown[] = [];
  constructor(private readonly query: string, private readonly executor?: Executor) {}
  bind(...values: unknown[]) { this.params = values; return this; }
  private async execute<T>(returnId = false): Promise<QueryResult<T>> {
    const translated = translateSql(this.query, this.params, returnId);
    if (translated.skip) return { results: [], success: true, meta: { changes: 0 } };
    const runner = (this.executor || postgresClient()) as unknown as Executor;
    const rawRows = await runner.unsafe(translated.text, translated.params) as T[];
    const rows = rawRows.map((row) => Object.fromEntries(
      Object.entries(row as Record<string, unknown>).map(([key, value]) => [key, typeof value === "boolean" ? (value ? 1 : 0) : value]),
    ) as T);
    const first = rows[0] as { id?: number } | undefined;
    return { results: rows, success: true, meta: { changes: rows.length, ...(first?.id === undefined ? {} : { last_row_id: first.id }) } };
  }
  async first<T = Record<string, unknown>>() { return (await this.execute<T>()).results[0] ?? null; }
  async all<T = Record<string, unknown>>() { return this.execute<T>(); }
  async run() { return this.execute<Record<string, unknown>>(true); }
}

const DB = {
  prepare(query: string) { return new PreparedStatement(query); },
  async batch(statements: PreparedStatement[]) {
    return postgresClient().begin(async (transaction) => Promise.all(statements.map((statement) => {
      const scoped = Object.assign(Object.create(Object.getPrototypeOf(statement)), statement, { executor: transaction as unknown as Executor });
      return scoped.run();
    })));
  },
};

function storageClient() {
  const config = getSupabaseAdminConfig();
  return { bucket: config.storageBucket, client: createClient(config.url, config.secretKey, { auth: { persistSession: false, autoRefreshToken: false } }) };
}

const FILES = {
  async get(key: string) {
    const { bucket, client } = storageClient();
    const { data, error } = await client.storage.from(bucket).download(key);
    if (error || !data) return null;
    return { body: data.stream() };
  },
  async put(key: string, body: ReadableStream | ArrayBuffer | Blob, options?: { httpMetadata?: { contentType?: string } }) {
    const { bucket, client } = storageClient();
    const payload = body instanceof ReadableStream ? await new Response(body).arrayBuffer() : body;
    const { error } = await client.storage.from(bucket).upload(key, payload, { upsert: true, contentType: options?.httpMetadata?.contentType });
    if (error) throw error;
  },
  async delete(key: string) {
    const { bucket, client } = storageClient();
    const { error } = await client.storage.from(bucket).remove([key]);
    if (error) throw error;
  },
};

export const env = { DB, FILES };
