import { formatInTimeZone } from "date-fns-tz";

export const TZ = process.env.TZ || "Africa/Johannesburg";

export function todayLocalISODate() {
  const now = new Date();
  const y = parseInt(formatInTimeZone(now, TZ, "yyyy"));
  const m = parseInt(formatInTimeZone(now, TZ, "MM"));
  const d = parseInt(formatInTimeZone(now, TZ, "dd"));
  const local = new Date(Date.UTC(y, m - 1, d));
  return local.toISOString().slice(0, 10);
}

