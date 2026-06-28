/**
 * Shared admin API helper.
 * Reads the auth token from localStorage (same key as authStore.tsx).
 * Use this in all admin route pages — avoids needing useAuth() in hooks
 * that run outside React component scope.
 */

import { API_ORIGIN } from "@/lib/accountApi";

export { API_ORIGIN };

export function getAdminToken(): string {
  try {
    const raw = localStorage.getItem("dadar.auth.session.v2");
    if (!raw) return "";
    return (JSON.parse(raw) as { token?: string })?.token ?? "";
  } catch {
    return "";
  }
}

export function adminHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getAdminToken()}`,
    "Content-Type": "application/json",
  };
}

export function adminGetHeaders(): HeadersInit {
  return { Authorization: `Bearer ${getAdminToken()}` };
}

export async function adminFetch<T = unknown>(
  path: string,
  opts?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_ORIGIN}/api/admin/${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${getAdminToken()}`,
      ...(opts?.body ? { "Content-Type": "application/json" } : {}),
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function adminPost<T = unknown>(path: string, body: unknown): Promise<T> {
  return adminFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export async function adminPut<T = unknown>(path: string, body: unknown): Promise<T> {
  return adminFetch<T>(path, { method: "PUT", body: JSON.stringify(body) });
}

export async function adminDelete(path: string): Promise<void> {
  await fetch(`${API_ORIGIN}/api/admin/${path}`, {
    method: "DELETE",
    headers: adminGetHeaders(),
  });
}
