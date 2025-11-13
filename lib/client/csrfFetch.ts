// Simple fetch wrapper for client-side requests
// TODO: Add CSRF token support (see SECURITY_AUDIT_REPORT.md)

export async function csrfFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // In the future, this would include CSRF token in headers
  // For now, it's just a pass-through to fetch
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
