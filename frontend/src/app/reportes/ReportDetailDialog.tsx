"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import MobiliarioPhotoGallery from "@/components/MobiliarioPhotoGallery";
import { matchesReportSelection, type ReportSelection } from "@/lib/reportDetail";
import type { MobiliarioUltimo } from "@/types/types";

const PAGE_SIZE = 25;
const numberFormatter = new Intl.NumberFormat("es-AR");

function conservationState(value?: string | null) {
  const normalized = (value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR");
  if (["bueno", "buen estado"].includes(normalized)) {
    return { label: "Bueno", tone: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" };
  }
  if (normalized === "regular") {
    return { label: "Regular", tone: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200" };
  }
  if (["malo", "mal estado", "inutil", "malo / inutil", "malo/inutil"].includes(normalized)) {
    return { label: normalized === "inutil" ? "Inútil" : normalized.includes("inutil") ? "Malo / Inútil" : "Malo", tone: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200" };
  }
  if (["nuevo", "nueva"].includes(normalized)) {
    return { label: "Nuevo", tone: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200" };
  }
  return { label: value?.trim() || "Sin estado", tone: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" };
}

export default function ReportDetailDialog({
  selection,
  items,
  loading,
  error,
  initialSearch = "",
  initialPage = 1,
  initialItemId = "",
  onClose,
  onRetry,
}: {
  selection: ReportSelection;
  items: MobiliarioUltimo[] | null;
  loading: boolean;
  error: string;
  initialSearch?: string;
  initialPage?: number;
  initialItemId?: string;
  onClose: () => void;
  onRetry: () => void;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoredRowRef = useRef(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("[data-mobiliario-zoom]")) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const matches = useMemo(
    () => (items ?? []).filter((item) => matchesReportSelection(item, selection)),
    [items, selection]
  );
  const filtered = useMemo(() => {
    const query = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR");
    if (!query) return matches;
    return matches.filter((item) =>
      [item.id_mobiliario, item.descripcion, item.clase_bien, item.anexo, item.subdependencia, item.estado_conservacion]
        .filter(Boolean)
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("es-AR")
        .includes(query)
    );
  }, [matches, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (!items || !initialItemId || restoredRowRef.current) return;
    if (!visible.some((item) => String(item.id_mobiliario) === initialItemId)) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`report-row-${initialItemId}`)?.scrollIntoView({ block: "center" });
      restoredRowRef.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialItemId, items, visible]);

  const returnPath = (itemId: string) => {
    const params = new URLSearchParams({ detalleTipo: selection.kind, detalleClave: selection.key, fila: itemId });
    if (search.trim()) params.set("busqueda", search.trim());
    if (currentPage > 1) params.set("pagina", String(currentPage));
    return `/reportes?${params.toString()}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/55" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-detail-title"
        className="ml-auto flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl dark:bg-slate-950"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">Detalle de reporte</p>
            <h2 id="report-detail-title" className="mt-1 break-words text-xl font-black text-slate-950 dark:text-white">{selection.label}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {numberFormatter.format(selection.total)} en el resumen
              {items && ` · ${numberFormatter.format(matches.length)} registros disponibles`}
            </p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} title="Cerrar detalle" aria-label="Cerrar detalle" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="shrink-0 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-6">
          <label className="relative block">
            <span className="sr-only">Buscar en {selection.label}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Buscar por ID, descripcion, clase o ubicacion"
              className="h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none focus:border-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          {items && <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{numberFormatter.format(filtered.length)} resultados</p>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && <p className="px-6 py-12 text-center text-sm text-slate-600 dark:text-slate-300">Cargando bienes...</p>}
          {error && (
            <div className="px-6 py-12 text-center text-sm text-red-700 dark:text-red-300">
              <p>{error}</p>
              <button type="button" onClick={onRetry} className="mt-3 rounded-md border border-red-300 px-3 py-2 font-bold hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950">Reintentar</button>
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-slate-600 dark:text-slate-300">
              {search ? "No hay bienes que coincidan con la busqueda." : "No hay bienes disponibles en esta categoria."}
            </p>
          )}
          {!loading && !error && visible.map((item) => {
            const state = conservationState(item.estado_conservacion);
            return <article id={`report-row-${item.id_mobiliario}`} key={item.id_mobiliario} className={`grid grid-cols-[5rem_minmax(0,1fr)] gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-6 ${String(item.id_mobiliario) === initialItemId ? "bg-cyan-50/60 dark:bg-cyan-950/20" : ""}`}>
              <MobiliarioPhotoGallery
                photos={[item.foto_url, item.foto_url_2]}
                alt={`Foto del bien ${item.id_mobiliario}`}
                className="h-20 w-20 rounded-md border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
                imageClassName="object-contain"
                emptyLabel=""
                thumbnail
              />
              <div className="min-w-0">
                <h3 className="break-words text-sm font-bold text-slate-950 dark:text-white">{item.descripcion || item.clase_bien || "Sin descripcion"}</h3>
                <p className="mt-1 break-words text-xs text-slate-600 dark:text-slate-300">
                  {[item.clase_bien, item.anexo, item.subdependencia].filter(Boolean).join(" · ") || "Sin ubicacion"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-black text-cyan-800 dark:text-cyan-300">ID #{item.id_mobiliario}</span>
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${state.tone}`}>Estado: {state.label}</span>
                </div>
              </div>
              <Link href={`/patrimonio/guardado/${encodeURIComponent(item.id_mobiliario)}?volver=${encodeURIComponent(returnPath(String(item.id_mobiliario)))}`} className="col-span-2 inline-flex h-9 items-center justify-center gap-1 justify-self-start rounded-md border border-slate-300 px-3 text-xs font-bold text-slate-800 hover:border-cyan-500 hover:text-cyan-700 dark:border-slate-700 dark:text-slate-100 dark:hover:text-cyan-300 sm:col-span-1">
                Ver ficha <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>;
          })}
        </div>

        {items && filtered.length > PAGE_SIZE && (
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200 sm:px-6">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-md border border-slate-300 px-3 py-2 disabled:opacity-40 dark:border-slate-700">Anterior</button>
            <span>{currentPage} / {pageCount}</span>
            <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="rounded-md border border-slate-300 px-3 py-2 disabled:opacity-40 dark:border-slate-700">Siguiente</button>
          </footer>
        )}
      </section>
    </div>
  );
}
