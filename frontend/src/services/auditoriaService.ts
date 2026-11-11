// src/services/auditoriaService.ts
"use client";

import { fetchWithUser } from "./fetchWithUser";

export type AuditoriaRow = {
  id: number;
  fecha: string;
  usuario: string | null;
  accion: string | null;
  tabla_afectada: string | null;
  id_registro: string | null;
  descripcion: string | null;
  datos_anteriores: unknown;
  datos_nuevos: unknown;
  ip_origen: string | null;
  user_agent: string | null;
};

export type AuditoriaParams = {
  limit?: number;
  offset?: number;
  query?: string;
  desde?: string;
  hasta?: string;
  tabla?: string;
  id_registro?: string | number;
};

// Base URL publica: /api mediante el proxy de Next.js.
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
const API_BASE = RAW_API_BASE.replace(/\/$/, ""); // quita barra final si la hubiera

type JsonInit = RequestInit & { json?: unknown };
const jsonHeaders = { "Content-Type": "application/json" as const };

// Helper para fetch con manejo de errores y logs
async function apiFetch(url: string, init: JsonInit = {}) {
  const { json, headers, ...rest } = init;
  const finalInit: RequestInit = {
    ...rest,
    headers: { ...(headers || {}), ...(json !== undefined ? jsonHeaders : {}) },
    cache: rest.cache ?? "no-store",
  };
  if (json !== undefined) finalInit.body = JSON.stringify(json);

  const res = await fetchWithUser(url, finalInit);

  if (!res.ok && res.status !== 403) {
    const text = await res.text().catch(() => "");
    console.error("[auditoria] HTTP Error", res.status, url, text);
  }

  return res;
}

// Construcción de la URL CORRECTA: /api/auditoria en el backend
function buildAuditoriaURL(params: AuditoriaParams = {}) {
  // API_BASE ya es ".../api", así que acá va solo "/auditoria"
  const url = new URL(`${API_BASE}/auditoria`, window.location.origin);

  if (params.limit != null) url.searchParams.set("limit", String(params.limit));
  if (params.offset != null) url.searchParams.set("offset", String(params.offset));
  if (params.query) url.searchParams.set("query", params.query);
  if (params.desde) url.searchParams.set("desde", params.desde);
  if (params.hasta) url.searchParams.set("hasta", params.hasta);
  if (params.tabla) url.searchParams.set("tabla", params.tabla);
  if (params.id_registro != null) url.searchParams.set("id_registro", String(params.id_registro));

  const fullUrl = url.toString();
  console.debug("[auditoria:url]", fullUrl);
  return fullUrl;
}

// =============================
// Funciones exportadas
// =============================

// 🔹 Traer lista de auditorías
async function parseAuditoriaRows(res: Response): Promise<AuditoriaRow[]> {
  if (!res.ok) return [];

  let data: unknown;
  try {
    data = await res.json();
  } catch (e) {
    console.error("[auditoria] Error parseando JSON", e);
    return [];
  }

  // Si el backend devolvió un objeto con `error`
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const maybeError = (data as { error?: unknown }).error;
    if (maybeError) {
      console.error("[auditoria] Backend devolvió error:", maybeError);
      return [];
    }
  }

  // Caso 1: el backend devuelve directamente un array
  if (Array.isArray(data)) {
    console.debug("[auditoria] respuesta = array, length:", data.length);
    return data as AuditoriaRow[];
  }

  // Caso 2: va envuelto en alguna propiedad
  const obj = data as {
    rows?: unknown;
    data?: unknown;
    result?: unknown;
    [key: string]: unknown;
  };

  if (Array.isArray(obj.rows)) {
    console.debug("[auditoria] usando data.rows, length:", obj.rows.length);
    return obj.rows as AuditoriaRow[];
  }

  if (Array.isArray(obj.data)) {
    console.debug("[auditoria] usando data.data, length:", obj.data.length);
    return obj.data as AuditoriaRow[];
  }

  if (Array.isArray(obj.result)) {
    console.debug("[auditoria] usando data.result, length:", obj.result.length);
    return obj.result as AuditoriaRow[];
  }

  console.warn("[auditoria] Respuesta sin lista reconocible", data);
  return [];
}

export async function fetchAuditoria(params: AuditoriaParams = {}): Promise<AuditoriaRow[]> {
  const res = await apiFetch(buildAuditoriaURL(params));
  return parseAuditoriaRows(res);
}

function legacyHistoryRows(
  value: unknown,
  idRegistro: string | number
): AuditoriaRow[] {
  if (typeof value !== "string") return [];

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^\[([^\]]+)]\s*(.*)$/);

      return {
        id: -(index + 1),
        fecha: match?.[1] || "Fecha no disponible",
        usuario: null,
        accion: "UPDATE",
        tabla_afectada: "mobiliario",
        id_registro: String(idRegistro),
        descripcion: match?.[2] || line,
        datos_anteriores: null,
        datos_nuevos: null,
        ip_origen: null,
        user_agent: null,
      };
    })
    .reverse();
}

async function fetchLegacyMobiliarioHistory(
  idRegistro: string | number
): Promise<AuditoriaRow[]> {
  const res = await fetchWithUser(
    `${API_BASE}/mobiliario/${encodeURIComponent(String(idRegistro))}`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];

  const data = (await res.json().catch(() => null)) as {
    historial_movimientos?: unknown;
  } | null;

  return legacyHistoryRows(data?.historial_movimientos, idRegistro);
}

// 🔹 Traer la última auditoría de un registro específico
export async function obtenerUltimaAuditoriaPorRegistro(
  tabla: string,
  id_registro: string | number
): Promise<AuditoriaRow | null> {
  const rows = await fetchAuditoria({ tabla, id_registro, limit: 1, offset: 0 });
  return rows[0] ?? null;
}

// 🔹 Traer historial completo de un registro
export async function fetchHistorialPorRegistro(
  tabla: string,
  id_registro: string | number,
  limit = 100,
  offset = 0
): Promise<AuditoriaRow[]> {
  const res = await apiFetch(
    buildAuditoriaURL({ tabla, id_registro, limit, offset })
  );

  if (res.status === 403 && tabla.trim().toLowerCase() === "mobiliario") {
    return fetchLegacyMobiliarioHistory(id_registro);
  }

  return parseAuditoriaRows(res);
}
