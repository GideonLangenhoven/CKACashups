import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { SessionUser } from "./auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-change-me"
);

export async function getServerSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    return {
      id: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string | null,
      role: payload.role as "ADMIN" | "USER",
      active: payload.active as boolean,
    };
  } catch (error) {
    return null;
  }
}
