"use client";

import Image, { type StaticImageData } from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBoxOpen,
  FaCalendarCheck,
  FaCheckCircle,
  FaCogs,
  FaExternalLinkAlt,
  FaFire,
  FaHistory,
  FaHome,
  FaLayerGroup,
  FaListUl,
  FaMapMarkerAlt,
  FaPrint,
  FaSearch,
  FaTag,
  FaTimes,
  FaWrench,
} from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import { getAnexoLocation } from "@/lib/anexoLocations";
import { obtenerAnexos, obtenerSubdependencias } from "@/services/anexosService";
import { isViewer } from "@/services/authRole";
import { obtenerMobiliariosPorAnexo } from "@/services/mobiliarioService";
import type { MobiliarioUltimo } from "@/types/types";
import {
  eliminarRelevamientoAnexo,
  eliminarRelevamientoSubdependencia,
  guardarRelevamientoAnexo,
  guardarRelevamientoSubdependencia,
  obtenerHistorialRelevamientosAnexo,
  obtenerHistorialRelevamientosSubdependencia,
  obtenerRelevamientosAnexos,
  obtenerRelevamientosSubdependencias,
  type HistorialRelevamientoAnexo,
  type HistorialRelevamientoSubdependencia,
  type RelevamientoAnexo,
  type RelevamientoSubdependencia,
} from "@/services/relevamientosService";

interface Subdependencia {
  id: number;
  nombre: string;
}

interface PlanImage {
  src: StaticImageData;
  alt: string;
}

