"use client";

import { isViewer } from "@/services/authRole";
import { fetchWithUser } from "./fetchWithUser";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export interface RelevamientoAnexo {
  id_anexo: number;
  fecha_completado: string;
  fecha_creacion?: string | null;
  fecha_actualizacion?: string | null;
}

export interface RelevamientoSubdependencia {
  id_subdependencia: number;
  id_anexo?: number | null;
  fecha_completado: string;
  fecha_creacion?: string | null;
  fecha_actualizacion?: string | null;
}

export interface HistorialRelevamientoAnexo {
  id: number;
  id_anexo: number;
  fecha_completado: string;
  comentario?: string | null;
  fecha_creacion?: string | null;
}

export interface HistorialRelevamientoSubdependencia {
  id: number;
  id_subdependencia: number;
  id_anexo?: number | null;
  fecha_completado: string;
  comentario?: string | null;
  fecha_creacion?: string | null;
}

async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetchWithUser(url, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json") && text) {
      let body: { error?: string; mensaje?: string } | null = null;

      try {
        body = JSON.parse(text) as { error?: string; mensaje?: string };
      } catch {}

      if (body?.error || body?.mensaje) {
        throw new Error(body.error || body.mensaje);
      }
    }

    if (res.status === 404) {
      throw new Error("La ruta de relevamientos no esta disponible en el servidor.");
    }

    throw new Error("No se pudo completar la consulta de relevamientos.");
  }

  return res.json();
}

export async function obtenerRelevamientosAnexos(): Promise<RelevamientoAnexo[]> {
  return fetchJson<RelevamientoAnexo[]>(`${API_BASE}/relevamientos/anexos`);
}

export async function guardarRelevamientoAnexo(
  idAnexo: number,
  fechaCompletado: string,
  comentario?: string
): Promise<RelevamientoAnexo> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");

  return fetchJson<RelevamientoAnexo>(`${API_BASE}/relevamientos/anexos/${idAnexo}`, {
    method: "PUT",
    body: JSON.stringify({ fecha_completado: fechaCompletado, comentario }),
  });
}

export async function eliminarRelevamientoAnexo(idAnexo: number): Promise<void> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");

  await fetchJson<{ mensaje: string }>(`${API_BASE}/relevamientos/anexos/${idAnexo}`, {
    method: "DELETE",
  });
}

export async function obtenerRelevamientosSubdependencias(
  idAnexo: number
): Promise<RelevamientoSubdependencia[]> {
  return fetchJson<RelevamientoSubdependencia[]>(
    `${API_BASE}/relevamientos/anexos/${idAnexo}/subdependencias`
  );
}

export async function obtenerHistorialRelevamientosAnexo(
  idAnexo: number
): Promise<HistorialRelevamientoAnexo[]> {
  return fetchJson<HistorialRelevamientoAnexo[]>(
    `${API_BASE}/relevamientos/anexos/${idAnexo}/historial`
  );
}

export async function guardarRelevamientoSubdependencia(
  idSubdependencia: number,
  fechaCompletado: string,
  comentario?: string
): Promise<RelevamientoSubdependencia> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");

  return fetchJson<RelevamientoSubdependencia>(
    `${API_BASE}/relevamientos/subdependencias/${idSubdependencia}`,
    {
      method: "PUT",
      body: JSON.stringify({ fecha_completado: fechaCompletado, comentario }),
    }
  );
}

export async function obtenerHistorialRelevamientosSubdependencia(
  idSubdependencia: number
): Promise<HistorialRelevamientoSubdependencia[]> {
  return fetchJson<HistorialRelevamientoSubdependencia[]>(
    `${API_BASE}/relevamientos/subdependencias/${idSubdependencia}/historial`
  );
}

export async function eliminarRelevamientoSubdependencia(
  idSubdependencia: number
): Promise<void> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");

  await fetchJson<{ mensaje: string }>(
    `${API_BASE}/relevamientos/subdependencias/${idSubdependencia}`,
    {
      method: "DELETE",
    }
  );
}
