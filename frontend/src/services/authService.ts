// src/services/authService.ts
import { clearCsrfToken, csrfHeaders } from "./csrfService";
import { getAuthUser, setPasswordChangeRequired } from "./authRole";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!; // /api mediante el proxy de Next.js

export interface AuthSession {
  username: string;
  role: string;
  password_change_required: boolean;
  impersonating?: boolean;
  impersonator_username?: string | null;
}

export interface ImpersonationTarget {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  role: string;
  activo: boolean;
}

export interface PerfilUsuario extends AuthSession {
  id: number;
  nombre: string;
  apellido: string;
}

async function apiError(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data?.error || data?.mensaje || fallback;
  } catch {
    return fallback;
  }
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // 👈 importante para enviar/recibir la cookie
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw new Error(await apiError(res, "Login failed"));
  }
  clearCsrfToken();
  return res.json();
}

export async function me(): Promise<AuthSession | null> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(`${API_BASE}/me`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    });

    if (res.ok) {
      const session: AuthSession = await res.json();
      setPasswordChangeRequired(Boolean(session.password_change_required));
      return session;
    }

    if (res.status === 403) {
      let errorCode = "";
      try {
        const data = await res.json();
        errorCode = String(data?.error || "").toLowerCase();
      } catch {}

      if (errorCode === "password_change_required") {
        const cached = getAuthUser();
        if (cached.username) {
          setPasswordChangeRequired(true);
          return {
            username: cached.username,
            role: cached.role,
            password_change_required: true,
          };
        }
      }
    }

    if (res.status === 401) return null;
    throw new Error("No se pudo verificar la sesion");
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw new Error("La verificacion de sesion demoro demasiado");
    }
    throw cause;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function listarUsuariosImpersonables(): Promise<ImpersonationTarget[]> {
  const res = await fetch(`${API_BASE}/impersonacion/usuarios`, { credentials: "include" });
  if (!res.ok) throw new Error(await apiError(res, "No se pudieron cargar las cuentas supervisadas"));
  return res.json();
}

export async function iniciarImpersonacion(username: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/impersonacion/iniciar`, {
    method: "POST",
    credentials: "include",
    headers: await csrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error(await apiError(res, "No se pudo abrir la vista temporal"));
  return res.json();
}

export async function finalizarImpersonacion(): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/impersonacion/finalizar`, {
    method: "POST",
    credentials: "include",
    headers: await csrfHeaders(),
  });
  if (!res.ok) throw new Error(await apiError(res, "No se pudo volver a la cuenta administrativa"));
  return res.json();
}

export async function logout() {
  const res = await fetch(`${API_BASE}/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Logout failed");
  clearCsrfToken();
  return res.json();
}

export async function obtenerPerfil(): Promise<PerfilUsuario> {
  const res = await fetch(`${API_BASE}/perfil`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await apiError(res, "No se pudo cargar el perfil"));
  }

  return res.json();
}

export async function guardarPerfil(data: {
  nombre: string;
  apellido: string;
  username: string;
}): Promise<PerfilUsuario> {
  const res = await fetch(`${API_BASE}/perfil`, {
    method: "PUT",
    credentials: "include",
    headers: await csrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(await apiError(res, "No se pudo guardar el perfil"));
  }

  return res.json();
}

export async function cambiarPasswordPerfil(
  currentValue: string,
  newValue: string,
  confirmationValue: string
): Promise<{ mensaje: string }> {
  const data: Record<string, string> = Object.fromEntries([
    ["password_actual", currentValue],
    ["password_nueva", newValue],
    ["password_confirmacion", confirmationValue],
  ]);
  const res = await fetch(`${API_BASE}/perfil/password`, {
    method: "PUT",
    credentials: "include",
    headers: await csrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(await apiError(res, "No se pudo cambiar la contrasena"));
  }

  setPasswordChangeRequired(false);
  return res.json();
}
