// src/services/mobiliarioService.ts
"use client";

import { fetchWithUser } from "./fetchWithUser";
import { canDeleteMobiliario, isViewer } from "@/services/authRole";

import type {
  Mobiliario,
  MobiliarioUltimo,
  PatrimonioCreatePayload,
  PatrimonioUpdatePayload,
} from "@/types/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

type JsonInit = RequestInit & { json?: unknown };
const jsonHeaders = { "Content-Type": "application/json" as const };

export type CreateMobiliarioResponse = {
  mensaje?: string;
  id_generado?: string | number;
  id?: string | number;
};

async function apiFetch(url: string, init: JsonInit = {}) {
  const { json, headers, ...rest } = init;
  const finalInit: RequestInit = {
    ...rest,
    headers: { ...(headers || {}), ...(json !== undefined ? jsonHeaders : {}) },
    cache: rest.cache ?? "no-store",
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  };
  return fetchWithUser(url, finalInit);
}

async function readApiError(res: Response, fallback: string) {
  const text = await res.text();
  if (!text) return fallback;

  try {
    const data = JSON.parse(text);
    return data?.error || data?.mensaje || fallback;
  } catch {
    return text;
  }
}

function parseResolucion(resolucion?: string | null) {
  if (!resolucion) return { numero: undefined, tipo: undefined };

  const match = resolucion.match(/Resol\s*N[º°]?\s*(\S+)\s*(.*)/i);
  return {
    numero: match?.[1] || undefined,
    tipo: match?.[2] || undefined,
  };
}

function parseValor(valor: Mobiliario["valor"]) {
  if (valor === undefined || valor === null || valor === "") return undefined;
  const parsed =
    typeof valor === "number"
      ? valor
      : (() => {
          const raw = String(valor).replace(/\s+/g, "");
          const normalized = raw.includes(",")
            ? raw.replace(/\./g, "").replace(/,/g, ".")
            : raw;
          return Number(normalized);
        })();

  return Number.isNaN(parsed) ? undefined : parsed;
}

const ULTIMOS_MOBILIARIOS_CACHE_KEY = "patrimonio:mobiliario:ultimos:v4";
const ULTIMOS_MOBILIARIOS_CACHE_MS = 10 * 60 * 1000;
const ULTIMOS_MOBILIARIOS_NAVIGATION_CACHE_MS = 60 * 1000;

type UltimosCache = {
  savedAt: number;
  items: MobiliarioUltimo[];
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

export function readCachedUltimosMobiliarios(
  maxAgeMs = ULTIMOS_MOBILIARIOS_CACHE_MS
): MobiliarioUltimo[] | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(ULTIMOS_MOBILIARIOS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as UltimosCache;
    if (!Array.isArray(parsed.items)) return null;
    if (Number.isFinite(maxAgeMs) && Date.now() - parsed.savedAt > maxAgeMs) {
      return null;
    }

    return parsed.items;
  } catch {
    return null;
  }
}

export function writeCachedUltimosMobiliarios(items: MobiliarioUltimo[]) {
  if (!canUseStorage()) return;

  try {
    const payload: UltimosCache = { savedAt: Date.now(), items };
    window.sessionStorage.setItem(
      ULTIMOS_MOBILIARIOS_CACHE_KEY,
      JSON.stringify(payload)
    );
  } catch {
    // Cache auxiliar: si falla, la app sigue consultando al backend.
  }
}

export function findCachedUltimoMobiliario(id: string) {
  const cached = readCachedUltimosMobiliarios();
  return cached?.find((item) => String(item.id_mobiliario) === String(id)) ?? null;
}

export function patchCachedUltimoMobiliario(
  id: string,
  patch: Partial<MobiliarioUltimo>
) {
  const cached = readCachedUltimosMobiliarios(Number.POSITIVE_INFINITY);
  if (!cached) return;

  writeCachedUltimosMobiliarios(
    cached.map((item) =>
      String(item.id_mobiliario) === String(id) ? { ...item, ...patch } : item
    )
  );
}

