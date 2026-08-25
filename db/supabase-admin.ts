import { env } from "cloudflare:workers";

type SupabaseServerEnv = {
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_STORAGE_BUCKET?: string;
};

export type SupabaseAdminConfig = {
  url: string;
  secretKey: string;
  storageBucket: string;
};

function runtimeEnv(): SupabaseServerEnv {
  return env as unknown as SupabaseServerEnv;
}

export function isSupabaseConfigured(): boolean {
  const values = runtimeEnv();
  return Boolean(values.SUPABASE_URL && values.SUPABASE_SECRET_KEY);
}

export function getSupabaseAdminConfig(): SupabaseAdminConfig {
  const values = runtimeEnv();
  const url = values.SUPABASE_URL?.trim().replace(/\/$/, "");
  const secretKey = values.SUPABASE_SECRET_KEY?.trim();
  const storageBucket =
    values.SUPABASE_STORAGE_BUCKET?.trim() || "hotel-asael-evidencias";

  if (!url || !secretKey) {
    throw new Error(
      "Supabase no está configurado. Define SUPABASE_URL y SUPABASE_SECRET_KEY en el entorno privado del servidor.",
    );
  }

  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:") {
    throw new Error("SUPABASE_URL debe utilizar HTTPS.");
  }

  return { url: parsedUrl.origin, secretKey, storageBucket };
}

export async function supabaseAdminFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const config = getSupabaseAdminConfig();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const target = new URL(normalizedPath, `${config.url}/`);

  if (target.origin !== config.url) {
    throw new Error("La ruta solicitada no pertenece al proyecto Supabase configurado.");
  }

  const headers = new Headers(init.headers);
  headers.set("apikey", config.secretKey);
  headers.set("Authorization", `Bearer ${config.secretKey}`);

  const response = await fetch(target, { ...init, headers });
  if (!response.ok) {
    const body = await response.text();
    let detail = body;
    try {
      const parsed = JSON.parse(body) as { message?: string; error?: string };
      detail = parsed.message || parsed.error || body;
    } catch {
      // Supabase también puede devolver texto plano.
    }
    throw new Error(`Supabase respondió ${response.status}: ${detail || response.statusText}`);
  }

  return response;
}

export async function supabaseAdminJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await supabaseAdminFetch(path, init);
  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}