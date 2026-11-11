"use client";

import { canAdminMatafuegos, canEditMatafuegos } from "@/services/authRole";
import { fetchWithUser } from "@/services/fetchWithUser";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export type MatafuegoAlerta =
  | "vencido"
  | "vence_10"
  | "vence_30"
  | "vence_90"
  | "vigente"
  | "sin_fecha"
  | "inactivo"
  | "sin_matafuegos";

export interface MatafuegoResumen {
  id_anexo: number;
  total: number;
  vencidos: number;
  vence_10: number;
  vence_30: number;
  vence_90: number;
  sin_fecha: number;
  vigentes: number;
  criticos: number;
  alerta_principal: MatafuegoAlerta;
}

export interface Matafuego {
  id: number;
  id_anexo: number;
  anexo: string;
  id_subdependencia?: number | null;
  subdependencia?: string | null;
  id_mobiliario?: string | null;
  descripcion_mobiliario?: string | null;
  vehiculo?: string | null;
  foto_url?: string | null;
  foto_url_2?: string | null;
  codigo?: string | null;
  ubicacion_detalle?: string | null;
  tipo?: string | null;
  capacidad?: string | null;
  fecha_vencimiento?: string | null;
  fecha_control?: string | null;
  fecha_recarga?: string | null;
  estado_recarga?: "M" | "B" | null;
  senalizacion?: boolean | null;
  presion_adecuada?: boolean | null;
  color_marbete?: string | null;
  prueba_hidraulica?: string | null;
  estado: "activo" | "inactivo";
  observaciones?: string | null;
  dias_para_vencer?: number | null;
  alerta: MatafuegoAlerta;
  fecha_creacion?: string | null;
  fecha_actualizacion?: string | null;
}

export interface MatafuegoCandidato {
  id_mobiliario: string;
  descripcion?: string | null;
  foto_url?: string | null;
  foto_url_2?: string | null;
  comentarios?: string | null;
  vehiculo?: string | null;
  id_subdependencia: number;
  subdependencia: string;
  id_anexo: number;
  anexo: string;
  clase_bien?: string | null;
  rubro?: string | null;
}

export interface MatafuegoPayload {
  id_anexo: number;
  id_subdependencia?: number | null;
  id_mobiliario?: string | null;
  vehiculo?: string | null;
  codigo?: string | null;
  ubicacion_detalle?: string | null;
  tipo?: string | null;
  capacidad?: string | null;
  fecha_vencimiento?: string | null;
  fecha_control?: string | null;
  fecha_recarga?: string | null;
  estado_recarga?: "M" | "B" | null;
  senalizacion?: boolean | null;
  presion_adecuada?: boolean | null;
  color_marbete?: string | null;
  prueba_hidraulica?: string | null;
  estado?: "activo" | "inactivo";
  observaciones?: string | null;
}

export const MATAFUEGO_COLOR_MARBETE_OPTIONS = [
  { value: "", label: "Sin color", className: "bg-slate-200", hex: "#cbd5e1" },
  { value: "celeste", label: "Celeste", className: "bg-cyan-400", hex: "#22d3ee" },
  { value: "verde_oscuro", label: "Verde oscuro", className: "bg-green-700", hex: "#15803d" },
  { value: "azul", label: "Azul", className: "bg-blue-700", hex: "#1d4ed8" },
  { value: "lila", label: "Lila", className: "bg-purple-400", hex: "#c084fc" },
  { value: "blanco", label: "Blanco", className: "bg-white ring-1 ring-slate-300", hex: "#ffffff" },
  { value: "verde_claro", label: "Verde claro", className: "bg-lime-500", hex: "#84cc16" },
  { value: "naranja", label: "Naranja", className: "bg-orange-500", hex: "#f97316" },
  { value: "marron_claro", label: "Marrón claro", className: "bg-amber-800", hex: "#92400e" },
  { value: "negro", label: "Negro", className: "bg-slate-950", hex: "#0f172a" },
  { value: "amarillo", label: "Amarillo", className: "bg-yellow-300", hex: "#fde047" },
] as const;

export type MatafuegoMarbeteOption = (typeof MATAFUEGO_COLOR_MARBETE_OPTIONS)[number];

