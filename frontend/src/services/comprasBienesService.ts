import { csrfHeaders } from "./csrfService";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export type CompraBienItem = {
  id?: number;
  orden?: number;
  posible_ubicacion: string;
  cantidad: number;
  descripcion_factura: string;
  fecha_compra: string;
  fecha_listado: string;
  estado_relevamiento: string;
  proveedor?: string;
  valor_compra?: string | null;
};

export type CompraProveedor = { id: number; nombre: string };

export type CompraBienMensaje = {
  id: number;
  autor: string;
  contenido: string;
  fecha_creacion: string | null;
};

export type CompraBienReporte = {
  id: number;
  anio: number;
  mes: number;
  observaciones: string;
  creado_por: string;
  visto_por_dante_at: string | null;
  fecha_creacion: string | null;
  fecha_actualizacion: string | null;
  total_items: number;
  total_unidades: number;
  mensajes_count: number;
  items?: CompraBienItem[];
  mensajes?: CompraBienMensaje[];
};

export type CompraBienPayload = {
  anio: number;
  mes: number;
  observaciones: string;
  items: CompraBienItem[];
};

async function errorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function listarProveedoresCompras(): Promise<CompraProveedor[]> {
  const response = await fetch(`${API_BASE}/compras-bienes/proveedores`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error(await errorMessage(response, "No se pudieron cargar los proveedores"));
  return response.json();
}

export async function crearProveedorCompras(nombre: string): Promise<CompraProveedor> {
  const response = await fetch(`${API_BASE}/compras-bienes/proveedores`, {
    method: "POST", credentials: "include", headers: await csrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ nombre }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "No se pudo guardar el proveedor"));
  return response.json();
}

export async function editarProveedorCompras(id: number, nombre: string): Promise<CompraProveedor> {
  const response = await fetch(`${API_BASE}/compras-bienes/proveedores/${id}`, {
    method: "PUT", credentials: "include", headers: await csrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ nombre }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "No se pudo editar el proveedor"));
  return response.json();
}

export async function eliminarProveedorCompras(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/compras-bienes/proveedores/${id}`, {
    method: "DELETE", credentials: "include", headers: await csrfHeaders(),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "No se pudo quitar el proveedor"));
}

export async function listarReportesCompras(): Promise<CompraBienReporte[]> {
  const response = await fetch(`${API_BASE}/compras-bienes/reportes`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error(await errorMessage(response, "No se pudieron cargar los reportes"));
  return response.json();
}

export async function obtenerReporteCompras(id: number): Promise<CompraBienReporte> {
  const response = await fetch(`${API_BASE}/compras-bienes/reportes/${id}`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error(await errorMessage(response, "No se pudo cargar el reporte"));
  return response.json();
}

export async function guardarReporteCompras(payload: CompraBienPayload, id?: number): Promise<CompraBienReporte> {
  const response = await fetch(`${API_BASE}/compras-bienes/reportes${id ? `/${id}` : ""}`, {
    method: id ? "PUT" : "POST",
    credentials: "include",
    headers: await csrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "No se pudo guardar el reporte"));
  return response.json();
}

export async function enviarMensajeCompras(id: number, contenido: string): Promise<CompraBienMensaje> {
  const response = await fetch(`${API_BASE}/compras-bienes/reportes/${id}/mensajes`, {
    method: "POST",
    credentials: "include",
    headers: await csrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ contenido }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "No se pudo enviar el mensaje"));
  return response.json();
}

export async function marcarReporteComprasLeido(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/compras-bienes/reportes/${id}/leer`, {
    method: "POST",
    credentials: "include",
    headers: await csrfHeaders(),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "No se pudo registrar la lectura"));
}

export async function obtenerNotificacionesCompras(): Promise<{ pendientes: number }> {
  const response = await fetch(`${API_BASE}/compras-bienes/notificaciones`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error(await errorMessage(response, "No se pudieron cargar las notificaciones"));
  return response.json();
}
