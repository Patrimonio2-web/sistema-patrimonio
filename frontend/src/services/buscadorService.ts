// src/servie/buscadorServie.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export type FlagKey =
  | "faltante"
  | "para_baja"
  | "para_reparacion"
  | "sobrante"
  | "problema_etiqueta"
  | "no_dado";

export interface BuscadorItem {
  id_mobiliario: string;
  ubicacion_id: number | null;
  descripcion: string | null;
  estado_conservacion: string | null;
  estado_control: string | null;
  resolucion: string | null;
  fecha_resolucion: string | null;
  no_dado: boolean;
  para_reparacion: boolean;
  para_baja: boolean;
  faltante: boolean;
  sobrante: boolean;
  problema_etiqueta: boolean;
  comentarios: string | null;
  vehiculo: string | null;
  foto_url: string | null;
  foto_url_2?: string | null;
  fecha_creacion: string | null;
  fecha_actualizacion: string | null;
  rubro: string | null;
  clase_bien: string | null;
  id_subdependencia: number | null;
  subdependencia: string | null;
  id_anexo: number | null;
  anexo: string | null;
  direccion_anexo: string | null;
}

export interface BuscadorMeta {
  total: number;
  page: number;
  per_page: number;
  pages: number;
  order_by: string;
  order_dir: string;
}

export interface BuscarMobiliarioResponse {
  items: BuscadorItem[];
  meta: BuscadorMeta;
}

export interface BuscarMobiliarioParams {
  q?: string;
  search_field?: "descripcion" | "id" | "todo";
  anexo_id?: number;
  subdependencia_id?: number;
  rubro_id?: number;
  clase_id?: number;
  estado_conservacion?: string;
  flag?: FlagKey[];
  page?: number;
  per_page?: number;
  order_by?: "id" | "fecha_creacion" | "fecha_actualizacion" | "descripcion" | "anexo" | "subdependencia" | "vehiculo" | "rubro" | "clase";
  order_dir?: "asc" | "desc";
}

export interface AnexoOption {
  id: number;
  nombre: string;
}

export interface SubdependenciaOption {
  id: number;
  nombre: string;
}

export interface RubroOption {
  id_rubro: number;
  nombre: string;
}

export interface ClaseOption {
  id_clase: number;
  descripcion: string;
  id_rubro: number;
}

function buildQueryString(params: BuscarMobiliarioParams) {
  const qs = new URLSearchParams();

  if (params.q) qs.set("q", params.q);
  if (params.search_field) qs.set("search_field", params.search_field);
  if (params.anexo_id) qs.set("anexo_id", String(params.anexo_id));
  if (params.subdependencia_id) qs.set("subdependencia_id", String(params.subdependencia_id));
  if (params.rubro_id) qs.set("rubro_id", String(params.rubro_id));
  if (params.clase_id) qs.set("clase_id", String(params.clase_id));
  if (params.estado_conservacion) qs.set("estado_conservacion", params.estado_conservacion);
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.order_by) qs.set("order_by", params.order_by);
  if (params.order_dir) qs.set("order_dir", params.order_dir);

  if (params.flag?.length) {
    params.flag.forEach((f) => qs.append("flag", f));
  }

  return qs.toString();
}

export async function buscarMobiliario(params: BuscarMobiliarioParams, signal?: AbortSignal): Promise<BuscarMobiliarioResponse> {
  const queryString = buildQueryString(params);
  const res = await fetch(`${API_BASE}/mobiliario/buscar?${queryString}`, {
    credentials: "include",
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Error al buscar mobiliario");
  }

  return res.json();
}

export async function obtenerAnexos(): Promise<AnexoOption[]> {
  const res = await fetch(`${API_BASE}/anexos`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Error al obtener anexos");
  return res.json();
}

export async function obtenerSubdependenciasPorAnexo(anexoId: number | "todos"): Promise<SubdependenciaOption[]> {
  const res = await fetch(`${API_BASE}/subdependencias_por_anexo/${anexoId}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Error al obtener subdependencias");
  return res.json();
}

export async function obtenerRubros(): Promise<RubroOption[]> {
  const res = await fetch(`${API_BASE}/rubros`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Error al obtener rubros");
  return res.json();
}

export async function obtenerClasesPorRubro(rubroId: number): Promise<ClaseOption[]> {
  const res = await fetch(`${API_BASE}/clases-por-rubro?rubro_id=${rubroId}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Error al obtener clases");
  return res.json();
}