export function removeCachedUltimoMobiliario(id: string) {
  const cached = readCachedUltimosMobiliarios(Number.POSITIVE_INFINITY);
  if (!cached) return;

  writeCachedUltimosMobiliarios(
    cached.filter((item) => String(item.id_mobiliario) !== String(id))
  );
}

export function mobiliarioToUltimo(item: Mobiliario): MobiliarioUltimo {
  return {
    id_mobiliario: String(item.id),
    descripcion: item.descripcion,
    clase_bien: item.clase_bien || item.clase,
    rubro: item.rubro,
    anexo: item.anexo,
    subdependencia: item.subdependencia,
    resolucion: item.resolucion,
    estado_conservacion: item.estado_conservacion,
    estado_control: item.estado_control,
    fecha_resolucion: item.fecha_resolucion,
    comentarios: item.comentarios,
    vehiculo: item.vehiculo,
    fecha_creacion: item.fecha_creacion,
    fecha_actualizacion: item.fecha_actualizacion,
    foto_url: item.foto_url,
    foto_url_2: item.foto_url_2,
    para_baja: item.para_baja,
    faltante: item.faltante,
    no_dado: item.no_dado,
    para_reparacion: item.para_reparacion,
    problema_etiqueta: item.problema_etiqueta,
    sobrante: item.sobrante,
    valor: item.valor,
    privado: item.privado,
    ubicacion_id: item.ubicacion_id,
    rubro_id: item.rubro_id ?? item.id_rubro,
    clase_bien_id: item.clase_bien_id ?? item.id_clase,
    historial: item.historial_movimientos
      ? item.historial_movimientos
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      : undefined,
  };
}

export function mobiliarioUltimoToMobiliario(item: MobiliarioUltimo): Mobiliario {
  return {
    id: String(item.id_mobiliario),
    descripcion: item.descripcion,
    resolucion: item.resolucion || "",
    fecha_resolucion: item.fecha_resolucion || "",
    estado_conservacion: item.estado_conservacion || "",
    estado_control: item.estado_control,
    historial_movimientos: item.historial?.join("\n"),
    no_dado: !!item.no_dado,
    para_reparacion: !!item.para_reparacion,
    para_baja: !!item.para_baja,
    faltante: !!item.faltante,
    sobrante: !!item.sobrante,
    problema_etiqueta: !!item.problema_etiqueta,
    comentarios: item.comentarios,
    vehiculo: item.vehiculo,
    foto_url: item.foto_url,
    foto_url_2: item.foto_url_2,
    anexo: item.anexo,
    subdependencia: item.subdependencia,
    rubro: item.rubro,
    clase: item.clase_bien,
    clase_bien: item.clase_bien,
    valor: item.valor,
    privado: item.privado,
    ubicacion_id: item.ubicacion_id ?? 0,
    fecha_creacion: item.fecha_creacion || "",
    fecha_actualizacion: item.fecha_actualizacion || "",
    rubro_id: item.rubro_id ?? item.id_rubro,
    clase_bien_id: item.clase_bien_id ?? item.id_clase,
    id_rubro: item.rubro_id ?? item.id_rubro,
    id_clase: item.clase_bien_id ?? item.id_clase,
  };
}

export function upsertCachedMobiliario(item: Mobiliario | MobiliarioUltimo) {
  const ultimo =
    "id_mobiliario" in item ? item : mobiliarioToUltimo(item as Mobiliario);
  const cached = readCachedUltimosMobiliarios(Number.POSITIVE_INFINITY);
  if (!cached) return;

  const id = String(ultimo.id_mobiliario);
  writeCachedUltimosMobiliarios([
    ultimo,
    ...cached.filter((cachedItem) => String(cachedItem.id_mobiliario) !== id),
  ]);
}

