"use client";

import { fetchWithUser } from "@/services/fetchWithUser";
import type { AltaMovimiento } from "@/services/altasService";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export type AltaRevisionEstado = "pendiente" | "en_revision" | "aprobada";

export interface AltaPlanillaRevision {
  mes_planilla: string;
  anio_planilla: string;
  estado: AltaRevisionEstado;
  comentario: string | null;
  revisado_por: string | null;
  fecha_aprobacion: string | null;
  fecha_actualizacion: string | null;
  total_movimientos: number;
  movimientos_revisados: number;
  movimientos_pendientes: number;
  total_valor: number;
}

export interface AltaMovimientoRevision {
  revisado: boolean;
  comentario: string | null;
  revisado_por: string | null;
  fecha_revision: string | null;
  fecha_actualizacion: string | null;
}

export type AltaMovimientoConRevision = AltaMovimiento & {
  revision: AltaMovimientoRevision;
};

export interface AltaRevisionDetalle {
  planilla: AltaPlanillaRevision;
  movimientos: AltaMovimientoConRevision[];
}

export interface AltasRevisionNotificaciones {
  pendientes: number;
  planillas: AltaPlanillaRevision[];
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

function revisionUrl(mes: string, anio: string) {
  return `${API_BASE}/altas/revisiones/${encodeURIComponent(mes)}/${encodeURIComponent(anio)}`;
}

export async function obtenerRevisionesAltas(): Promise<AltaPlanillaRevision[]> {
  const res = await fetchWithUser(`${API_BASE}/altas/revisiones`, { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res, "No se pudieron cargar las revisiones"));
  return res.json();
}

export async function obtenerNotificacionesRevisionesAltas(): Promise<AltasRevisionNotificaciones> {
  const res = await fetchWithUser(`${API_BASE}/altas/revisiones/notificaciones`, { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res, "No se pudieron cargar las notificaciones"));
  return res.json();
}

export async function obtenerRevisionAlta(mes: string, anio: string): Promise<AltaRevisionDetalle> {
  const res = await fetchWithUser(revisionUrl(mes, anio), { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res, "No se pudo cargar la revision"));
  return res.json();
}

export async function actualizarRevisionAlta(
  mes: string,
  anio: string,
  payload: { estado: AltaRevisionEstado; comentario?: string | null }
): Promise<AltaPlanillaRevision> {
  const res = await fetchWithUser(revisionUrl(mes, anio), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res, "No se pudo actualizar la revision"));
  return res.json();
}

export async function guardarRevisionMovimientoAlta(
  idAlta: number,
  payload: { revisado: boolean; comentario?: string | null }
): Promise<AltaMovimientoRevision & { id_alta: number }> {
  const res = await fetchWithUser(`${API_BASE}/altas/revisiones/movimientos/${idAlta}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res, "No se pudo guardar la revision del movimiento"));
  return res.json();
}
