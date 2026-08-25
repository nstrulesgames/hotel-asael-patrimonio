import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const returnTo = request.nextUrl.searchParams.get("return_to") || "/";
  const target = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  const login = new URL("/signin-with-chatgpt", request.url);
  login.searchParams.set("return_to", target);
  return NextResponse.redirect(login);
}
