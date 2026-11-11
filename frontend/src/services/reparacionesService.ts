import { fetchWithUser } from "./fetchWithUser";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export type ReparacionEstado = "en_reparacion" | "finalizada";

export type ReparacionMobiliario = {
  id: number;
  mobiliario_id: string;
  reparado_por: string;
  trabajo_realizado: string;
  fecha_salida: string;
  fecha_retorno?: string | null;
  observaciones: string;
  estado: ReparacionEstado;
  creado_por?: string | null;
  finalizado_por?: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
};

export type ReparacionPayload = {
  reparado_por: string;
  trabajo_realizado: string;
  fecha_salida: string;
  fecha_retorno?: string;
  observaciones?: string;
};

export type ReparacionesResponse = {
  mobiliario_id: string;
  para_reparacion: boolean;
  reparaciones: ReparacionMobiliario[];
};

export type ReparacionMutationResponse = {
  mensaje: string;
  para_reparacion: boolean;
  reparacion: ReparacionMobiliario;
};

async function apiError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return data?.error || data?.mensaje || fallback;
  } catch {
    return fallback;
  }
}

export async function listarReparaciones(
  mobiliarioId: string
): Promise<ReparacionesResponse> {
  const response = await fetchWithUser(
    `${API_BASE}/mobiliario/${encodeURIComponent(mobiliarioId)}/reparaciones`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    throw new Error(await apiError(response, "No se pudo cargar el historial de reparaciones"));
  }
  return response.json();
}

export async function crearReparacion(
  mobiliarioId: string,
  data: ReparacionPayload
): Promise<ReparacionMutationResponse> {
  const response = await fetchWithUser(
    `${API_BASE}/mobiliario/${encodeURIComponent(mobiliarioId)}/reparaciones`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    throw new Error(await apiError(response, "No se pudo registrar la reparacion"));
  }
  return response.json();
}

export async function finalizarReparacion(
  mobiliarioId: string,
  reparacionId: number,
  data: ReparacionPayload
): Promise<ReparacionMutationResponse> {
  const response = await fetchWithUser(
    `${API_BASE}/mobiliario/${encodeURIComponent(mobiliarioId)}/reparaciones/${reparacionId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    throw new Error(await apiError(response, "No se pudo finalizar la reparacion"));
  }
  return response.json();
}

export async function quitarMarcaReparacion(mobiliarioId: string) {
  const response = await fetchWithUser(
    `${API_BASE}/mobiliario/${encodeURIComponent(mobiliarioId)}/reparacion/marca`,
    { method: "PATCH" }
  );
  if (!response.ok) {
    throw new Error(await apiError(response, "No se pudo quitar la marca de reparacion"));
  }
  return response.json() as Promise<{ mensaje: string; para_reparacion: false }>;
}
