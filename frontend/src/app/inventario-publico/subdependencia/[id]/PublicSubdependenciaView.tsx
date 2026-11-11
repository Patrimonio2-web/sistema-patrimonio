"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUp,
  Building2,
  Package,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import MobiliarioPhotoGallery from "@/components/MobiliarioPhotoGallery";
import PublicHelpBot from "@/components/PublicHelpBot";
import { usePublicViewGuard } from "@/hooks/usePublicViewGuard";
import {
  PUBLIC_DIRECTORY_BY_SLUG,
  publicDirectoryPath,
} from "@/lib/publicDirectories";

type PublicInventoryItem = {
  id_mobiliario: string;
  descripcion?: string | null;
  estado?: string | null;
  foto_url?: string | null;
  foto_url_2?: string | null;
  rubro?: string | null;
  clase_bien?: string | null;
};

type PublicInventoryResponse = {
  subdependencia: {
    id: number;
    nombre: string;
  };
  anexo: {
    id: number;
    nombre: string;
  };
  total_bienes: number;
  bienes: PublicInventoryItem[];
};

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE || "/api"
).replace(/\/$/, "");

function displayValue(value: string | number | null | undefined) {
  const text = String(value ?? "").trim();
  return text || "No informado";
}

function normalizeSearchValue(value: string | number | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function estadoClasses(value?: string | null) {
  const estado = String(value || "").trim().toLowerCase();
  if (estado === "bueno") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200";
  }
  if (estado === "regular") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200";
  }
  if (estado === "malo" || estado === "inutil" || estado === "in\u00fatil") {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200";
  }
  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

