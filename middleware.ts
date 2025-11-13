import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  createAccessToken,
  createRefreshToken,
  toSessionUser,
  verifyToken,
} from "@/lib/tokens";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const isProduction = process.env.NODE_ENV === "production";

const AUTH_EXEMPT_PATHS = ["/api/auth/signin", "/api/auth/session"];
const CSRF_EXEMPT_PATHS = [...AUTH_EXEMPT_PATHS];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitStore: Map<string, RateLimitBucket> =
  (globalThis as any).__ckaRateLimitStore ??
  ((globalThis as any).__ckaRateLimitStore = new Map());

export async function middleware(request: NextRequest) {
  let response = NextResponse.next();

  const csrfToken = ensureCsrfCookie(request, response);

  if (requiresCsrfCheck(request) && !isValidCsrf(request, csrfToken)) {
    return new NextResponse("Invalid CSRF token", { status: 403 });
  }

  const rateLimitResponse = enforceRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (!requiresAuthentication(request.nextUrl.pathname)) {
    return response;
  }

  const accessToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  const accessResult = await validateAccessToken(accessToken);

  if (accessResult.status === "valid") {
    if (!accessResult.user.active) {
      return handleUnauthorized(request);
    }
    if (
      request.nextUrl.pathname.startsWith("/admin") &&
      accessResult.user.role !== "ADMIN"
    ) {
      return NextResponse.redirect(
        new URL("/auth/error?error=AccessDenied", request.url)
      );
    }
    return response;
  }

  if (accessResult.status === "expired" && refreshToken) {
    const refreshResult = await refreshSession(refreshToken);
    if (refreshResult.status === "refreshed") {
      response.cookies.set(
        AUTH_COOKIE_NAME,
        refreshResult.accessToken,
        buildCookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS, true)
      );
      response.cookies.set(
        REFRESH_COOKIE_NAME,
        refreshResult.refreshToken,
        buildCookieOptions(REFRESH_TOKEN_MAX_AGE_SECONDS, true)
      );
      if (
        request.nextUrl.pathname.startsWith("/admin") &&
        refreshResult.user.role !== "ADMIN"
      ) {
        return NextResponse.redirect(
          new URL("/auth/error?error=AccessDenied", request.url)
        );
      }
      return response;
    }
  }

  return handleUnauthorized(request);
}

function requiresAuthentication(pathname: string): boolean {
  if (pathname.startsWith("/admin")) {
    return true;
  }

  if (!pathname.startsWith("/api")) {
    return false;
  }

  return !AUTH_EXEMPT_PATHS.some((path) => pathname.startsWith(path));
}

async function validateAccessToken(
  token?: string
): Promise<
  | { status: "missing" | "invalid" | "expired" }
  | { status: "valid"; user: ReturnType<typeof toSessionUser> }
> {
  if (!token) {
    return { status: "missing" };
  }

  try {
    const { payload } = await verifyToken(token);
    if (payload.type !== "access") {
      return { status: "invalid" };
    }
    const user = toSessionUser(payload);
    return { status: "valid", user };
  } catch (error: any) {
    if (error?.code === "ERR_JWT_EXPIRED") {
      return { status: "expired" };
    }
    return { status: "invalid" };
  }
}

async function refreshSession(refreshToken: string): Promise<
  | { status: "invalid" | "expired" }
  | {
      status: "refreshed";
      accessToken: string;
      refreshToken: string;
      user: ReturnType<typeof toSessionUser>;
    }
> {
  try {
    const { payload } = await verifyToken(refreshToken);
    if (payload.type !== "refresh") {
      return { status: "invalid" };
    }

    const user = toSessionUser(payload);
    if (!user.active) {
      return { status: "invalid" };
    }

    const [newAccessToken, newRefreshToken] = await Promise.all([
      createAccessToken(user),
      createRefreshToken(user),
    ]);

    return {
      status: "refreshed",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user,
    };
  } catch (error: any) {
    if (error?.code === "ERR_JWT_EXPIRED") {
      return { status: "expired" };
    }
    return { status: "invalid" };
  }
}

function handleUnauthorized(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signInUrl = new URL("/auth/signin", request.url);
  signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(signInUrl);
}

function ensureCsrfCookie(
  request: NextRequest,
  response: NextResponse
): string {
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (existing) {
    return existing;
  }
  const value = crypto.randomUUID();
  response.cookies.set(CSRF_COOKIE_NAME, value, {
    httpOnly: false,
    sameSite: "lax",
    secure: isProduction,
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    path: "/",
  });
  return value;
}

function requiresCsrfCheck(request: NextRequest): boolean {
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return false;
  }
  if (!MUTATING_METHODS.has(request.method)) {
    return false;
  }
  return !CSRF_EXEMPT_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );
}

function isValidCsrf(request: NextRequest, expectedToken: string): boolean {
  const headerToken =
    request.headers.get(CSRF_HEADER_NAME) ??
    request.headers.get(CSRF_HEADER_NAME.toUpperCase());
  return !!expectedToken && !!headerToken && expectedToken === headerToken;
}

function enforceRateLimit(request: NextRequest): NextResponse | null {
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return null;
  }

  const identifier = getClientIdentifier(request);
  const key = `${identifier}:${request.nextUrl.pathname}`;
  const now = Date.now();
  const bucket = rateLimitStore.get(key);

  if (!bucket || bucket.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests, please slow down." },
      {
        status: 429,
        headers: { "Retry-After": retryAfter.toString() },
      }
    );
  }

  bucket.count += 1;
  return null;
}

function getClientIdentifier(request: NextRequest): string {
  return (
    request.ip ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function buildCookieOptions(maxAge: number, httpOnly: boolean) {
  return {
    httpOnly,
    secure: isProduction,
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
