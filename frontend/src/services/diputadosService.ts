import { csrfHeaders } from "@/services/csrfService";
import type { Diputado } from "@/types/diputados";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

type DiputadoPayload = Omit<Diputado, "id" | "anexo" | "direccion" | "subdependencia" | "fecha_creacion" | "fecha_actualizacion">;

async function apiError(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return body?.error || body?.mensaje || fallback;
  } catch {
    return fallback;
  }
}

export async function listarDiputados(incluirInactivos = false): Promise<Diputado[]> {
  const query = incluirInactivos ? "?incluir_inactivos=1" : "";
  const response = await fetch(`${API_BASE}/diputados${query}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await apiError(response, "No se pudieron cargar los diputados"));
  return response.json();
}

export async function crearDiputado(payload: DiputadoPayload): Promise<Diputado> {
  const response = await fetch(`${API_BASE}/diputados`, {
    method: "POST",
    credentials: "include",
    headers: await csrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await apiError(response, "No se pudo crear el diputado"));
  return response.json();
}

export async function actualizarDiputado(id: number, payload: Partial<DiputadoPayload>): Promise<Diputado> {
  const response = await fetch(`${API_BASE}/diputados/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: await csrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await apiError(response, "No se pudo actualizar el diputado"));
  return response.json();
}

export async function importarDiputadosIniciales(diputados: Diputado[]): Promise<Diputado[]> {
  const response = await fetch(`${API_BASE}/diputados/importar`, {
    method: "POST",
    credentials: "include",
    headers: await csrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ diputados }),
  });
  if (!response.ok) throw new Error(await apiError(response, "No se pudieron importar los diputados"));
  const body = await response.json();
  return body.diputados || [];
}