// ======= GETs =======

export async function obtenerMobiliario(): Promise<Mobiliario[]> {
  const res = await apiFetch(`${API_BASE}/mobiliario`);
  if (!res.ok) throw new Error("Error al obtener registros");
  return res.json();
}

export async function obtenerMobiliariosParaBaja(): Promise<Mobiliario[]> {
  const res = await apiFetch(`${API_BASE}/mobiliario/para-baja`);
  if (!res.ok) throw new Error("Error al obtener mobiliarios para baja");
  return res.json();
}

export async function obtenerUltimosMobiliarios(
  options: { force?: boolean } = {}
): Promise<MobiliarioUltimo[]> {
  if (!options.force) {
    const cached = readCachedUltimosMobiliarios(
      ULTIMOS_MOBILIARIOS_NAVIGATION_CACHE_MS
    );
    if (cached?.length) return cached;
  }

  const res = await apiFetch(`${API_BASE}/mobiliario/ultimos?lite=1`);
  if (!res.ok) throw new Error("Error al obtener últimos mobiliarios");
  const data = await res.json();
  writeCachedUltimosMobiliarios(data);
  return data;
}

export async function obtenerMobiliariosPorUbicacion(
  ubicacionId: number
): Promise<MobiliarioUltimo[]> {
  const res = await apiFetch(`${API_BASE}/mobiliario/ultimos?ubicacion_id=${ubicacionId}&lite=1`);
  if (!res.ok) throw new Error("Error al obtener mobiliarios por ubicación");
  return res.json();
}

export async function obtenerMobiliariosPorAnexo(
  anexoId: number
): Promise<MobiliarioUltimo[]> {
  const res = await apiFetch(
    `${API_BASE}/mobiliario/ultimos?anexo_id=${encodeURIComponent(anexoId)}&lite=1`
  );
  if (!res.ok) throw new Error("Error al obtener mobiliarios del anexo");
  return res.json();
}

export async function obtenerMobiliarioPorId(
  id: string
): Promise<Mobiliario & { id_clase?: number; id_rubro?: number }> {
  const res = await apiFetch(`${API_BASE}/mobiliario/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Error al obtener mobiliario");
  return res.json();
}

export async function obtenerEtiquetaPorId(
  id: string
): Promise<{ etiqueta_url: string }> {
  const res = await apiFetch(`${API_BASE}/mobiliario/etiqueta/ver/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Error al obtener etiqueta");
  return res.json();
}

// ======= Mutaciones =======

export async function createMobiliario(payload: PatrimonioCreatePayload): Promise<CreateMobiliarioResponse> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");
  const res = await apiFetch(`${API_BASE}/mobiliario`, {
    method: "POST",
    json: payload,
  });
  if (!res.ok) throw new Error(await readApiError(res, "Error al crear mobiliario"));
  return res.json();
}

export async function editarMobiliario(
  id: string,
  datos: PatrimonioUpdatePayload
): Promise<Mobiliario> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");
  const res = await apiFetch(`${API_BASE}/mobiliario/${encodeURIComponent(id)}`, {
    method: "PUT",
    json: datos,
  });
  if (!res.ok) throw new Error(await readApiError(res, "Error al editar mobiliario"));
  return res.json();
}

