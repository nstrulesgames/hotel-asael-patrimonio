type SupabaseServerEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_STORAGE_BUCKET?: string;
};

export type SupabaseAdminConfig = { url: string; secretKey: string; storageBucket: string };

function runtimeEnv(): SupabaseServerEnv {
  return process.env as SupabaseServerEnv;
}

export function isSupabaseConfigured(): boolean {
  const values = runtimeEnv();
  return Boolean((values.NEXT_PUBLIC_SUPABASE_URL || values.SUPABASE_URL) && values.SUPABASE_SECRET_KEY);
}

export function getSupabaseAdminConfig(): SupabaseAdminConfig {
  const values = runtimeEnv();
  const url = (values.NEXT_PUBLIC_SUPABASE_URL || values.SUPABASE_URL)?.trim().replace(/\/$/, "");
  const secretKey = (values.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  const storageBucket = values.SUPABASE_STORAGE_BUCKET?.trim() || "hotel-asael-evidencias";
  if (!url || !secretKey) throw new Error("Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY.");
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:") throw new Error("La URL de Supabase debe utilizar HTTPS.");
  return { url: parsedUrl.origin, secretKey, storageBucket };
}

export async function supabaseAdminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const config = getSupabaseAdminConfig();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const target = new URL(normalizedPath, `${config.url}/`);
  if (target.origin !== config.url) throw new Error("La ruta solicitada no pertenece al proyecto Supabase configurado.");
  const headers = new Headers(init.headers);
  headers.set("apikey", config.secretKey);
  headers.set("Authorization", `Bearer ${config.secretKey}`);
  const response = await fetch(target, { ...init, headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase respondió ${response.status}: ${body || response.statusText}`);
  }
  return response;
}

export async function supabaseAdminJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await supabaseAdminFetch(path, init);
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}
