import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createUserSession } from "@/lib/auth";
import {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  createAccessToken,
  createRefreshToken,
} from "@/lib/tokens";

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = (maxAge: number, httpOnly: boolean) => ({
  httpOnly,
  secure: isProduction,
  sameSite: "lax" as const,
  maxAge,
  path: "/",
});

function issueCsrfCookie(response: NextResponse) {
  response.cookies.set("csrf-token", randomUUID(), {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await createUserSession(email, name);

    if (!user) {
      return NextResponse.json(
        { error: "Access denied. Please contact an administrator for access." },
        { status: 403 }
      );
    }

    const [accessToken, refreshToken] = await Promise.all([
      createAccessToken(user),
      createRefreshToken(user),
    ]);

    const response = NextResponse.json({ user }, { status: 200 });

    response.cookies.set(
      AUTH_COOKIE_NAME,
      accessToken,
      cookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS, true)
    );

    response.cookies.set(
      REFRESH_COOKIE_NAME,
      refreshToken,
      cookieOptions(REFRESH_TOKEN_MAX_AGE_SECONDS, true)
    );

    issueCsrfCookie(response);

    return response;
  } catch (error) {
    console.error("Sign-in error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred during sign-in";
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