export async function actualizarUbicacionMobiliario(
  id: string,
  ubicacionId: number
): Promise<Mobiliario> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");

  const actual = await obtenerMobiliarioPorId(id);
  const { numero, tipo } = parseResolucion(actual.resolucion);
  const claseId = actual.clase_bien_id ?? actual.id_clase;
  const rubroId = actual.rubro_id ?? actual.id_rubro;

  if (!claseId || !rubroId) {
    throw new Error(`El bien ID ${id} no tiene clase o rubro válido.`);
  }

  const actualizado = await editarMobiliario(id, {
    ubicacion_id: ubicacionId,
    clase_bien_id: claseId,
    rubro_id: rubroId,
    descripcion: actual.descripcion || undefined,
    resolucion_numero: numero,
    resolucion_tipo: tipo,
    fecha_resolucion: actual.fecha_resolucion || undefined,
    estado_conservacion: actual.estado_conservacion || null,
    comentarios: actual.comentarios || undefined,
    vehiculo: actual.vehiculo?.trim() || null,
    foto_url: actual.foto_url || "",
    foto_url_2: actual.foto_url_2 || "",
    no_dado: !!actual.no_dado,
    para_reparacion: !!actual.para_reparacion,
    para_baja: !!actual.para_baja,
    faltante: !!actual.faltante,
    sobrante: !!actual.sobrante,
    problema_etiqueta: !!actual.problema_etiqueta,
    privado: !!actual.privado,
    valor: parseValor(actual.valor),
  });

  upsertCachedMobiliario(actualizado);
  return actualizado;
}

