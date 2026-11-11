
// ---------------------------------- Entidades ----------------------------------

export interface Anexo {
  id: number;
  nombre: string;
}

export interface Subdependencia {
  id: number;
  nombre: string;
  anexo_id: number;
}

export interface ClaseBien {
  id_clase: number;
  descripcion: string;
}

export interface Rubro {
  id_rubro: number;
  nombre: string;
}

export interface Mobiliario {
  id: string;
  descripcion: string;
  resolucion: string;
  fecha_resolucion: string;
  estado_conservacion: string;
  estado_control?: string;
  historial_movimientos?: string;

  no_dado: boolean;
  para_reparacion: boolean;
  para_baja: boolean;
  faltante: boolean;
  sobrante: boolean;
  problema_etiqueta: boolean;

  comentarios?: string;
  vehiculo?: string;
  foto_url?: string;
  foto_url_2?: string;

  anexo: string;
  subdependencia: string;
  rubro?: string;
  clase?: string;
  id_rubro?: number;
  id_clase?: number;
  clase_bien?: string;

  // 👇 nuevos/extra
  valor?: number | string;   // la API puede traer "0.00" (string) o number
  privado?: boolean;

  // 👇 campos agregados para evitar errores de compilación
  ubicacion_id: number;
  fecha_creacion: string;
  fecha_actualizacion: string;

  // 👆 compat
  rubro_id?: number;
  clase_bien_id?: number;
}

// Últimos mobiliarios devueltos por API para Listados
export interface MobiliarioUltimo {
  id_mobiliario: string;
  descripcion: string;
  clase_bien?: string;
  rubro?: string;
  anexo: string;
  direccion_anexo?: string;
  subdependencia: string;

  resolucion?: string;
  estado_conservacion?: string | null;
  estado_control?: string;
  fecha_resolucion?: string;

  comentarios?: string;
  vehiculo?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  foto_url?: string;
  foto_url_2?: string;

  para_baja?: boolean;
  faltante?: boolean;
  no_dado?: boolean;
  para_reparacion?: boolean;
  problema_etiqueta?: boolean;
  sobrante?: boolean;

  valor?: number | string;
  privado?: boolean;

  ubicacion_id?: number;
  id_anexo?: number | string | null;
  id_subdependencia?: number | string | null;
  id_rubro?: number;
  id_clase?: number;
  rubro_id?: number;
  clase_bien_id?: number;
  historial?: string[];
}

// ---------------------------------- Formularios ----------------------------------

export interface FormularioPatrimonio {
  id: string;
  anexo: string;           // id del anexo en string desde el select
  subdependencia: string;  // id de la subdependencia en string
  rubro: string;           // label seleccionado
  clase: string;           // label seleccionado
  id_rubro?: number;       // ids “reales” (para payload)
  id_clase?: number;

  descripcion: string;

  resolucionNumero?: string;
  resolucionTipo?: string;
  fechaResolucion?: string;

  estado?: string;

  comentarios?: string;
  vehiculo?: string;
  foto_url?: string;
  foto_url_2?: string;

  // 👇 nuevos del form
  valor?: string;   // string en el form (ej: "0.00"); se parsea al enviar

  opciones: {
    noDado: boolean;
    reparacion: boolean;
    paraBaja: boolean;
    faltante: boolean;
    sobrante: boolean;
    etiqueta: boolean;
    privado: boolean; // 👈 privado vive dentro de opciones
  };
}

// ---------------------------------- Payloads API ----------------------------------
// ✅ Todo opcional para permitir payloads parciales desde el front

export interface PatrimonioCreatePayload {
  id?: string;
  ubicacion_id?: number;
  clase_bien_id?: number;
  rubro_id?: number;
  descripcion?: string;

  resolucion_numero?: string;
  resolucion_tipo?: string;
  fecha_resolucion?: string;

  estado_conservacion?: string | null;

  no_dado?: boolean;
  para_reparacion?: boolean;
  para_baja?: boolean;
  faltante?: boolean;
  sobrante?: boolean;
  problema_etiqueta?: boolean;

  comentarios?: string;
  vehiculo?: string | null;
  foto_url?: string;
  foto_url_2?: string;

  valor?: number | null;   // en la API lo mandamos como número o null para limpiar
  privado?: boolean;
}

export type PatrimonioUpdatePayload = Partial<PatrimonioCreatePayload>;


