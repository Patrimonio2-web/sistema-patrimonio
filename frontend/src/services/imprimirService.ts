
// src/services/imprimirService.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export interface Anexo {
  id: number;
  nombre: string;
}

export interface Subdependencia {
  id: number;
  nombre: string;
}

const toQuery = (params: Record<string, string | number | boolean | undefined>) =>
  new URLSearchParams(
    Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
      if (v !== undefined && v !== null) acc[k] = String(v);
      return acc;
    }, {})
  ).toString();

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.text();
}

/** ----------------- API pública ----------------- **/

export const getAnexos = () => get<Anexo[]>(`${API_BASE}/anexos`);

export const getSubdependenciasPorAnexo = (anexoId: string | number) =>
  get<Subdependencia[]>(`${API_BASE}/subdependencias_por_anexo/${anexoId}`);

export const getPreviewListado = (params: {
  anexo: string | number;
  subdependencia: string | number;
  incluir_faltantes: boolean;
  filtros?: string[]; // si luego sumás filtros, ya está previsto
}) => {
  const qs = toQuery({
    anexo: params.anexo,
    subdependencia: params.subdependencia,
    incluir_faltantes: params.incluir_faltantes,
    filtros: params.filtros?.join(","),
  });
  return getText(`${API_BASE}/imprimir_listado_preview?${qs}`);
};

export const buildPrintUrl = (params: {
  anexo: string | number;
  subdependencia: string | number;
  incluir_faltantes: boolean;
  filtros?: string[];
}) => {
  const qs = toQuery({
    anexo: params.anexo,
    subdependencia: params.subdependencia,
    incluir_faltantes: params.incluir_faltantes,
    filtros: params.filtros?.join(","),
  });
  return `${API_BASE}/imprimir_listado?${qs}`;
};

export const openPrintWindow = (params: {
  anexo: string | number;
  subdependencia: string | number;
  incluir_faltantes: boolean;
  filtros?: string[];
}) => {
  const url = buildPrintUrl(params);
  window.open(url, "_blank");
};
