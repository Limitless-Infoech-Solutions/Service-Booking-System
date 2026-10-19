import { NextResponse } from "next/server";
import { authorizeBusinessAdmin } from "@/lib/admin-auth";

function withAuthCookies(response, context) {
  for (const cookie of context.response?.cookies?.getAll?.() || []) {
    response.cookies.set(cookie);
  }
  return response;
}

export async function proxy(request) {
  const { pathname, searchParams } = request.nextUrl;
  const adminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const adminBooking = pathname === "/book/appointment" && searchParams.get("mode") === "admin";

  if ((!adminPage || pathname === "/admin/login") && !adminBooking) {
    return NextResponse.next();
  }

  const context = await authorizeBusinessAdmin(request);
  if (!context.error) return context.response;

  if (context.status === 401) {
    const loginUrl = request.nextUrl.clone();
    const returnTo = `${pathname}${request.nextUrl.search}`;
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("returnTo", returnTo);
    return withAuthCookies(NextResponse.redirect(loginUrl), context);
  }

  const status = context.status === 403 || context.status === 409 ? 403 : 503;
  return withAuthCookies(
    new NextResponse(status === 403 ? "Access denied." : "Unable to verify admin access.", {
      status,
      headers: { "Cache-Control": "no-store" },
    }),
    context
  );
}

export const config = {
  matcher: ["/admin/:path*", "/book/appointment"],
};
