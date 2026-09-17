import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminHost } from "@/lib/admin/host";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do not add any logic between createServerClient and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const onAdminHost = isAdminHost(request.headers.get("host"));

  const withRefreshedCookies = (response: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    if (onAdminHost) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      response.headers.set("Cache-Control", "private, no-store");
    }
    return response;
  };
  const redirectTo = (target: string) => {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    return withRefreshedCookies(NextResponse.redirect(url));
  };

  // ---- admin.* subdomain: serve the isolated /admin route tree ----
  if (onAdminHost) {
    // API and framework assets pass straight through (never namespaced).
    if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
      return withRefreshedCookies(supabaseResponse);
    }
    // Everything the admin operator sees is gated behind auth except the login
    // page itself. Role (admin vs. not) is enforced in the admin layout.
    const isLogin = pathname === "/login" || pathname.startsWith("/login/");
    if (!user && !isLogin) return redirectTo("/login");
    // Leave login reachable for signed-in non-admins and account switching.

    // Rewrite clean subdomain paths (/users) onto the internal tree (/admin/users).
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/admin" : `/admin${pathname}`;
    return withRefreshedCookies(NextResponse.rewrite(url));
  }

  // ---- primary host: the admin tree is not reachable here ----
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/404";
    return withRefreshedCookies(NextResponse.rewrite(url));
  }

  // Protected routes: redirect to /sign-in if not authenticated
  const protectedPaths = ["/dashboard", "/practice", "/quiz", "/account"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    return redirectTo("/sign-in");
  }

  // Auth routes: redirect to /dashboard if already authenticated
  const authPaths = ["/sign-in", "/sign-up"];
  const isAuth = authPaths.some((p) => pathname.startsWith(p));

  if (isAuth && user) {
    return redirectTo("/dashboard");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wasm|onnx|mp3|wav|ico|woff2|js|map)$).*)",
  ],
};
