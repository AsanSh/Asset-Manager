import { getApiBase } from "./api-base";
import { getApiErrorMessage } from "./api-error";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Authenticated fetch that throws Error with server message on non-2xx. */
export async function authFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${getApiBase()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg =
      (typeof data === "object" && data !== null && ("error" in data || "message" in data)
        ? String((data as { error?: string; message?: string }).error ?? (data as { message?: string }).message)
        : null) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res;
}

export { authHeaders, getApiErrorMessage };
