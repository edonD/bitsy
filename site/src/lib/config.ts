export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

export function apiUrl(path: string) {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  return `${API_BASE_URL}${path}`;
}

export function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = process.env.NEXT_PUBLIC_BITSY_API_TOKEN;

  if (token && !headers.has("authorization") && !headers.has("x-bitsy-internal-token")) {
    headers.set("x-bitsy-internal-token", token);
  }

  return fetch(apiUrl(path), {
    ...init,
    headers,
  });
}
