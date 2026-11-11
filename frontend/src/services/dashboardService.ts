
// src/services/dashboardService.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE!; // /api mediante el proxy de Next.js

export interface KPIBlock {
  mobiliario: number;
  anexos: number;
  subdependencias: number;
  altas: number;
}

export interface SerieItem { mes: string; value: number }
export interface PieItem   { label: string; value: number }

export interface DashboardAlertas {
  no_dado: number;
  para_reparacion: number;
  para_baja: number;
  faltantes: number;
  sobrantes: number;
  problema_etiqueta: number;
  sin_estado: number;
  sin_foto: number;
  sin_rubro: number;
  sin_clase: number;
}

export interface DashboardResponse {
  kpis: KPIBlock;
  por_estado: PieItem[];
  por_rubro:  PieItem[];
  por_anexo:  PieItem[];
  por_clase?: PieItem[];
  destacados?: PieItem[];
  alertas?: DashboardAlertas;
  serie_mobiliario: SerieItem[]; // YYYY-MM
  serie_altas:      SerieItem[]; // YYYY-MM
}

export async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await fetch(`${API_BASE}/dashboard`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    let msg = "No se pudo cargar el dashboard";
    try { msg = (await res.json())?.error || msg } catch {}
    throw new Error(msg);
  }
  return res.json();
}