interface AnexoDetallePageProps {
  anexoId: number;
  title: string;
  mapTitle?: string;
  mapSrc?: string;
  plans?: PlanImage[];
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

type InventoryFlag =
  | "faltante"
  | "para_baja"
  | "para_reparacion"
  | "problema_etiqueta"
  | "sobrante"
  | "no_dado";

const INVENTORY_FILTERS: Array<{
  key: "todos" | InventoryFlag;
  label: string;
  icon: typeof FaBoxOpen;
}> = [
  { key: "todos", label: "Todos", icon: FaBoxOpen },
  { key: "faltante", label: "Faltantes", icon: FaTimes },
  { key: "para_baja", label: "Para baja", icon: FaArrowRight },
  { key: "para_reparacion", label: "Reparación", icon: FaWrench },
  { key: "problema_etiqueta", label: "Etiqueta", icon: FaTag },
  { key: "sobrante", label: "Sobrantes", icon: FaCheckCircle },
  { key: "no_dado", label: "Números dados", icon: FaLayerGroup },
];

function todayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("es-AR").format(new Date(year, month - 1, day));
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

type RelevamientoTarget =
  | { type: "anexo"; id: number; label: string; currentDate?: string }
  | { type: "subdependencia"; id: number; label: string; currentDate?: string };

type HistorialRelevamiento =
  | HistorialRelevamientoAnexo
  | HistorialRelevamientoSubdependencia;

const LABEL_QUEUE_TRANSFER_KEY = "patrimonio.etiquetas.cadena_pendiente";

export default function AnexoDetallePage({
  anexoId,
  title,
  mapTitle,
  mapSrc,
  plans = [],
}: AnexoDetallePageProps) {
  const router = useRouter();
  const [displayTitle, setDisplayTitle] = useState(title);
  const [subdependencias, setSubdependencias] = useState<Subdependencia[]>([]);
  const [anexoRelevamiento, setAnexoRelevamiento] = useState<RelevamientoAnexo | null>(null);
  const [subRelevamientos, setSubRelevamientos] = useState<Record<number, RelevamientoSubdependencia>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [anexoItems, setAnexoItems] = useState<MobiliarioUltimo[]>([]);
  const [loadingAnexoItems, setLoadingAnexoItems] = useState(true);
  const [inventoryFilter, setInventoryFilter] = useState<"todos" | InventoryFlag | null>(null);
  const [inventorySearch, setInventorySearch] = useState("");
  const [target, setTarget] = useState<RelevamientoTarget | null>(null);
  const [fechaRelevamiento, setFechaRelevamiento] = useState(todayInputValue());
  const [comentarioRelevamiento, setComentarioRelevamiento] = useState("");
  const [savingRelevamiento, setSavingRelevamiento] = useState(false);
  const [historialTarget, setHistorialTarget] = useState<RelevamientoTarget | null>(null);
  const [historial, setHistorial] = useState<HistorialRelevamiento[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialError, setHistorialError] = useState("");
  const [labelChainConfirmOpen, setLabelChainConfirmOpen] = useState(false);
  const viewer = isViewer();
  const canonicalLocation = getAnexoLocation(anexoId);
  const resolvedMapSrc = canonicalLocation?.embedUrl || mapSrc;
  const resolvedMapTitle =
    canonicalLocation?.mapTitle || mapTitle || `Mapa ${displayTitle}`;

  useEffect(() => {
    let cancelled = false;
    setDisplayTitle(title);
    obtenerAnexos()
      .then((data) => {
        const anexo = data.find((item) => Number(item.id) === anexoId);
        if (!cancelled && anexo?.nombre?.trim()) {
          setDisplayTitle(`${anexoId} - ${anexo.nombre.trim()}`);
        }
      })
      .catch((error) => {
        console.error("No se pudo actualizar el nombre del anexo:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [anexoId, title]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await obtenerSubdependencias(anexoId);
        const ordered = data.sort(
          (a: Subdependencia, b: Subdependencia) => a.id - b.id
        );
        if (!cancelled) setSubdependencias(ordered);
      } catch (error) {
        console.error("Error al obtener subdependencias:", error);
        if (!cancelled) setSubdependencias([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [anexoId]);

  useEffect(() => {
    let cancelled = false;

    setLoadingAnexoItems(true);
    obtenerMobiliariosPorAnexo(anexoId)
      .then((data) => {
        if (!cancelled) setAnexoItems(data);
      })
      .catch((error) => {
        console.error("No se pudo cargar el resumen patrimonial del anexo:", error);
        if (!cancelled) setAnexoItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAnexoItems(false);
      });

    return () => {
      cancelled = true;
    };
  }, [anexoId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [anexosData, subData] = await Promise.all([
          obtenerRelevamientosAnexos(),
          obtenerRelevamientosSubdependencias(anexoId),
        ]);

        if (cancelled) return;

        setAnexoRelevamiento(
          anexosData.find((item) => item.id_anexo === anexoId) ?? null
        );
        setSubRelevamientos(
          Object.fromEntries(
            subData.map((item) => [item.id_subdependencia, item])
          )
        );
      } catch (error) {
        console.error(error);
        if (!cancelled) toast.error("No se pudieron cargar los relevamientos.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [anexoId]);

  const filtered = useMemo(() => {
    const term = normalize(search);
    if (!term) return subdependencias;

    return subdependencias.filter((sub) =>
      normalize(`${sub.id} ${sub.nombre}`).includes(term)
    );
  }, [search, subdependencias]);

  const filteredInventory = useMemo(() => {
    if (!inventoryFilter) return [];
    const term = normalize(inventorySearch);

    return anexoItems.filter((item) => {
      const matchesFlag =
        inventoryFilter === "todos" || Boolean(item[inventoryFilter]);
      const matchesSearch =
        !term ||
        normalize(
          `${item.id_mobiliario} ${item.descripcion || ""} ${item.subdependencia || ""} ${item.estado_conservacion || ""}`
        ).includes(term);
      return matchesFlag && matchesSearch;
    });
  }, [anexoItems, inventoryFilter, inventorySearch]);

  const inventoryCount = (key: "todos" | InventoryFlag) =>
    key === "todos"
      ? anexoItems.length
      : anexoItems.filter((item) => Boolean(item[key])).length;

  const labelProblemItems = useMemo(
    () => anexoItems.filter((item) => Boolean(item.problema_etiqueta)),
    [anexoItems]
  );

  const openLabelChain = () => {
    const queue = Array.from(
      new Map(
        labelProblemItems.map((item) => [
          String(item.id_mobiliario),
          {
            id: String(item.id_mobiliario),
            descripcion:
              item.descripcion?.trim() || `Bien ID ${item.id_mobiliario}`,
          },
        ])
      ).values()
    );

    if (!queue.length) {
      toast.error("No hay bienes con problema de etiqueta en este anexo.");
      setLabelChainConfirmOpen(false);
      return;
    }

    sessionStorage.setItem(LABEL_QUEUE_TRANSFER_KEY, JSON.stringify(queue));
    router.push(`/Etiquetas?bien=${encodeURIComponent(queue[0].id)}`);
  };

  const openSubdependencia = (sub: Subdependencia) => {
    router.push(
      `/subdependencia/${encodeURIComponent(sub.nombre.trim())}?id=${sub.id}`
    );
  };

  const openRelevamientoModal = (nextTarget: RelevamientoTarget) => {
    setTarget(nextTarget);
    setFechaRelevamiento(nextTarget.currentDate?.slice(0, 10) || todayInputValue());
    setComentarioRelevamiento("");
  };

  const handleSaveRelevamiento = async () => {
    if (!target || !fechaRelevamiento) {
      toast.error("Selecciona una fecha.");
      return;
    }

    try {
      setSavingRelevamiento(true);

      if (target.type === "anexo") {
        const saved = await guardarRelevamientoAnexo(
          target.id,
          fechaRelevamiento,
          comentarioRelevamiento
        );
        setAnexoRelevamiento(saved);
      } else {
        const saved = await guardarRelevamientoSubdependencia(
          target.id,
          fechaRelevamiento,
          comentarioRelevamiento
        );
        setSubRelevamientos((prev) => ({ ...prev, [target.id]: saved }));
      }

      toast.success("Fecha de relevamiento guardada.");
      setTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSavingRelevamiento(false);
    }
  };

  const openHistorialModal = async (nextTarget: RelevamientoTarget) => {
    try {
      setHistorialTarget(nextTarget);
      setHistorial([]);
      setLoadingHistorial(true);
      setHistorialError("");

      const data =
        nextTarget.type === "anexo"
          ? await obtenerHistorialRelevamientosAnexo(nextTarget.id)
          : await obtenerHistorialRelevamientosSubdependencia(nextTarget.id);
      setHistorial(data);
    } catch (error) {
      console.error(error);
      setHistorialError("No se pudo consultar el historial en este momento.");
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleClearRelevamiento = async () => {
    if (!target) return;

    try {
      setSavingRelevamiento(true);

      if (target.type === "anexo") {
        await eliminarRelevamientoAnexo(target.id);
        setAnexoRelevamiento(null);
      } else {
        await eliminarRelevamientoSubdependencia(target.id);
        setSubRelevamientos((prev) => {
          const next = { ...prev };
          delete next[target.id];
          return next;
        });
      }

      toast.success("Marca de relevamiento quitada.");
      setTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo quitar la marca.");
    } finally {
      setSavingRelevamiento(false);
    }
  };

  const actionClass =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 dark:bg-[#07111f] dark:text-white">
      <Toaster />
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <button
            type="button"
            onClick={() => router.push("/Anexos")}
            className={actionClass}
          >
            <FaArrowLeft className="h-3.5 w-3.5" />
            Anexos
          </button>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => router.push("/Home")}
              className={actionClass}
            >
              <FaHome className="h-3.5 w-3.5" />
              Inicio
            </button>
            <button
              type="button"
              onClick={() => router.push("/listados")}
              className={actionClass}
            >
              <FaListUl className="h-3.5 w-3.5" />
              Listados
            </button>
            <button
              type="button"
              onClick={() => router.push("/gestion")}
              className={actionClass}
            >
              <FaCogs className="h-3.5 w-3.5" />
              Gestión
            </button>
            <button
              type="button"
              onClick={() => router.push(`/matafuegos/anexo/${anexoId}`)}
              className={actionClass}
            >
              <FaFire className="h-3.5 w-3.5" />
              Matafuegos
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">
                Ubicación institucional
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
                {displayTitle}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Elegí una subdependencia para ver su inventario sin volver por pantallas intermedias.
              </p>
              <button
                type="button"
                onClick={() =>
                  openRelevamientoModal({
                    type: "anexo",
                    id: anexoId,
                    label: displayTitle,
                    currentDate: anexoRelevamiento?.fecha_completado,
                  })
                }
                disabled={viewer}
                title={viewer ? "Solo lectura: no podes marcar relevamientos." : "Marcar relevamiento del anexo"}
                className={`mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
                  viewer
                    ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:border-emerald-700"
                }`}
              >
                <FaCalendarCheck />
                {anexoRelevamiento ? "Editar relevamiento" : "Marcar relevamiento"}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[520px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Anexo ID
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                  {anexoId}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Subdependencias
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                  {subdependencias.length}
                </p>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${
                anexoRelevamiento
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
                  : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70"
              }`}>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Relevamiento
                </p>
                <p className={`mt-1 text-base font-bold ${
                  anexoRelevamiento
                    ? "text-emerald-800 dark:text-emerald-200"
                    : "text-slate-950 dark:text-white"
                }`}>
                  {anexoRelevamiento
                    ? formatDate(anexoRelevamiento.fecha_completado)
                    : "Pendiente"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">
                Resumen patrimonial
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                Bienes de todas las subdependencias
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Elegí una categoría para identificar el bien y la oficina donde se encuentra.
              </p>
            </div>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
              {loadingAnexoItems ? "Cargando..." : `${anexoItems.length} bienes`}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {INVENTORY_FILTERS.map((option) => {
              const Icon = option.icon;
              const active = inventoryFilter === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  disabled={loadingAnexoItems}
                  onClick={() => setInventoryFilter(active ? null : option.key)}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition disabled:cursor-wait disabled:opacity-60 ${
                    active
                      ? "border-cyan-700 bg-cyan-700 text-white dark:border-cyan-400 dark:bg-cyan-500 dark:text-slate-950"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {option.label}
                  <span className={`rounded-full px-2 py-0.5 ${active ? "bg-white/20" : "bg-slate-200 dark:bg-slate-800"}`}>
                    {inventoryCount(option.key)}
                  </span>
                </button>
              );
            })}
          </div>

          {inventoryFilter && (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={inventorySearch}
                    onChange={(event) => setInventorySearch(event.target.value)}
                    placeholder="Buscar por ID, descripción o subdependencia"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-cyan-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {filteredInventory.length} resultados
                  </span>
                  {inventoryFilter === "problema_etiqueta" && labelProblemItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLabelChainConfirmOpen(true)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-700 px-3 text-xs font-bold text-white transition hover:bg-cyan-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                    >
                      <FaPrint className="h-3.5 w-3.5" />
                      Preparar cadena ({labelProblemItems.length})
                    </button>
                  )}
                </div>
              </div>

              {filteredInventory.length ? (
                <div className="max-h-[420px] divide-y divide-slate-200 overflow-y-auto dark:divide-slate-800">
                  {filteredInventory.map((item) => (
                    <article key={item.id_mobiliario} className="grid gap-3 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                      <span className="w-fit rounded-md bg-cyan-50 px-2 py-1 text-xs font-black text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200">
                        ID {item.id_mobiliario}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                          {item.descripcion || "Sin descripción"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {item.subdependencia || "Sin subdependencia"} · Ubicación {item.ubicacion_id ?? "-"}
                        </p>
                      </div>
                      {item.subdependencia && item.ubicacion_id && (
                        <button
                          type="button"
                          onClick={() => openSubdependencia({ id: Number(item.ubicacion_id), nombre: item.subdependencia || "" })}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-cyan-400 hover:text-cyan-700 dark:border-slate-700 dark:text-slate-200"
                        >
                          Ver oficina <FaArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No hay bienes para este criterio.
                </div>
              )}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            {resolvedMapSrc && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div className="flex min-w-0 items-center gap-2">
                    <FaMapMarkerAlt className="shrink-0 text-cyan-700 dark:text-cyan-300" />
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Mapa de referencia
                      </h2>
                      {canonicalLocation && (
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {canonicalLocation.address}
                        </p>
                      )}
                    </div>
                  </div>
                  {canonicalLocation && (
                    <a
                      href={canonicalLocation.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:border-slate-700 dark:text-slate-200 dark:hover:border-cyan-800 dark:hover:bg-cyan-950/40"
                    >
                      Abrir en Maps
                      <FaExternalLinkAlt className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="h-[320px] w-full sm:h-[420px]">
                  <iframe
                    title={resolvedMapTitle}
                    src={resolvedMapSrc}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            )}

            {plans.length > 0 && (
              <div className="space-y-4">
                {plans.map((plan) => (
                  <div
                    key={plan.alt}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/80"
                  >
                    <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        {plan.alt}
                      </h2>
                    </div>
                    <Image
                      src={plan.src}
                      alt={plan.alt}
                      className="h-auto w-full object-cover"
                      placeholder="blur"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 lg:sticky lg:top-24">
            <div className="mb-4 flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
                <FaLayerGroup />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                  Subdependencias
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Seleccioná un sector para abrir su inventario.
                </p>
              </div>
            </div>

            <div className="relative mb-4">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por ID o nombre"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
              />
            </div>

            {loading ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Cargando subdependencias...
              </div>
            ) : filtered.length > 0 ? (
              <ul className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {filtered.map((sub) => {
                  const label = `${sub.id} - ${sub.nombre}`;
                  const relevamiento = subRelevamientos[sub.id];
                  const completed = !!relevamiento;
                  return (
                    <li key={sub.id}>
                      <div
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                          completed
                            ? "border-emerald-200 bg-emerald-50 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30"
                            : "border-slate-200 bg-slate-50 hover:border-cyan-300 hover:bg-cyan-50 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-cyan-700 dark:hover:bg-cyan-950/20"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => openSubdependencia(sub)}
                          className="group flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                          aria-label={`Abrir ${label}`}
                          title={label}
                        >
                          <span className="min-w-0">
                            <span className={`block text-xs font-bold ${
                              completed
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-cyan-700 dark:text-cyan-300"
                            }`}>
                              ID: {sub.id}
                            </span>
                            <span className="mt-1 block truncate text-sm font-bold text-slate-950 dark:text-white">
                              {sub.nombre}
                            </span>
                            {completed && (
                              <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                <FaCheckCircle className="h-3 w-3" />
                                {formatDate(relevamiento.fecha_completado)}
                              </span>
                            )}
                          </span>
                          <FaArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-cyan-600 dark:group-hover:text-cyan-300" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openRelevamientoModal({
                              type: "subdependencia",
                              id: sub.id,
                              label,
                              currentDate: relevamiento?.fecha_completado,
                            })
                          }
                          disabled={viewer}
                          title={viewer ? "Solo lectura: no podes marcar relevamientos." : "Marcar relevamiento"}
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                            completed
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-white text-slate-500 ring-1 ring-slate-200 hover:text-emerald-700 hover:ring-emerald-300 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800 dark:hover:text-emerald-300"
                          } ${viewer ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          <FaCalendarCheck />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No hay subdependencias para mostrar.
              </div>
            )}
          </div>
        </section>

        {labelChainConfirmOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-4 py-6">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="label-chain-title"
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300">
                    <FaTag />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">
                      Cadena de etiquetas
                    </p>
                    <h2 id="label-chain-title" className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                      Preparar {labelProblemItems.length} etiquetas
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLabelChainConfirmOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                  aria-label="Cerrar confirmacion"
                  title="Cerrar"
                >
                  <FaTimes />
                </button>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Se cargarán todos los bienes con problema de etiqueta de este anexo. En el panel de Etiquetas podrás elegir el modelo y el fondo antes de descargar la cadena horizontal.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setLabelChainConfirmOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={openLabelChain}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 text-sm font-bold text-white transition hover:bg-cyan-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                >
                  <FaPrint />
                  Abrir en Etiquetas
                </button>
              </div>
            </div>
          </div>
        )}

        {target && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
                    {target.type === "anexo" ? "Relevamiento del anexo" : "Relevamiento por subdependencia"}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                    {target.label}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setTarget(null)}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  <FaTimes />
                </button>
              </div>

              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                Fecha completado
              </label>
              <input
                type="date"
                value={fechaRelevamiento}
                onChange={(event) => setFechaRelevamiento(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-emerald-400 dark:focus:ring-emerald-950"
              />

              <label className="mb-1.5 mt-4 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                Comentario del historial
              </label>
              <textarea
                rows={3}
                value={comentarioRelevamiento}
                onChange={(event) => setComentarioRelevamiento(event.target.value)}
                placeholder="Motivo del relevamiento"
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-950"
              />

              {target.currentDate && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                  Fecha actual: {formatDate(target.currentDate)}
                </div>
              )}

              <button
                type="button"
                onClick={() => openHistorialModal(target)}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:border-slate-800 dark:text-slate-200 dark:hover:border-cyan-800 dark:hover:bg-cyan-950/30 dark:hover:text-cyan-100"
              >
                <FaHistory />
                Ver historial
              </button>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={handleClearRelevamiento}
                  disabled={savingRelevamiento || !target.currentDate || viewer}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  Quitar marca
                </button>
                <button
                  type="button"
                  onClick={handleSaveRelevamiento}
                  disabled={savingRelevamiento || viewer}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  <FaCalendarCheck />
                  {savingRelevamiento ? "Guardando..." : "Guardar fecha"}
                </button>
              </div>
            </div>
          </div>
        )}

        {historialTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-4 py-6">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">
                    {historialTarget.type === "anexo"
                      ? "Historial del anexo"
                      : "Historial de subdependencia"}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                    {historialTarget.label}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setHistorialTarget(null)}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                  aria-label="Cerrar historial"
                  title="Cerrar"
                >
                  <FaTimes />
                </button>
              </div>

              {loadingHistorial ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Cargando historial...
                </div>
              ) : historialError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-center text-sm font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  {historialError}
                </div>
              ) : historial.length > 0 ? (
                <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                  {historial.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-base font-bold text-slate-950 dark:text-white">
                          {formatDate(item.fecha_completado)}
                        </p>
                        {item.fecha_creacion && (
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Registrado: {formatDateTime(item.fecha_creacion)}
                          </p>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
                        {item.comentario || "Sin comentario."}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Todavia no hay relevamientos guardados en el historial.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
