"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Layers3, Search, Tag, X } from "lucide-react";
import { Wrapper } from "@/components";
import {
  buscarClases,
  obtenerClasesPorRubro,
  obtenerRubros,
  type Clase,
  type Rubro,
} from "@/services/nomencladorService";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function NomencladorPage() {
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [query, setQuery] = useState("");
  const [selectedRubro, setSelectedRubro] = useState<Rubro | null>(null);
  const [loadingRubros, setLoadingRubros] = useState(true);
  const [loadingClases, setLoadingClases] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    obtenerRubros()
      .then((data) => {
        if (!cancelled) setRubros(data);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo cargar el nomenclador.");
      })
      .finally(() => {
        if (!cancelled) setLoadingRubros(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        setLoadingClases(true);
        setError("");
        const data = await buscarClases(cleanQuery);
        if (!cancelled) {
          setClases(data);
          setSelectedRubro(null);
        }
      } catch {
        if (!cancelled) {
          setClases([]);
          setError("No se pudo completar la búsqueda.");
        }
      } finally {
        if (!cancelled) setLoadingClases(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  const filteredRubros = useMemo(() => {
    const term = normalize(query);
    if (!term) return rubros;
    return rubros.filter(
      (rubro) =>
        String(rubro.id_rubro).includes(term) ||
        normalize(rubro.nombre).includes(term)
    );
  }, [query, rubros]);

  const rubrosById = useMemo(
    () => new Map(rubros.map((rubro) => [rubro.id_rubro, rubro])),
    [rubros]
  );

  const selectRubro = async (rubro: Rubro) => {
    try {
      setSelectedRubro(rubro);
      setQuery("");
      setLoadingClases(true);
      setError("");
      setClases(await obtenerClasesPorRubro(rubro.id_rubro));
    } catch {
      setClases([]);
      setError("No se pudieron cargar las clases del rubro.");
    } finally {
      setLoadingClases(false);
    }
  };

  const clearSelection = () => {
    setQuery("");
    setSelectedRubro(null);
    setClases([]);
    setError("");
  };

  return (
    <Wrapper>
      <main className="mx-auto w-full max-w-7xl px-2 py-5 sm:px-4 sm:py-8">
        <header className="mb-5 flex flex-col gap-4 border-b border-slate-300 pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-slate-700">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-cyan-700 dark:text-cyan-300">
              <BookOpen className="h-4 w-4" />
              Patrimonio
            </span>
            <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl dark:text-white">
              Nomenclador
            </h1>
          </div>

          <div className="flex gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <span className="rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              {rubros.length} rubros
            </span>
            <span className="rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              {clases.length} clases
            </span>
          </div>
        </header>

        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              if (!nextQuery.trim() && !selectedRubro) setClases([]);
            }}
            placeholder="Rubro, clase o código"
            className="h-12 w-full rounded-md border border-slate-300 bg-white pl-11 pr-12 text-sm font-semibold text-slate-950 shadow-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          {(query || selectedRubro) && (
            <button
              type="button"
              onClick={clearSelection}
              title="Limpiar"
              aria-label="Limpiar"
              className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100">
            {error}
          </div>
        )}

        <div className="grid min-h-[34rem] gap-4 lg:grid-cols-[21rem_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
            <div className="flex h-12 items-center gap-2 border-b border-slate-300 bg-slate-100 px-4 text-sm font-black text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
              <Layers3 className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
              Rubros
            </div>
            <div className="max-h-[calc(100vh-19rem)] min-h-72 overflow-y-auto p-2">
              {loadingRubros ? (
                <p className="p-4 text-center text-sm text-slate-500">Cargando...</p>
              ) : filteredRubros.length ? (
                <div className="space-y-1">
                  {filteredRubros.map((rubro) => (
                    <button
                      key={rubro.id_rubro}
                      type="button"
                      onClick={() => void selectRubro(rubro)}
                      className={`flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition ${
                        selectedRubro?.id_rubro === rubro.id_rubro
                          ? "bg-cyan-700 text-white"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                      }`}
                    >
                      <span className="min-w-12 shrink-0 font-mono text-xs font-black">
                        {rubro.id_rubro}
                      </span>
                      <span className="min-w-0 break-words text-xs font-bold leading-5">
                        {rubro.nombre}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="p-4 text-center text-sm text-slate-500">Sin rubros.</p>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
            <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-100 px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
              <span className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                <Tag className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
                Clases
              </span>
              {selectedRubro && (
                <span className="max-w-full break-words text-right text-xs font-bold text-cyan-800 dark:text-cyan-200">
                  {selectedRubro.id_rubro} - {selectedRubro.nombre}
                </span>
              )}
            </div>

            <div className="max-h-[calc(100vh-19rem)] min-h-72 overflow-auto">
              {loadingClases ? (
                <p className="p-8 text-center text-sm text-slate-500">Cargando...</p>
              ) : clases.length ? (
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-200 text-xs uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <tr>
                      <th className="w-24 px-3 py-3 sm:w-32 sm:px-4">Clase</th>
                      <th className="px-3 py-3 sm:px-4">Descripción</th>
                      <th className="hidden w-64 px-4 py-3 xl:table-cell">Rubro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {clases.map((clase) => {
                      const rubro = rubrosById.get(clase.id_rubro);
                      return (
                        <tr key={`${clase.id_rubro}-${clase.id_clase}`} className="hover:bg-cyan-50/70 dark:hover:bg-cyan-950/20">
                          <td className="px-3 py-3 align-top font-mono text-xs font-black text-cyan-800 sm:px-4 dark:text-cyan-200">
                            {clase.id_clase}
                          </td>
                          <td className="break-words px-3 py-3 align-top font-semibold text-slate-900 sm:px-4 dark:text-slate-100">
                            {clase.descripcion}
                            <span className="mt-1 block text-xs font-medium text-slate-500 xl:hidden dark:text-slate-400">
                              Rubro {clase.id_rubro}{rubro ? ` - ${rubro.nombre}` : ""}
                            </span>
                          </td>
                          <td className="hidden break-words px-4 py-3 align-top text-xs font-semibold text-slate-600 xl:table-cell dark:text-slate-300">
                            {clase.id_rubro}{rubro ? ` - ${rubro.nombre}` : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex min-h-72 items-center justify-center p-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Sin resultados para mostrar.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </Wrapper>
  );
}
