// 
const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export interface ListadoItem {
  id: string;
  descripcion: string;
  estado_conservacion: string | null;
  observaciones: string[];
}

export interface ListadoClase {
  clase_id: number | null;
  clase_nombre: string;
  items: ListadoItem[];
}

export interface ListadoRubro {
  rubro_id: number | null;
  rubro_nombre: string;
  clases: ListadoClase[];
}

export interface ListadoResponse {
  anexo_id: number | null;
  anexo_nombre: string;
  subdependencia_id: number | null;
  subdependencia_nombre: string;
  fecha_emision: string;
  tipo_listado: "clasico" | "entrega";
  total_bienes: number;
  filtros_aplicados: {
    filtros: string[];
    filtros_labels: string[];
    estado_conservacion: string;
    incluir_faltantes: boolean;
  };
  grupos: ListadoRubro[];
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

export interface GenerarListadoParams {
  anexo?: string;
  subdependencia?: string;
  rubro?: string;
  clase?: string;
  estado_conservacion?: string;
  tipo_listado?: "clasico" | "entrega";
  filtros?: string[];
  incluir_faltantes?: boolean;
}

function buildQueryString(params: GenerarListadoParams) {
  const qs = new URLSearchParams();

  if (params.anexo) qs.set("anexo", params.anexo);
  if (params.subdependencia) qs.set("subdependencia", params.subdependencia);
  if (params.rubro) qs.set("rubro", params.rubro);
  if (params.clase) qs.set("clase", params.clase);
  if (params.estado_conservacion) qs.set("estado_conservacion", params.estado_conservacion);
  if (params.tipo_listado) qs.set("tipo_listado", params.tipo_listado);
  if (params.incluir_faltantes) qs.set("incluir_faltantes", "true");

  if (params.filtros?.length) {
    params.filtros.forEach((f) => qs.append("filtros", f));
  }

  return qs.toString();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Error en la solicitud");
  }

  return res.json();
}

export async function obtenerAnexos(): Promise<AnexoOption[]> {
  return fetchJson<AnexoOption[]>(`${API_BASE}/anexos`);
}

export async function obtenerSubdependenciasPorAnexo(
  anexoId: number | "todos"
): Promise<SubdependenciaOption[]> {
  return fetchJson<SubdependenciaOption[]>(`${API_BASE}/subdependencias_por_anexo/${anexoId}`);
}

export async function obtenerRubros(): Promise<RubroOption[]> {
  return fetchJson<RubroOption[]>(`${API_BASE}/rubros`);
}

export async function obtenerClasesPorRubro(rubroId: number): Promise<ClaseOption[]> {
  return fetchJson<ClaseOption[]>(`${API_BASE}/clases-por-rubro?rubro_id=${rubroId}`);
}

export async function generarListadoJson(
  params: GenerarListadoParams
): Promise<ListadoResponse> {
  const queryString = buildQueryString(params);
  return fetchJson<ListadoResponse>(`${API_BASE}/listados/generar-json?${queryString}`);
}