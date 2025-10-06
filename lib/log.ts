export function logEvent(event: string, data?: Record<string, any>) {
  try {
    const payload = { event, ts: new Date().toISOString(), ...data };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload));
  } catch {}
}

