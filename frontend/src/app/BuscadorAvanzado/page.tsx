//src/app/BuscadorAvanzado/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import {
  HiSearch,
  HiRefresh,
  HiChevronLeft,
  HiChevronRight,
  HiOfficeBuilding,
  HiTruck,
  HiCollection,
  HiTag,
} from "react-icons/hi";
import { Wrapper } from "@/components";
import MobiliarioPhotoGallery from "@/components/MobiliarioPhotoGallery";
import {
  buscarMobiliario,
  obtenerAnexos,
  obtenerSubdependenciasPorAnexo,
  obtenerRubros,
  obtenerClasesPorRubro,
  type BuscadorItem,
  type AnexoOption,
  type SubdependenciaOption,
  type RubroOption,
  type ClaseOption,
  type FlagKey,
} from "@/services/buscadorService";
import { formatMobiliarioDate } from "@/lib/dateFormat";
import { visibleVehicle } from "@/lib/mobiliarioVehicle";

const FLAG_LABELS: Record<FlagKey, string> = {
  faltante: "Faltante",
  para_baja: "Para baja",
  para_reparacion: "Reparación",
  sobrante: "Sobrante",
  problema_etiqueta: "Etiqueta",
  no_dado: "Numero dado",
};

const FLAG_STYLES: Record<FlagKey, string> = {
  faltante: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  para_baja: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  para_reparacion: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  sobrante: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
  problema_etiqueta: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  no_dado: "bg-slate-200 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
};

