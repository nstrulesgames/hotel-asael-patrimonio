import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./supabase/drizzle",
  schema: "./db/schema.supabase.ts",
  dialect: "postgresql",
});