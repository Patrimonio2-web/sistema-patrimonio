
"use client";

import { useEffect, useMemo, useState } from "react";
import { Wrapper } from "@/components";
import MobiliarioPhotoGallery from "@/components/MobiliarioPhotoGallery";
import { formatMobiliarioDate } from "@/lib/dateFormat";
import { obtenerMobiliariosParaBaja } from "@/services/mobiliarioService";
import type { Mobiliario } from "@/types/types";
import {
  AlertTriangle,
  Archive,
  Building2,
  Package,
  Search,
  Tag,
  Wrench,
} from "lucide-react";

export default function Bajas() {
  const [mobiliarios, setMobiliarios] = useState<Mobiliario[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAndSetMobiliario();
  }, []);

  const fetchAndSetMobiliario = async () => {
    try {
      setLoading(true);
      const data = await obtenerMobiliariosParaBaja();
      setMobiliarios(data);
    } catch (_error) {
      console.error("Error al obtener mobiliario dado de baja", _error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return mobiliarios.filter(
      (item) =>
        item.id?.toLowerCase().includes(search.toLowerCase()) ||
        item.descripcion?.toLowerCase().includes(search.toLowerCase())
    );
  }, [mobiliarios, search]);

  return (
    <Wrapper>
      <main className="min-h-screen bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 px-6 py-10 transition-colors duration-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-200">
                  <Archive className="h-4 w-4" />
                  Bienes marcados para baja
                </div>

                <h1 className="text-3xl font-extrabold text-blue-900 dark:text-white md:text-4xl">
                  Mobiliario Dado de Baja
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300 md:text-base">
                  Visualizá todos los bienes que actualmente están marcados para baja,
                  con información clave para control y seguimiento.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:min-w-[300px]">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Total de bienes
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
                    {mobiliarios.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Resultados filtrados
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
                    {filtered.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="relative mx-auto max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por ID o descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full rounded-2xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-900/30"
              />
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <p className="text-gray-500 dark:text-gray-400">Cargando mobiliarios dados de baja...</p>
            </div>
          ) : filtered.length > 0 ? (
            <ul className="space-y-5">
              {filtered.map((item) => (
                <li
                  key={item.id}
                  className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_220px]">
                    <div>
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                            {item.descripcion || "Sin descripción"}
                          </h2>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            ID: <span className="font-semibold">{item.id}</span>
                          </p>
                        </div>

                        <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-200">
                          <AlertTriangle className="h-4 w-4" />
                          Para baja
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm text-gray-700 dark:text-gray-200 md:grid-cols-2 xl:grid-cols-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span>
                            <strong>Anexo:</strong> {item.anexo || "—"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                          <span>
                            <strong>Subdependencia:</strong> {item.subdependencia || "—"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                          <span>
                            <strong>Rubro:</strong> {item.rubro || "—"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span>
                            <strong>Clase:</strong> {item.clase_bien || "—"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span>
                            <strong>Estado:</strong> {item.estado_conservacion || "—"}
                          </span>
                        </div>

                        <div>
                          <strong>Actualizado:</strong> {formatMobiliarioDate(item.fecha_actualizacion, "datetime")}
                        </div>
                      </div>

                      {item.comentarios && (
                        <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
                          <strong>Comentarios:</strong> {item.comentarios}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center">
                      <MobiliarioPhotoGallery
                        photos={[item.foto_url, item.foto_url_2]}
                        alt={item.descripcion || "Imagen del bien"}
                        className="h-40 w-full rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40"
                        imageClassName="object-cover"
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center shadow-sm dark:border-gray-600 dark:bg-gray-800">
              <Archive className="mx-auto mb-4 h-10 w-10 text-gray-400 dark:text-gray-500" />
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                No se encontraron registros dados de baja
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Probá con otra búsqueda o verificá si existen bienes marcados para baja.
              </p>
            </div>
          )}
        </div>
      </main>
    </Wrapper>
  );
}
