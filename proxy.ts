import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("oai-authenticated-user-id");
  requestHeaders.delete("oai-authenticated-user-email");
  requestHeaders.delete("oai-authenticated-user-full-name");
  requestHeaders.delete("oai-authenticated-user-full-name-encoding");
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (user?.email) {
    const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : user.email;
    requestHeaders.set("oai-authenticated-user-id", user.id);
    requestHeaders.set("oai-authenticated-user-email", user.email);
    requestHeaders.set("oai-authenticated-user-full-name", encodeURIComponent(fullName));
    requestHeaders.set("oai-authenticated-user-full-name-encoding", "percent-encoded-utf-8");
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