export async function eliminarMobiliario(id: string): Promise<Mobiliario> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");
  if (!canDeleteMobiliario()) throw new Error("No autorizado: solo Hernan puede eliminar mobiliario");

  const res = await apiFetch(`${API_BASE}/patrimonio/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error(await readApiError(res, "Error al eliminar mobiliario"));
  const data = await res.json();
  removeCachedUltimoMobiliario(id);
  return data;
}

export async function actualizarFotoMobiliario(
  id: string,
  fotoUrl: string,
  slot: 1 | 2 = 1
): Promise<{ foto_url?: string; foto_url_2?: string; fecha_actualizacion?: string } | Mobiliario> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");
  const fotoField = slot === 1 ? "foto_url" : "foto_url_2";

  const res = await apiFetch(`${API_BASE}/mobiliario/${encodeURIComponent(id)}/foto`, {
    method: "PATCH",
    json: { [fotoField]: fotoUrl },
  });

  if (res.ok) {
    const data = await res.json();
    const patch: Partial<MobiliarioUltimo> = { [fotoField]: fotoUrl };
    if (data?.fecha_actualizacion) {
      patch.fecha_actualizacion = data.fecha_actualizacion;
    }
    patchCachedUltimoMobiliario(id, patch);
    return data;
  }

  if (res.status !== 404 && res.status !== 405) {
    throw new Error(await readApiError(res, "Error al actualizar la foto"));
  }

  const actual = await obtenerMobiliarioPorId(id);
  const { numero, tipo } = parseResolucion(actual.resolucion);
  const actualizado = await editarMobiliario(id, {
    ubicacion_id: actual.ubicacion_id,
    clase_bien_id: actual.clase_bien_id ?? actual.id_clase,
    rubro_id: actual.rubro_id ?? actual.id_rubro,
    descripcion: actual.descripcion || undefined,
    resolucion_numero: numero,
    resolucion_tipo: tipo,
    fecha_resolucion: actual.fecha_resolucion || undefined,
    estado_conservacion: actual.estado_conservacion || undefined,
    comentarios: actual.comentarios || undefined,
    foto_url: slot === 1 ? fotoUrl : actual.foto_url || undefined,
    foto_url_2: slot === 2 ? fotoUrl : actual.foto_url_2 || undefined,
    no_dado: !!actual.no_dado,
    para_reparacion: !!actual.para_reparacion,
    para_baja: !!actual.para_baja,
    faltante: !!actual.faltante,
    sobrante: !!actual.sobrante,
    problema_etiqueta: !!actual.problema_etiqueta,
    privado: !!actual.privado,
    valor: parseValor(actual.valor),
  });

  patchCachedUltimoMobiliario(id, { [fotoField]: fotoUrl });
  return actualizado;
}

export async function actualizarEstadoMobiliario(
  id: string,
  estadoConservacion: string
): Promise<{
  id: string;
  estado_conservacion: string;
  fecha_actualizacion?: string | null;
}> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");

  const res = await apiFetch(`${API_BASE}/mobiliario/${encodeURIComponent(id)}/estado`, {
    method: "PATCH",
    json: { estado_conservacion: estadoConservacion },
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, "Error al actualizar el estado"));
  }

  const data = await res.json();
  patchCachedUltimoMobiliario(id, {
    estado_conservacion: data.estado_conservacion,
    fecha_actualizacion: data.fecha_actualizacion,
  });
  return data;
}

export async function duplicarMobiliario(
  id: string,
  cantidad: number
): Promise<{ mensaje: string; id_origen: string; cantidad: number; ids_generados: string[] }> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");

  const res = await apiFetch(`${API_BASE}/mobiliario/${encodeURIComponent(id)}/duplicar`, {
    method: "POST",
    json: { cantidad },
  });

  if (!res.ok) throw new Error(await readApiError(res, "Error al duplicar mobiliario"));
  return res.json();
}

export async function darDeBajaMobiliario(id: string): Promise<Mobiliario> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");
  const res = await apiFetch(`${API_BASE}/mobiliario/${encodeURIComponent(id)}`, {
    method: "PATCH",
    json: { para_baja: true },
  });
  if (!res.ok) throw new Error(await readApiError(res, "Error al dar de baja"));
  return res.json();
}

export async function actualizarFaltanteMobiliario(
  id: string,
  faltante: boolean
): Promise<Mobiliario> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");

  const actual = await obtenerMobiliarioPorId(id);
  const { numero, tipo } = parseResolucion(actual.resolucion);

  return editarMobiliario(id, {
    ubicacion_id: actual.ubicacion_id,
    clase_bien_id: actual.clase_bien_id ?? actual.id_clase,
    rubro_id: actual.rubro_id ?? actual.id_rubro,
    descripcion: actual.descripcion || undefined,
    resolucion_numero: numero,
    resolucion_tipo: tipo,
    fecha_resolucion: actual.fecha_resolucion || undefined,
    estado_conservacion: actual.estado_conservacion || undefined,
    comentarios: actual.comentarios || undefined,
    foto_url: actual.foto_url || undefined,
    foto_url_2: actual.foto_url_2 || undefined,
    no_dado: !!actual.no_dado,
    para_reparacion: !!actual.para_reparacion,
    para_baja: !!actual.para_baja,
    faltante,
    sobrante: !!actual.sobrante,
    problema_etiqueta: !!actual.problema_etiqueta,
    privado: !!actual.privado,
    valor: parseValor(actual.valor),
  });
}

export async function actualizarProblemaEtiquetaMobiliario(
  id: string,
  problemaEtiqueta: boolean
): Promise<Mobiliario> {
  if (isViewer()) throw new Error("No autorizado: solo lectura");

  const actual = await obtenerMobiliarioPorId(id);
  const { numero, tipo } = parseResolucion(actual.resolucion);

  return editarMobiliario(id, {
    ubicacion_id: actual.ubicacion_id,
    clase_bien_id: actual.clase_bien_id ?? actual.id_clase,
    rubro_id: actual.rubro_id ?? actual.id_rubro,
    descripcion: actual.descripcion || undefined,
    resolucion_numero: numero,
    resolucion_tipo: tipo,
    fecha_resolucion: actual.fecha_resolucion || undefined,
    estado_conservacion: actual.estado_conservacion || undefined,
    comentarios: actual.comentarios || undefined,
    foto_url: actual.foto_url || undefined,
    foto_url_2: actual.foto_url_2 || undefined,
    no_dado: !!actual.no_dado,
    para_reparacion: !!actual.para_reparacion,
    para_baja: !!actual.para_baja,
    faltante: !!actual.faltante,
    sobrante: !!actual.sobrante,
    problema_etiqueta: problemaEtiqueta,
    privado: !!actual.privado,
    valor: parseValor(actual.valor),
  });
}
