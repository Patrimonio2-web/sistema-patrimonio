import { clearAuthUser, setPasswordChangeRequired } from "./authRole";
import { clearCsrfToken, csrfHeaders, needsCsrf } from "./csrfService";

type FetchOptions = RequestInit;
const LOGIN_PATH = "/Login";
const PASSWORD_CHANGE_PATH = "/CambiarPassword";

let authRedirectPending = false;

function redirectAndSuspend(path: string): Promise<Response> {
  if (!authRedirectPending) {
    authRedirectPending = true;
    window.location.replace(path);
  }

  // La pagina se esta descargando. Mantener pendientes las consultas evita que
  // cada componente muestre su propio error mientras ocurre la redireccion.
  return new Promise<Response>(() => undefined);
}

/** Normaliza headers a un objeto plano { [key]: value } */
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

/**
 * Wrapper de fetch que mantiene credenciales habilitadas para sesiones con cookies.
 */
export async function fetchWithUser(
  input: RequestInfo | URL,
  options: FetchOptions = {}
): Promise<Response> {
  if (authRedirectPending && typeof window !== "undefined") {
    return new Promise<Response>(() => undefined);
  }

  const base = needsCsrf(options.method)
    ? await csrfHeaders(options.headers)
    : normalizeHeaders(options.headers ?? undefined);

  const finalInit: RequestInit = {
    ...options,
    headers: base,
    credentials: options.credentials ?? "include",
  };

  const res = await fetch(input, finalInit);

  if ((res.status === 401 || res.status === 403) && typeof window !== "undefined") {
    let errorCode = "";
    try {
      const data = await res.clone().json();
      errorCode = String(data?.error || "");
    } catch {}

    if (
      res.status === 403 &&
      errorCode === "password_change_required" &&
      window.location.pathname.toLowerCase() !== PASSWORD_CHANGE_PATH.toLowerCase()
    ) {
      setPasswordChangeRequired(true);
      return redirectAndSuspend(PASSWORD_CHANGE_PATH);
    }

    const shouldLogin =
      res.status === 401 &&
      (!errorCode || ["session_expired", "unauthorized"].includes(errorCode));
    if (shouldLogin && window.location.pathname.toLowerCase() !== LOGIN_PATH.toLowerCase()) {
      clearAuthUser();
      clearCsrfToken();
      return redirectAndSuspend(LOGIN_PATH);
    }
  }

  return res;
}
