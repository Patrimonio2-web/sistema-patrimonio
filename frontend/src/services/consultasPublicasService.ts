import { fetchWithUser } from "./fetchWithUser";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export type ConsultaPublicaEstado = "pendiente" | "en_revision" | "resuelta";

export type ConsultaPublicaContexto = {
  kind?: string;
  itemId?: string;
  estado?: string;
  anexo?: string;
  subdependencia?: string;
  total?: string;
};

export type ConsultaPublica = {
  id: number;
  nombre_apellido: string;
  anexo: string;
  oficina: string;
  consulta: string;
  contexto: ConsultaPublicaContexto;
  pagina_origen?: string | null;
  estado: ConsultaPublicaEstado;
  nota_interna: string;
  atendido_por?: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
};

export type ConsultaPublicaResumen = Record<ConsultaPublicaEstado, number> & {
  total: number;
};

export type NuevaConsultaPublica = {
  nombre_apellido: string;
  anexo: string;
  oficina: string;
  consulta: string;
  contexto: ConsultaPublicaContexto;
  pagina_origen: string;
  website?: string;
};

async function apiError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return data?.error || data?.mensaje || fallback;
  } catch {
    return fallback;
  }
}

export async function enviarConsultaPublica(data: NuevaConsultaPublica) {
  const response = await fetch(`${API_BASE}/consultas-publicas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await apiError(response, "No se pudo enviar el mensaje"));
  return response.json() as Promise<{ id: number; mensaje: string; fecha_creacion: string }>;
}

export async function listarConsultasPublicas(params: {
  estado?: ConsultaPublicaEstado;
  q?: string;
} = {}) {
  const search = new URLSearchParams({ limit: "200" });
  if (params.estado) search.set("estado", params.estado);
  if (params.q?.trim()) search.set("q", params.q.trim());
  const response = await fetchWithUser(`${API_BASE}/consultas-publicas?${search}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await apiError(response, "No se pudieron cargar los mensajes"));
  return response.json() as Promise<{
    consultas: ConsultaPublica[];
    resumen: ConsultaPublicaResumen;
  }>;
}

export async function obtenerNotificacionesConsultasPublicas() {
  const response = await fetchWithUser(`${API_BASE}/consultas-publicas/notificaciones`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await apiError(response, "No se pudieron cargar las notificaciones"));
  return response.json() as Promise<{ pendientes: number }>;
}

export async function actualizarConsultaPublica(
  id: number,
  data: { estado: ConsultaPublicaEstado; nota_interna: string }
) {
  const response = await fetchWithUser(`${API_BASE}/consultas-publicas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await apiError(response, "No se pudo actualizar el mensaje"));
  return response.json() as Promise<ConsultaPublica>;
}