function ItemFlags({ item }: { item: BuscadorItem }) {
  const actives: FlagKey[] = [];
  if (item.faltante) actives.push("faltante");
  if (item.para_baja) actives.push("para_baja");
  if (item.para_reparacion) actives.push("para_reparacion");
  if (item.sobrante) actives.push("sobrante");
  if (item.problema_etiqueta) actives.push("problema_etiqueta");
  if (item.no_dado) actives.push("no_dado");

  if (!actives.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {actives.map((flag) => (
        <span
          key={flag}
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${FLAG_STYLES[flag]}`}
        >
          {FLAG_LABELS[flag]}
        </span>
      ))}
    </div>
  );
}

export default function BuscadorAvanzadoPage() {
  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<"descripcion" | "id" | "todo">("descripcion");
  const [anexoId, setAnexoId] = useState("");
  const [subdependenciaId, setSubdependenciaId] = useState("");
  const [rubroId, setRubroId] = useState("");
  const [claseId, setClaseId] = useState("");
  const [estadoConservacion, setEstadoConservacion] = useState("");
  const [orderBy, setOrderBy] = useState<"id" | "fecha_actualizacion" | "descripcion">("id");
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("desc");
  const [flags, setFlags] = useState<FlagKey[]>([]);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const [items, setItems] = useState<BuscadorItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const activeSearch = useRef<AbortController | null>(null);
  const autoSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [anexos, setAnexos] = useState<AnexoOption[]>([]);
  const [subdependencias, setSubdependencias] = useState<SubdependenciaOption[]>([]);
  const [rubros, setRubros] = useState<RubroOption[]>([]);
  const [clases, setClases] = useState<ClaseOption[]>([]);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [anexosData, rubrosData] = await Promise.all([
          obtenerAnexos(),
          obtenerRubros(),
        ]);
        setAnexos(anexosData);
        setRubros(rubrosData);
      } catch {
        toast.error("Error al cargar filtros iniciales");
      }
    };

    loadInitial();
  }, []);

  useEffect(() => {
    const loadSubs = async () => {
      try {
        if (!anexoId) {
          setSubdependencias([]);
          setSubdependenciaId("");
          return;
        }

        const data = await obtenerSubdependenciasPorAnexo(Number(anexoId));
        setSubdependencias(data);
        setSubdependenciaId("");
      } catch {
        toast.error("Error al cargar subdependencias");
      }
    };

    loadSubs();
  }, [anexoId]);

  useEffect(() => {
    const loadClases = async () => {
      try {
        if (!rubroId) {
          setClases([]);
          setClaseId("");
          return;
        }

        const data = await obtenerClasesPorRubro(Number(rubroId));
        setClases(data);
        setClaseId("");
      } catch {
        toast.error("Error al cargar clases");
      }
    };

    loadClases();
  }, [rubroId]);

  const hasFilters = useMemo(() => {
    return !!(
      query.trim() ||
      anexoId ||
      subdependenciaId ||
      rubroId ||
      claseId ||
      estadoConservacion ||
      flags.length
    );
  }, [query, anexoId, subdependenciaId, rubroId, claseId, estadoConservacion, flags]);

  const toggleFlag = (flag: FlagKey) => {
    setFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
    setPage(1);
  };

  const handleSearch = useCallback(
    async (nextPage = 1) => {
      if (autoSearchTimer.current) {
        clearTimeout(autoSearchTimer.current);
        autoSearchTimer.current = null;
      }
      activeSearch.current?.abort();
      const controller = new AbortController();
      activeSearch.current = controller;
      try {
        setLoading(true);

        const normalizedQuery = query.trim();
        const isNumericQuery = /^\d+$/.test(normalizedQuery);

        const data = await buscarMobiliario({
          q: normalizedQuery || undefined,
          search_field: searchField,
          anexo_id: anexoId ? Number(anexoId) : undefined,
          subdependencia_id: subdependenciaId ? Number(subdependenciaId) : undefined,
          rubro_id: rubroId ? Number(rubroId) : undefined,
          clase_id: claseId ? Number(claseId) : undefined,
          estado_conservacion: estadoConservacion || undefined,
          flag: flags.length ? flags : undefined,
          page: nextPage,
          per_page: perPage,
          order_by: isNumericQuery ? "id" : orderBy,
          order_dir: isNumericQuery ? "asc" : orderDir,
        }, controller.signal);

        if (controller.signal.aborted) return;

        setItems(data.items);
        setTotal(data.meta.total);
        setPages(data.meta.pages || 1);
        setPage(data.meta.page);
      } catch (e) {
        if (controller.signal.aborted) return;
        const msg = e instanceof Error ? e.message : "Error al buscar";
        toast.error(msg);
      } finally {
        if (activeSearch.current === controller) {
          activeSearch.current = null;
          setLoading(false);
        }
      }
    },
    [
      anexoId,
      claseId,
      estadoConservacion,
      flags,
      orderBy,
      orderDir,
      query,
      searchField,
      rubroId,
      subdependenciaId,
    ]
  );

  useEffect(() => {
    const hasAutoQuery = query.trim().length >= 2;

    if (!hasAutoQuery) return;

    const timer = setTimeout(() => {
      handleSearch(1);
    }, 450);
    autoSearchTimer.current = timer;

    return () => {
      clearTimeout(timer);
      if (autoSearchTimer.current === timer) autoSearchTimer.current = null;
      activeSearch.current?.abort();
    };
  }, [query, handleSearch]);

  useEffect(() => () => activeSearch.current?.abort(), []);

  const handleReset = () => {
    if (autoSearchTimer.current) {
      clearTimeout(autoSearchTimer.current);
      autoSearchTimer.current = null;
    }
    activeSearch.current?.abort();
    activeSearch.current = null;
    setLoading(false);
    setQuery("");
    setSearchField("descripcion");
    setAnexoId("");
    setSubdependenciaId("");
    setRubroId("");
    setClaseId("");
    setEstadoConservacion("");
    setOrderBy("id");
    setOrderDir("desc");
    setFlags([]);
    setPage(1);
    setItems([]);
    setTotal(0);
    setPages(1);
  };

  return (
    <Wrapper>
      <main className="min-h-screen bg-slate-100 px-4 py-6 transition-colors dark:bg-slate-900 sm:px-6">
        <Toaster />

        <div className="max-w-7xl mx-auto">
          <div className="mb-6 border-b border-slate-300 pb-5 dark:border-slate-700">
            <p className="text-xs font-black uppercase text-cyan-700 dark:text-cyan-300">Consulta patrimonial</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
              Buscador Avanzado
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Buscá por bien, clase, rubro, anexo, subdependencia o ubicación específica.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-1">
              <div className="sticky top-[100px] rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                  Filtros inteligentes
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                      Búsqueda general
                    </label>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSearch(1);
                        }
                      }}
                      placeholder="Ej: impresora, hp, escritorio, 345..."
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white"
                    />
                    <div className="mt-2 grid grid-cols-3 gap-1 rounded-md border border-slate-300 p-1 xl:grid-cols-2 2xl:grid-cols-3 dark:border-slate-700" aria-label="Alcance de búsqueda">
                      {([['descripcion', 'Descripción'], ['id', 'ID exacto'], ['todo', 'Todo']] as const).map(([value, label]) => (
                        <button key={value} type="button" onClick={() => { setSearchField(value); setPage(1); }} className={`min-h-8 min-w-0 rounded px-1 text-center text-xs font-bold leading-tight transition ${value === 'todo' ? 'xl:col-span-2 2xl:col-span-1' : ''} ${searchField === value ? 'bg-cyan-700 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Escribiendo 2 o más caracteres, busca automáticamente.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                      Anexo
                    </label>
                    <select
                      value={anexoId}
                      onChange={(e) => {
                        setAnexoId(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white"
                    >
                      <option value="">Todos</option>
                      {anexos.map((anexo) => (
                        <option key={anexo.id} value={anexo.id}>
                          {anexo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                      Subdependencia
                    </label>
                    <select
                      value={subdependenciaId}
                      onChange={(e) => {
                        setSubdependenciaId(e.target.value);
                        setPage(1);
                      }}
                      disabled={!anexoId}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white disabled:opacity-50"
                    >
                      <option value="">Todas</option>
                      {subdependencias.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                      Rubro
                    </label>
                    <select
                      value={rubroId}
                      onChange={(e) => {
                        setRubroId(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white"
                    >
                      <option value="">Todos</option>
                      {rubros.map((rubro) => (
                        <option key={rubro.id_rubro} value={rubro.id_rubro}>
                          {rubro.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                      Clase
                    </label>
                    <select
                      value={claseId}
                      onChange={(e) => {
                        setClaseId(e.target.value);
                        setPage(1);
                      }}
                      disabled={!rubroId}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white disabled:opacity-50"
                    >
                      <option value="">Todas</option>
                      {clases.map((clase) => (
                        <option key={clase.id_clase} value={clase.id_clase}>
                          {clase.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                      Estado de conservación
                    </label>
                    <select
                      value={estadoConservacion}
                      onChange={(e) => {
                        setEstadoConservacion(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white"
                    >
                      <option value="">Todos</option>
                      <option value="Nuevo">Nuevo</option>
                      <option value="Bueno">Bueno</option>
                      <option value="Regular">Regular</option>
                      <option value="Malo">Malo</option>
                      <option value="Inútil">Inútil</option>
                    </select>
                  </div>

                  <div>
                    <p className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                      Flags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(FLAG_LABELS) as FlagKey[]).map((flag) => {
                        const active = flags.includes(flag);
                        return (
                          <button
                            key={flag}
                            type="button"
                            onClick={() => toggleFlag(flag)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                              active
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            {FLAG_LABELS[flag]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                        Ordenar por
                      </label>
                      <select
                        value={orderBy}
                        onChange={(e) => setOrderBy(e.target.value as "id" | "fecha_actualizacion" | "descripcion")}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white"
                      >
                        <option value="id">ID</option>
                        <option value="descripcion">Descripción</option>
                        <option value="fecha_actualizacion">Actualización</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                        Dirección
                      </label>
                      <select
                        value={orderDir}
                        onChange={(e) => setOrderDir(e.target.value as "asc" | "desc")}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white"
                      >
                        <option value="desc">Desc</option>
                        <option value="asc">Asc</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSearch(1)}
                      disabled={loading || !hasFilters}
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold ${
                        loading || !hasFilters
                          ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      <HiSearch className="w-5 h-5" />
                      Buscar
                    </button>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white"
                    >
                      <HiRefresh className="w-5 h-5" />
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:col-span-3">
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                      Resultados
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {loading ? "Buscando..." : `${total} resultado(s) encontrado(s)`}
                    </p>
                  </div>

                  {pages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (page > 1) handleSearch(page - 1);
                        }}
                        disabled={page <= 1 || loading}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                      >
                        <HiChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm text-gray-700 dark:text-gray-200">
                        Página {page} de {pages}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (page < pages) handleSearch(page + 1);
                        }}
                        disabled={page >= pages || loading}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                      >
                        <HiChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                {!loading && items.length === 0 ? (
                  <div className="py-20 text-center text-gray-500 dark:text-gray-400">
                    {hasFilters
                      ? "No se encontraron resultados con los filtros seleccionados."
                      : "Aplicá filtros o escribí una búsqueda para comenzar."}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div
                        key={item.id_mobiliario}
                        className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40 hover:shadow-md transition"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                          <div className="lg:col-span-1">
                            <MobiliarioPhotoGallery
                              photos={[item.foto_url, item.foto_url_2]}
                              alt={item.descripcion || "Foto del bien"}
                              className="h-44 w-full rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                              imageClassName="object-contain"
                            />
                          </div>

                          <div className="lg:col-span-3">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                  {item.descripcion || "Sin descripción"}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                  <strong>ID:</strong> {item.id_mobiliario}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href={`/patrimonio/editar/${item.id_mobiliario}`}
                                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold"
                                >
                                  Ver detalle / Editar
                                </Link>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm text-gray-700 dark:text-gray-200">
                              <div className="flex items-center gap-2">
                                <HiTag className="w-5 h-5 text-blue-600" />
                                <span><strong>Rubro:</strong> {item.rubro || "—"}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <HiCollection className="w-5 h-5 text-cyan-600" />
                                <span><strong>Clase:</strong> {item.clase_bien || "—"}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <HiOfficeBuilding className="w-5 h-5 text-indigo-600" />
                                <span><strong>Anexo:</strong> {item.anexo || "—"}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <HiOfficeBuilding className="w-5 h-5 text-violet-600" />
                                <span><strong>Subdependencia:</strong> {item.subdependencia || "—"}</span>
                              </div>

                              {visibleVehicle(item) && (
                                <div className="flex items-center gap-2">
                                  <HiTruck className="h-5 w-5 text-cyan-700" />
                                  <span><strong>Vehículo:</strong> {visibleVehicle(item)}</span>
                                </div>
                              )}

                              <p><strong>Estado:</strong> {item.estado_conservacion || "—"}</p>
                              <p><strong>Control:</strong> {item.estado_control || "—"}</p>
                              <p><strong>Actualizado:</strong> {formatMobiliarioDate(item.fecha_actualizacion, "datetime")}</p>
                            </div>

                            <ItemFlags item={item} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {pages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        if (page > 1) handleSearch(page - 1);
                      }}
                      disabled={page <= 1 || loading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                    >
                      <HiChevronLeft className="w-5 h-5" />
                      Anterior
                    </button>

                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      Página {page} de {pages}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        if (page < pages) handleSearch(page + 1);
                      }}
                      disabled={page >= pages || loading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                    >
                      Siguiente
                      <HiChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </Wrapper>
  );
}
