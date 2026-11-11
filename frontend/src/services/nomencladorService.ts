
// services/nomencladorService.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export interface Rubro {
  id_rubro: number;
  nombre: string;
}

export interface Clase {
  id_rubro: number;
  id_clase: number;
  descripcion: string;
}

export const obtenerRubros = async (): Promise<Rubro[]> => {
  const res = await fetch(`${API_BASE}/rubros`, { credentials: "include" });
  if (!res.ok) throw new Error("Error al obtener rubros");
  return res.json();
};

export const obtenerClasesPorRubro = async (rubro_id: number): Promise<Clase[]> => {
  const res = await fetch(`${API_BASE}/clases-por-rubro?rubro_id=${rubro_id}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error al obtener clases");
  return res.json();
};

export const buscarClases = async (query: string): Promise<Clase[]> => {
  const res = await fetch(
    `${API_BASE}/buscar-clase-global?query=${encodeURIComponent(query)}`,
    { credentials: "include" }
  );

  if (!res.ok) throw new Error("Error al buscar clases");

  return res.json();
};
