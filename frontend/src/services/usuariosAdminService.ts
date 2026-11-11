import { fetchWithUser } from "./fetchWithUser";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export type UsuarioAdminRole =
  | "superadmin"
  | "admin"
  | "viewer"
  | "matafuegos"
  | "comisario";

export interface UsuarioAdmin {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  role: UsuarioAdminRole;
  activo: boolean;
  password_change_required: boolean;
  fecha_creacion: string | null;
  protegido: boolean;
}

export interface CrearUsuarioPayload {
  username: string;
  nombre?: string;
  apellido?: string;
  password: string;
  role: "admin" | "viewer" | "matafuegos" | "comisario";
  activo?: boolean;
}

export interface ActualizarUsuarioPayload {
  username: string;
  nombre?: string;
  apellido?: string;
  role: UsuarioAdminRole;
  activo: boolean;
}

async function apiError(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data?.error || data?.mensaje || fallback;
  } catch {
    return fallback;
  }
}

export async function listarUsuariosAdmin(): Promise<UsuarioAdmin[]> {
  const res = await fetchWithUser(`${API_BASE}/admin/usuarios`);
  if (!res.ok) {
    throw new Error(await apiError(res, "No se pudieron cargar los usuarios"));
  }
  return res.json();
}

export async function crearUsuarioAdmin(
  payload: CrearUsuarioPayload
): Promise<UsuarioAdmin> {
  const res = await fetchWithUser(`${API_BASE}/admin/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await apiError(res, "No se pudo crear el usuario"));
  }
  return res.json();
}

export async function actualizarUsuarioAdmin(
  id: number,
  payload: ActualizarUsuarioPayload
): Promise<UsuarioAdmin> {
  const res = await fetchWithUser(`${API_BASE}/admin/usuarios/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await apiError(res, "No se pudo actualizar el usuario"));
  }
  return res.json();
}

export async function resetearPasswordUsuarioAdmin(
  id: number,
  password: string
): Promise<{
  mensaje: string;
  username: string;
  password_change_required: true;
}> {
  const res = await fetchWithUser(`${API_BASE}/admin/usuarios/${id}/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    throw new Error(await apiError(res, "No se pudo cambiar la contrasena"));
  }
  return res.json();
}
