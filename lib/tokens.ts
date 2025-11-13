import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { SessionUser } from "@/lib/auth";

const secret = process.env.NEXTAUTH_SECRET;

if (!secret) {
  throw new Error("NEXTAUTH_SECRET must be set");
}

const JWT_SECRET = new TextEncoder().encode(secret);

export const AUTH_COOKIE_NAME = "auth-token";
export const REFRESH_COOKIE_NAME = "refresh-token";
export const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60; // 1 hour
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type TokenType = "access" | "refresh";

export type SessionTokenPayload = Pick<
  SessionUser,
  "id" | "email" | "name" | "role" | "active"
> & {
  type: TokenType;
};

export function toSessionUser(payload: JWTPayload): SessionUser {
  if (
    typeof payload.userId !== "string" ||
    typeof payload.email !== "string" ||
    (payload.name !== null && payload.name !== undefined && typeof payload.name !== "string") ||
    (payload.role !== "ADMIN" && payload.role !== "USER") ||
    typeof payload.active !== "boolean"
  ) {
    throw new Error("Invalid session payload");
  }

  return {
    id: payload.userId,
    email: payload.email,
    name: payload.name ?? null,
    role: payload.role,
    active: payload.active,
  };
}

async function signToken(
  payload: SessionTokenPayload,
  expiresInSeconds: number
): Promise<string> {
  return new SignJWT({
    userId: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    active: payload.active,
    type: payload.type,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(JWT_SECRET);
}

export async function createAccessToken(user: SessionUser): Promise<string> {
  return signToken({ ...user, type: "access" }, ACCESS_TOKEN_MAX_AGE_SECONDS);
}

export async function createRefreshToken(user: SessionUser): Promise<string> {
  return signToken({ ...user, type: "refresh" }, REFRESH_TOKEN_MAX_AGE_SECONDS);
}

export async function verifyToken(
  token: string
): Promise<{ payload: JWTPayload }> {
  const result = await jwtVerify(token, JWT_SECRET);
  return { payload: result.payload };
}
