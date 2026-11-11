import { fetchWithUser } from "./fetchWithUser";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export interface UsuarioOnline {
  username: string;
  role: "superadmin" | "admin" | "viewer" | string;
  ultima_actividad: string;
}

export async function registrarPresencia(): Promise<UsuarioOnline> {
  const res = await fetchWithUser(`${API_BASE}/presencia/ping`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("No se pudo registrar presencia");
  return res.json();
}

export async function listarUsuariosOnline(): Promise<UsuarioOnline[]> {
  const res = await fetchWithUser(`${API_BASE}/presencia/usuarios`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("No se pudieron cargar usuarios online");
  return res.json();
}
