let _token: string | null = null;

export const setToken = (t: string | null): void => {
  _token = t;
};

const getBaseUrl = (): string => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : "";
};

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 с";
  return (
    new Intl.NumberFormat("ru-KG", {
      style: "decimal",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(num) + " с"
  );
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
