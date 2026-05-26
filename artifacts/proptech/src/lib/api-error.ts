/** Extract user-facing message from api.ts / fetch / unknown errors. */
export function getApiErrorMessage(err: unknown, fallback = "Неизвестная ошибка"): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null) {
    const e = err as {
      message?: string;
      body?: { error?: string; message?: string };
      response?: { data?: { error?: string; message?: string } };
    };
    if (e.body && typeof e.body === "object") {
      const msg = e.body.error ?? e.body.message;
      if (msg) return String(msg);
    }
    if (e.response?.data) {
      const msg = e.response.data.error ?? e.response.data.message;
      if (msg) return String(msg);
    }
    if (e.message) return String(e.message);
  }
  return fallback;
}