function normalizeMarbeteValue(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function matafuegoMarbeteOption(value?: string | null): MatafuegoMarbeteOption {
  const normalized = normalizeMarbeteValue(value);
  const aliases: Record<string, string> = {
    verde: "verde_oscuro",
    violeta: "lila",
    marron: "marron_claro",
  };
  const canonical = aliases[normalized] || normalized;
  return (
    MATAFUEGO_COLOR_MARBETE_OPTIONS.find((option) => option.value === canonical) ||
    MATAFUEGO_COLOR_MARBETE_OPTIONS[0]
  );
}

export function matafuegoMarbetePorAnio(year: number): MatafuegoMarbeteOption {
  const cycle = MATAFUEGO_COLOR_MARBETE_OPTIONS.slice(1);
  const index = ((year - 2003) % cycle.length + cycle.length) % cycle.length;
  return cycle[index];
}

export function isMatafuegoConAlerta(item: Pick<Matafuego, "alerta">) {
  return ["vencido", "vence_10", "vence_30", "vence_90"].includes(item.alerta);
}

export function matafuegoAlertaLabel(alerta: MatafuegoAlerta) {
  const labels: Record<MatafuegoAlerta, string> = {
    vencido: "Vencido",
    vence_10: "Vence en 10 dias",
    vence_30: "Vence en 30 dias",
    vence_90: "Vence en 90 dias",
    vigente: "Vigente",
    sin_fecha: "Sin fecha",
    inactivo: "Inactivo",
    sin_matafuegos: "Sin matafuegos",
  };
  return labels[alerta] ?? "Sin fecha";
}

export function matafuegoAlertaPriority(alerta: MatafuegoAlerta) {
  const priority: Record<MatafuegoAlerta, number> = {
    vencido: 0,
    vence_10: 1,
    vence_30: 2,
    vence_90: 3,
    sin_fecha: 4,
    vigente: 5,
    inactivo: 6,
    sin_matafuegos: 7,
  };
  return priority[alerta] ?? 99;
}

export function emitMatafuegosUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("matafuegos:updated"));
  }
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

export async function obtenerResumenMatafuegos(): Promise<MatafuegoResumen[]> {
  const res = await fetchWithUser(`${API_BASE}/matafuegos/anexos/resumen`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await readError(res, "Error al obtener resumen de matafuegos"));
  return res.json();
}

export async function obtenerMatafuegosTodos(): Promise<Matafuego[]> {
  const res = await fetchWithUser(`${API_BASE}/matafuegos`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await readError(res, "Error al obtener matafuegos"));
  return res.json();
}

export async function obtenerMatafuegosPorAnexo(idAnexo: number): Promise<Matafuego[]> {
  const res = await fetchWithUser(`${API_BASE}/matafuegos/anexos/${idAnexo}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await readError(res, "Error al obtener matafuegos"));
  return res.json();
}

export async function obtenerCandidatosMatafuegos(idAnexo?: number): Promise<MatafuegoCandidato[]> {
  const query = idAnexo ? `?anexo_id=${encodeURIComponent(idAnexo)}` : "";
  const res = await fetchWithUser(`${API_BASE}/matafuegos/candidatos${query}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await readError(res, "Error al obtener candidatos"));
  return res.json();
}

export async function crearMatafuego(payload: MatafuegoPayload): Promise<Matafuego> {
  if (!canAdminMatafuegos()) throw new Error("No autorizado para crear matafuegos");
  const res = await fetchWithUser(`${API_BASE}/matafuegos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res, "Error al crear matafuego"));
  return res.json();
}

export async function editarMatafuego(id: number, payload: MatafuegoPayload): Promise<Matafuego> {
  if (!canEditMatafuegos()) throw new Error("No autorizado: solo lectura");
  const res = await fetchWithUser(`${API_BASE}/matafuegos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res, "Error al editar matafuego"));
  return res.json();
}

export async function desactivarMatafuego(id: number) {
  if (!canAdminMatafuegos()) throw new Error("No autorizado para quitar matafuegos");
  const res = await fetchWithUser(`${API_BASE}/matafuegos/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readError(res, "Error al quitar matafuego"));
  return res.json();
}

export async function importarMatafuegosDesdeMobiliario(
  idsMobiliario: string[],
  payload: Pick<MatafuegoPayload, "fecha_vencimiento" | "fecha_control" | "observaciones">
): Promise<{ importados: Matafuego[]; cantidad: number }> {
  if (!canAdminMatafuegos()) throw new Error("No autorizado para importar matafuegos");
  const res = await fetchWithUser(`${API_BASE}/matafuegos/importar-mobiliario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ids_mobiliario: idsMobiliario,
      ...payload,
    }),
  });
  if (!res.ok) throw new Error(await readError(res, "Error al importar matafuegos"));
  return res.json();
}