export default function PublicSubdependenciaView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = params?.id;
  const subdependenciaId = Array.isArray(rawId) ? rawId[0] : String(rawId || "");
  const [data, setData] = useState<PublicInventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const directorySlug = String(searchParams.get("directorio") || "")
    .trim()
    .toLowerCase();
  const directoryConfig = PUBLIC_DIRECTORY_BY_SLUG.get(directorySlug);
  const legacyResidenceReturn =
    searchParams.get("retorno") === "anexo-1000" &&
    directorySlug === "residencia-oficial-2";

  usePublicViewGuard("publicSubdependenciaGuard");

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 560);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    if (!/^\d+$/.test(subdependenciaId)) {
      setData(null);
      setError("El enlace de la subdependencia no es v\u00e1lido.");
      setLoading(false);
      return () => controller.abort();
    }

    setLoading(true);
    setError("");
    setSearchTerm("");

    fetch(
      `${API_BASE}/publico/subdependencias/${encodeURIComponent(
        subdependenciaId
      )}/inventario`,
      { cache: "no-store", signal: controller.signal }
    )
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error || "No se pudo cargar el inventario");
        }
        return response.json() as Promise<PublicInventoryResponse>;
      })
      .then((response) => setData(response))
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        setData(null);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo cargar el inventario"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [subdependenciaId]);

  const inventoryTitle = useMemo(() => {
    if (!data) return "Inventario por subdependencia";
    return `${data.subdependencia.id} - ${data.subdependencia.nombre}`;
  }, [data]);

  const visibleItems = useMemo(() => {
    if (!data) return [];

    const query = normalizeSearchValue(deferredSearchTerm);
    if (!query) return data.bienes;

    return data.bienes.filter((item) =>
      [
        item.id_mobiliario,
        item.descripcion,
        item.rubro,
        item.clase_bien,
        item.estado,
      ].some((value) => normalizeSearchValue(value).includes(query))
    );
  }, [data, deferredSearchTerm]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700">
              <Image
                src="/logo4.png"
                alt="Patrimonio - Legislatura de La Rioja"
                fill
                className="object-contain p-1"
                sizes="48px"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase text-cyan-700 dark:text-cyan-400">
                Legislatura de La Rioja
              </p>
              <p className="truncate text-base font-bold sm:text-xl">
                {"Direcci\u00f3n de Patrimonio"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">{"Consulta p\u00fablica"}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto min-w-0 w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
            <div className="min-w-0">
              <h2 className="font-bold">{"Inventario p\u00fablico de consulta"}</h2>
              <p className="mt-1 text-sm leading-relaxed">
                {"Verific\u00e1 que cada bien permanezca en la ubicaci\u00f3n indicada. No traslades bienes ni modifiques etiquetas sin autorizaci\u00f3n de Patrimonio."}
              </p>
              <p className="mt-2 text-xs font-semibold">
                Los bienes informados como faltantes no aparecen en esta consulta.
              </p>
            </div>
          </div>
        </section>

        <section
          className="relative mb-6 overflow-hidden rounded-lg border border-red-300 bg-red-50 p-4 text-red-950 shadow-sm dark:border-red-900 dark:bg-red-950/40 dark:text-red-100 sm:p-5"
          role="alert"
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-red-600" />
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/70 dark:text-red-200">
              <span className="absolute inset-0 rounded-full bg-red-400/35 motion-safe:animate-ping" />
              <ShieldAlert className="relative h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-black">Advertencia importante</h2>
              <div className="mt-2 space-y-2 text-sm leading-relaxed">
                <p>
                  <strong>No retire, altere ni desprenda las etiquetas patrimoniales</strong>{" "}
                  colocadas en los bienes.
                </p>
                <p>
                  Si detecta un bien faltante, dañado o fuera de la ubicación indicada,
                  comuníquese de inmediato con la Dirección de Patrimonio.
                </p>
                <p>
                  Antes de incorporar, recibir o trasladar un bien nuevo, informe a
                  Patrimonio para asegurar su correcta registración y evitar
                  inconsistencias posteriores. Todos estos bienes forman parte del
                  inventario patrimonial de la Cámara.
                </p>
              </div>
            </div>
          </div>
        </section>

        {loading && (
          <div
            className="flex min-h-[55vh] items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300"
            role="status"
          >
            <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-700" />
            Cargando inventario...
          </div>
        )}

        {!loading && error && (
          <section className="rounded-lg border border-red-200 bg-white p-6 shadow-sm dark:border-red-900 dark:bg-slate-900">
            <div className="flex items-start gap-3 text-red-700 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h2 className="font-bold">No se pudo abrir el inventario</h2>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </section>
        )}

        {!loading && data && (
          <>
            <section className="mb-6 min-w-0 border-y border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-900 sm:px-5">
              {directoryConfig &&
                data.anexo.id === directoryConfig.anexoId &&
                (!directoryConfig.subdependenciaIds ||
                  directoryConfig.subdependenciaIds.includes(
                    Number(data.subdependencia.id)
                  )) && (
                <Link
                  href={
                    legacyResidenceReturn
                      ? "/inventario-publico/anexo/1000"
                      : publicDirectoryPath(directoryConfig.slug)
                  }
                  className="mb-5 inline-flex min-h-12 items-center gap-3 rounded-md border border-cyan-700 bg-cyan-700 px-4 text-sm font-black text-white shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-800 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 dark:border-cyan-400 dark:bg-cyan-600 dark:hover:bg-cyan-500"
                >
                  <span className="relative flex h-7 w-7 items-center justify-center rounded bg-white/15">
                    <span className="absolute inset-0 animate-ping rounded bg-white/20 motion-reduce:animate-none" />
                    <ArrowLeft className="relative h-4 w-4" />
                  </span>
                  Volver a {directoryConfig.title}
                </Link>
              )}
              <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-400">
                Inventario por subdependencia
              </p>
              <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h1 className="break-words text-2xl font-black leading-tight sm:text-3xl">
                    {inventoryTitle}
                  </h1>
                  <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300 sm:flex-row sm:gap-5">
                    <span className="inline-flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />
                      {data.anexo.id} - {data.anexo.nombre}
                    </span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  <Package className="h-4 w-4" />
                  {data.total_bienes} {data.total_bienes === 1 ? "bien" : "bienes"}
                </div>
              </div>
            </section>

            {data.bienes.length > 0 && (
              <section
                className="mb-6 border-y border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-5"
                aria-label="Buscar en el inventario"
              >
                <div className="mb-3">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Buscar un bien
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Consulta rápida dentro de esta ubicación
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <label htmlFor="public-inventory-search" className="sr-only">
                      Buscar bienes
                    </label>
                    <input
                      id="public-inventory-search"
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Buscar por ID, descripción, rubro, clase o estado"
                      autoComplete="off"
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-11 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-cyan-950"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        title="Limpiar búsqueda"
                        aria-label="Limpiar búsqueda"
                        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-600 dark:text-slate-300" aria-live="polite">
                    {visibleItems.length} de {data.bienes.length} visibles
                  </p>
                </div>
              </section>
            )}

            {visibleItems.length > 0 ? (
              <section aria-label="Bienes de la subdependencia">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-400">
                      Inventario
                    </p>
                    <h2 className="mt-1 text-xl font-black">Bienes registrados</h2>
                  </div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Mostrando {visibleItems.length}
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {visibleItems.map((item) => (
                  <article
                    key={item.id_mobiliario}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <MobiliarioPhotoGallery
                      photos={[item.foto_url, item.foto_url_2]}
                      alt={`Bien ${item.id_mobiliario}`}
                      className="h-64 w-full rounded-none border-0 border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950"
                      imageClassName="object-contain"
                    />

                    <div className="p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-md border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-200">
                          ID: {item.id_mobiliario}
                        </span>
                        <span
                          className={`inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-black ${estadoClasses(
                            item.estado
                          )}`}
                        >
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-current opacity-75" />
                          Estado: {displayValue(item.estado)}
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-bold leading-snug">
                        {displayValue(item.descripcion)}
                      </h3>

                      <dl className="mt-5 divide-y divide-slate-200 border-y border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800">
                        {[
                          ["Anexo", data.anexo.nombre],
                          ["Subdependencia", data.subdependencia.nombre],
                          ["Rubro", item.rubro],
                          ["Clase", item.clase_bien],
                        ].map(([label, value]) => (
                          <div key={label} className="grid gap-1 py-2.5 sm:grid-cols-[112px_1fr] sm:gap-3">
                            <dt className="font-semibold text-slate-500 dark:text-slate-400">
                              {label}
                            </dt>
                            <dd className="font-medium">{displayValue(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </article>
                  ))}
                </div>
              </section>
            ) : (
              <section className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
                {data.bienes.length > 0 ? (
                  <>
                    <Search className="mx-auto h-8 w-8 text-slate-400" />
                    <h2 className="mt-3 font-bold">No encontramos coincidencias</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {"Prob\u00e1 con otro ID, descripci\u00f3n, rubro, clase o estado."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {"Limpiar b\u00fasqueda"}
                    </button>
                  </>
                ) : (
                  <>
                    <Package className="mx-auto h-8 w-8 text-slate-400" />
                    <h2 className="mt-3 font-bold">No hay bienes disponibles</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {"Esta subdependencia no tiene bienes visibles para la consulta p\u00fablica."}
                    </p>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <footer className="mt-4 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-6 text-xs text-slate-500 dark:text-slate-400 sm:px-6">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            {"Direcci\u00f3n de Patrimonio - Legislatura de La Rioja"}
          </p>
          <p>{"Consulta p\u00fablica de inventario institucional"}</p>
        </div>
      </footer>

      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Volver al comienzo"
          title="Volver al comienzo"
          className="fixed bottom-20 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-md border border-cyan-800 bg-cyan-700 text-white shadow-lg transition hover:bg-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 sm:bottom-24 sm:right-6"
        >
          <ArrowUp className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
      <PublicHelpBot
        context={{
          kind: "inventory",
          anexo: data?.anexo.nombre,
          subdependencia: data?.subdependencia.nombre,
          total: data?.total_bienes,
        }}
      />
    </div>
  );
}
