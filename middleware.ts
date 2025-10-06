import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-change-me"
);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;

  // Check if accessing protected routes
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/admin");

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Verify token for protected routes
  if (!token) {
    // Only /admin is protected now
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Check if user is active
    if (!payload.active) {
      return NextResponse.redirect(new URL("/auth/error?error=AccountInactive", request.url));
    }

    // Check admin routes
    if (request.nextUrl.pathname.startsWith("/admin") && payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/auth/error?error=AccessDenied", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Invalid token
    if (request.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
