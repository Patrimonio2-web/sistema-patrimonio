
// src/services/anexosService.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
import { isComisario, isViewer } from "@/services/authRole";
import { csrfHeaders } from "@/services/csrfService";
import { isVirtualSubdependenciaName } from "@/lib/subdependenciaVisibility";

export interface AnexoPayload {
  nombre?: string;
  direccion?: string;
}

export interface AnexoResponse {
  id: number;
  nombre: string;
  direccion: string;
}

export interface SubdependenciaPayload {
  id_anexo?: number | null;
  nombre?: string;
}

export interface SubdependenciaResponse {
  id: number;
  nombre: string;
  anexo_id: number;
}

export const obtenerAnexos = async (): Promise<AnexoResponse[]> => {
  const res = await fetch(`${API_BASE}/anexos`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Error al obtener anexos");
  const data = await res.json() as Array<Omit<AnexoResponse, "direccion"> & { direccion?: string | null }>;
  return data.map((item) => ({ ...item, direccion: item.direccion?.trim() || "" }));
};

export const agregarAnexo = async (anexo: { id: number; nombre: string; direccion?: string }) => {
  if (isViewer()) throw new Error("No autorizado: solo lectura");
  const res = await fetch(`${API_BASE}/anexos`, {
    method: "POST",
    headers: await csrfHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify(anexo),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
};

export const editarAnexo = async (id: number, data: AnexoPayload) => {
  if (isViewer()) throw new Error("No autorizado: solo lectura");
  const res = await fetch(`${API_BASE}/anexos/${id}`, {
    method: "PATCH", // o PUT, tu API acepta ambos
    headers: await csrfHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
};

export const eliminarAnexo = async (id: number) => {
  if (isViewer()) throw new Error("No autorizado: solo lectura");
  const res = await fetch(`${API_BASE}/anexos/${id}`, {
    method: "DELETE",
    headers: await csrfHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
};

export const obtenerSubdependencias = async (
  idAnexo: number
): Promise<SubdependenciaResponse[]> => {
  const res = await fetch(`${API_BASE}/anexos/${idAnexo}/subdependencias`, { credentials: "include" });
  if (!res.ok) throw new Error("Error al obtener subdependencias");
  const rawData = (await res.json()) as Array<Omit<SubdependenciaResponse, "anexo_id">>;
  const data = rawData.map((item) => ({ ...item, anexo_id: idAnexo }));
  return isComisario()
    ? data.filter((item) => !isVirtualSubdependenciaName(item.nombre))
    : data;
};

export const agregarSubdependencia = async (sub: { id: number; id_anexo: number; nombre: string }) => {
  if (isViewer()) throw new Error("No autorizado: solo lectura");
  const res = await fetch(`${API_BASE}/subdependencias`, {
    method: "POST",
    headers: await csrfHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify(sub),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
};

export const editarSubdependencia = async (id: number, data: SubdependenciaPayload) => {
  if (isViewer()) throw new Error("No autorizado: solo lectura");
  const res = await fetch(`${API_BASE}/subdependencias/${id}`, {
    method: "PATCH", // o PUT
    headers: await csrfHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
};

export const eliminarSubdependencia = async (id: number) => {
  if (isViewer()) throw new Error("No autorizado: solo lectura");
  const res = await fetch(`${API_BASE}/subdependencias/${id}`, {
    method: "DELETE",
    headers: await csrfHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
};
