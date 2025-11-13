import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/tokens";

export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 });

  // Clear ALL authentication cookies to ensure complete sign-out
  response.cookies.delete(AUTH_COOKIE_NAME);
  response.cookies.delete(REFRESH_COOKIE_NAME);
  response.cookies.delete("csrf-token");

  // Also set them to empty with immediate expiration as a fallback
  response.cookies.set(AUTH_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  response.cookies.set(REFRESH_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  response.cookies.set("csrf-token", "", { maxAge: 0, path: "/" });

  return response;
}
