import { cookies } from "next/headers";
import type { SessionUser } from "./auth";
import {
  AUTH_COOKIE_NAME,
  toSessionUser,
  verifyToken,
} from "@/lib/tokens";

export async function getServerSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const { payload } = await verifyToken(token);
    if (payload.type !== "access") {
      return null;
    }

    return toSessionUser(payload);
  } catch {
    return null;
  }
}
