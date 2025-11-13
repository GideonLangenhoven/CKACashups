// Fetch wrapper that includes CSRF token for mutating requests

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;

  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='))
    ?.split('=')[1];

  return cookieValue || null;
}

export async function csrfFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const csrfToken = getCsrfToken();

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      ...options.headers,
    },
  });
}
