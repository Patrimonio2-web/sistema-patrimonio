"use client";

import { isViewer } from "@/services/authRole";
import { fetchWithUser } from "@/services/fetchWithUser";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export interface AltaMovimiento {
  id: number;
  estado_carga: "pendiente" | "aprobada";
  fecha_alta: string | null;
  cantidad: number | null;
  concepto: string | null;
  disposicion: string | null;
  fecha_resolucion: string | null;
  valor_unitario: number;
  valor_total: number;
  causa_alta: string | null;
  codigo_presup: string | null;
  identidad: string | null;
  mes_planilla: string | null;
  anio_planilla: string | null;
  id_rubro: number | null;
  id_clase: number | null;
  rubro_nombre: string | null;
  clase_nombre: string | null;
}

export interface AltaPayload {
  fecha_alta: string;
  cantidad: number;
  concepto: string;
  disposicion?: string | null;
  fecha_resolucion?: string | null;
  valor_unitario?: number;
  valor_total?: number;
  causa_alta?: string | null;
  codigo_presup?: string | null;
  identidad?: string | null;
  mes_planilla: string;
  anio_planilla: string;
  id_rubro?: number | null;
  id_clase?: number | null;
}

export interface AltasFiltros {
  mes?: string;
  anio?: string;
}

async function readError(res: Response, fallback: string) {
  const text = await res.text();
  if (!text) return fallback;
  try {
    const data = JSON.parse(text) as { error?: string; mensaje?: string };
    return data.error || data.mensaje || fallback;
  } catch {
    return text;
  }
}

function buildQuery(filtros: AltasFiltros = {}) {
  const qs = new URLSearchParams();
  if (filtros.mes) qs.set("mes", filtros.mes);
  if (filtros.anio) qs.set("anio", filtros.anio);
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export async function obtenerAltas(filtros: AltasFiltros = {}): Promise<AltaMovimiento[]> {
  const res = await fetchWithUser(`${API_BASE}/altas${buildQuery(filtros)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await readError(res, "Error al obtener altas"));
  return res.json();
}

export async function crearAlta(payload: AltaPayload): Promise<AltaMovimiento> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");
  const res = await fetchWithUser(`${API_BASE}/altas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res, "Error al crear alta"));
  return res.json();
}

export async function editarAlta(id: number, payload: AltaPayload): Promise<AltaMovimiento> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");
  const res = await fetchWithUser(`${API_BASE}/altas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res, "Error al editar alta"));
  return res.json();
}

export async function cambiarEstadoAlta(id: number, estado: "pendiente" | "aprobada"): Promise<AltaMovimiento> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");
  const res = await fetchWithUser(`${API_BASE}/altas/${id}/estado-carga`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado }),
  });
  if (!res.ok) throw new Error(await readError(res, "No se pudo cambiar el estado del alta"));
  return res.json();
}

export async function eliminarAlta(id: number) {
  if (isViewer()) throw new Error("No autorizado: solo lectura");
  const res = await fetchWithUser(`${API_BASE}/altas/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readError(res, "Error al eliminar alta"));
  return res.json();
}

export function altasPdfUrl(filtros: AltasFiltros = {}) {
  return `/altas/imprimir${buildQuery(filtros)}`;
}
