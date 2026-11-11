
// src/types/diputados.ts
export interface Diputado {
  id?: number;
  nombre: string;
  departamento: string;
  partido: string;
  bloque?: string;
  mandato: string;
  anexo?: string;
  direccion?: string;
  foto?: string;
  foto_url?: string;
  ubicacion_id?: number | null;
  subdependencia?: string | null;
  anexo_id?: number | null;
  activo?: boolean;
  fecha_creacion?: string | null;
  fecha_actualizacion?: string | null;
}
