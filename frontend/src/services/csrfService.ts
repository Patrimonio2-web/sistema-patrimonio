const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let cachedToken: string | null = null;

function normalizeHeaders(h?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;

  if (h instanceof Headers) {
    h.forEach((v, k) => (out[k] = String(v)));
    return out;
  }

  if (Array.isArray(h)) {
    for (const [k, v] of h) out[k] = String(v);
    return out;
  }

  return { ...h };
}

export function needsCsrf(method?: string) {
  return UNSAFE_METHODS.has((method || "GET").toUpperCase());
}

export function clearCsrfToken() {
  cachedToken = null;
}

export async function getCsrfToken() {
  if (cachedToken) return cachedToken;

  const res = await fetch(`${API_BASE}/csrf`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("No se pudo validar la sesion");
  }

  const data = await res.json();
  cachedToken = data?.csrf_token || null;
  if (!cachedToken) {
    throw new Error("No se pudo validar la sesion");
  }
  return cachedToken;
}

export async function csrfHeaders(headers?: HeadersInit) {
  const base = normalizeHeaders(headers);
  base["X-CSRF-Token"] = await getCsrfToken();
  return base;
}
