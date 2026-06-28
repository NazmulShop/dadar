/**
 * Shared fetch helper for /api/account/* endpoints.
 *
 * Mirrors authStore's API_ORIGIN resolution: when VITE_API_URL is set
 * (production, where frontend and backend are deployed as separate
 * Workers on different origins) requests go to that origin. When unset
 * (local dev) requests fall back to a relative path proxied by Vite.
 *
 * IMPORTANT: do not call `fetch("/api/account/...")` directly anywhere —
 * a relative path silently breaks in production once frontend/backend are
 * split across origins. Always go through `accountFetch`.
 */
const API_ORIGIN = ((import.meta as any).env?.VITE_API_URL ?? "").replace(/\/$/, "");
export { API_ORIGIN };

export class AccountApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function accountFetch<T = unknown>(
  path: string,
  token: string | undefined,
  opts: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((opts.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${API_ORIGIN}/api/account${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      (data as any)?.error ?? (data as any)?.message ?? `Request failed (${res.status})`;
    throw new AccountApiError(msg, res.status, data);
  }

  return data as T;
}
