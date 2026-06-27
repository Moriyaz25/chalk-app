import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const needsProfile = isLoggedIn && !req.auth?.user?.username;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login");
  const isPublicAsset =
    req.nextUrl.pathname.startsWith("/api/auth") ||
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.startsWith("/icons") ||
    req.nextUrl.pathname.startsWith("/sw") ||
    req.nextUrl.pathname.startsWith("/join") ||
    req.nextUrl.pathname === "/manifest.json";

  if (isPublicAsset) return NextResponse.next();

  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const isAppPage =
    req.nextUrl.pathname === "/" ||
    req.nextUrl.pathname.startsWith("/board/") ||
    req.nextUrl.pathname.startsWith("/circles/");
  if (needsProfile && isAppPage) {
    return NextResponse.redirect(new URL("/settings", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
