"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Car,
  Flame,
  LayoutGrid,
  List,
  PackageSearch,
  Palette,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { Wrapper } from "@/components";
import ConfirmModal from "@/components/Modal/ConfirmModal";
import MobiliarioPhotoGallery from "@/components/MobiliarioPhotoGallery";
import { formatMobiliarioDate } from "@/lib/dateFormat";
import { obtenerAnexos, obtenerSubdependencias } from "@/services/anexosService";
import {
  canAdminMatafuegos,
  canEditMatafuegos,
  isComisario,
} from "@/services/authRole";
import {
  MATAFUEGO_COLOR_MARBETE_OPTIONS,
  matafuegoMarbeteOption,
  matafuegoMarbetePorAnio,
  desactivarMatafuego,
  editarMatafuego,
  emitMatafuegosUpdated,
  importarMatafuegosDesdeMobiliario,
  obtenerCandidatosMatafuegos,
  obtenerMatafuegosPorAnexo,
  obtenerMatafuegosTodos,
  type Matafuego,
  type MatafuegoAlerta,
  type MatafuegoCandidato,
  type MatafuegoPayload,
} from "@/services/matafuegosService";

interface Subdependencia {
  id: number;
  nombre: string;
}

interface Anexo {
  id: number;
  nombre: string;
}

type BoolSelectValue = "" | "true" | "false";
type MatafuegoFilter = "todos" | "vencido" | "vence_10" | "vence_30" | "vence_90" | "vigente" | "sin_fecha";

type FormState = {
  id_anexo: string;
  id_subdependencia: string;
  asignado_vehiculo: boolean;
  vehiculo: string;
  codigo: string;
  tipo: string;
  capacidad: string;
  fecha_vencimiento: string;
  fecha_control: string;
  fecha_recarga: string;
  estado_recarga: "" | "M" | "B";
  senalizacion: BoolSelectValue;
  presion_adecuada: BoolSelectValue;
  color_marbete: string;
  prueba_hidraulica: string;
  estado: "activo" | "inactivo";
  observaciones: string;
};

const ALERTA_META: Record<MatafuegoAlerta, { label: string; badge: string; panel: string }> = {
  vencido: {
    label: "Vencido",
    badge: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100",
    panel: "border-l-red-500",
  },
  vence_10: {
    label: "10 dias",
    badge: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100",
    panel: "border-l-rose-500",
  },
  vence_30: {
    label: "30 dias",
    badge: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
    panel: "border-l-amber-500",
  },
  vence_90: {
    label: "90 dias",
    badge: "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-100",
    panel: "border-l-yellow-500",
  },
  vigente: {
    label: "Vigente",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
    panel: "border-l-emerald-500",
  },
  sin_fecha: {
    label: "Sin fecha",
    badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
    panel: "border-l-slate-400",
  },
  inactivo: {
    label: "Inactivo",
    badge: "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
    panel: "border-l-slate-400",
  },
  sin_matafuegos: {
    label: "Sin matafuegos",
    badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
    panel: "border-l-slate-400",
  },
};

const inputClasses =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

function emptyForm(defaultAnexo?: number): FormState {
  return {
    id_anexo: defaultAnexo ? String(defaultAnexo) : "",
    id_subdependencia: "",
    asignado_vehiculo: false,
    vehiculo: "",
    codigo: "",
    tipo: "",
    capacidad: "",
    fecha_vencimiento: "",
    fecha_control: "",
    fecha_recarga: "",
    estado_recarga: "",
    senalizacion: "",
    presion_adecuada: "",
    color_marbete: "",
    prueba_hidraulica: "",
    estado: "activo",
    observaciones: "",
  };
}

function dateInput(value?: string | null) {
  const iso = value?.slice(0, 10) || "";
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
}

function dateValueForApi(value: string, label: string) {
  const clean = value.trim();
  if (!clean) return null;

  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const displayMatch = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const parts = isoMatch
    ? [isoMatch[1], isoMatch[2], isoMatch[3]]
    : displayMatch
      ? [displayMatch[3], displayMatch[2], displayMatch[1]]
      : null;

  if (!parts) throw new Error(`${label}: usa el formato DD/MM/AAAA.`);

  const [year, month, day] = parts.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`${label}: la fecha no es valida.`);
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function pickerDateValue(value: string) {
  try {
    return dateValueForApi(value, "Fecha") || "";
  } catch {
    return "";
  }
}

function ManualDateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    try {
      picker.showPicker();
    } catch {
      picker.focus();
      picker.click();
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="DD/MM/AAAA"
        className={`${inputClasses} pr-12`}
      />
      <button
        type="button"
        onClick={openPicker}
        title="Elegir fecha en el calendario"
        aria-label="Elegir fecha en el calendario"
        className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-cyan-300"
      >
        <CalendarDays className="h-4 w-4" />
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={pickerDateValue(value)}
        onChange={(event) => onChange(dateInput(event.target.value))}
        className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0"
      />
    </div>
  );
}

function daysLabel(value?: number | null) {
  if (value === null || value === undefined) return "Sin fecha";
  if (value < 0) return `Vencido hace ${Math.abs(value)} dias`;
  if (value === 0) return "Vence hoy";
  return `${value} dias`;
}

function dateLabel(value?: string | null) {
  return value ? formatMobiliarioDate(value, "date") : "-";
}

function boolToSelect(value?: boolean | null): BoolSelectValue {
  if (value === true) return "true";
  if (value === false) return "false";
  return "";
}

function selectToBool(value: BoolSelectValue) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function titleOf(item: Matafuego) {
  return item.descripcion_mobiliario || item.codigo || "Matafuego";
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR");
}

export default function MatafuegosPanel({ idAnexo }: { idAnexo?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canEdit = canEditMatafuegos();
  const canAdmin = canAdminMatafuegos();
  const comisario = isComisario();
  const anexoMode = Number.isFinite(idAnexo);
  const highlightedId = searchParams.get("id") || searchParams.get("matafuego");
  const highlightedMobiliarioId =
    searchParams.get("mobiliario") || searchParams.get("id_mobiliario");
  const currentYear = new Date().getFullYear();
  const currentYearMarbete = matafuegoMarbetePorAnio(currentYear);

  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [formSubdependencias, setFormSubdependencias] = useState<Subdependencia[]>([]);
  const [items, setItems] = useState<Matafuego[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MatafuegoFilter>("todos");
  const [inventoryView, setInventoryView] = useState<"table" | "cards">("table");
  const [anexoFilter, setAnexoFilter] = useState("");
  const [candidates, setCandidates] = useState<MatafuegoCandidato[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Matafuego | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Matafuego | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(idAnexo));
  const [importFecha, setImportFecha] = useState("");
  const [importControl, setImportControl] = useState("");
  const [importObservaciones, setImportObservaciones] = useState("");

  const stats = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.alerta === "vencido") acc.vencidos += 1;
        if (item.alerta === "vence_10") acc.vence10 += 1;
        if (item.alerta === "vence_30") acc.vence30 += 1;
        if (item.alerta === "vence_90") acc.vence90 += 1;
        if (item.alerta === "sin_fecha") acc.sinFecha += 1;
        if (item.alerta === "vigente") acc.vigentes += 1;
        return acc;
      },
      { total: 0, vencidos: 0, vence10: 0, vence30: 0, vence90: 0, sinFecha: 0, vigentes: 0 }
    );
  }, [items]);

  const visibleItems = useMemo(() => {
    const query = normalizeSearch(search.trim());
    return items.filter((item) => {
      if (filter !== "todos" && item.alerta !== filter) return false;
      if (anexoFilter && String(item.id_anexo) !== anexoFilter) return false;
      if (!query) return true;
      return normalizeSearch([
        item.id,
        item.id_mobiliario,
        item.codigo,
        item.descripcion_mobiliario,
        item.anexo,
        item.subdependencia,
        item.ubicacion_detalle,
        item.vehiculo,
        item.tipo,
      ].filter(Boolean).join(" ")).includes(query);
    });
  }, [anexoFilter, filter, items, search]);

  useEffect(() => {
    if (highlightedId || highlightedMobiliarioId) {
      setSearch("");
      setFilter("todos");
    }
  }, [highlightedId, highlightedMobiliarioId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [anexosData, matafuegosData, candidatesData] = await Promise.all([
        obtenerAnexos(),
        anexoMode && idAnexo
          ? obtenerMatafuegosPorAnexo(idAnexo)
          : obtenerMatafuegosTodos(),
        canAdmin && anexoMode && idAnexo
          ? obtenerCandidatosMatafuegos(idAnexo)
          : Promise.resolve([]),
      ]);
      const nextAnexos = anexosData as Anexo[];
      setAnexos(nextAnexos);
      setAnexo(
        anexoMode && idAnexo
          ? nextAnexos.find((item) => Number(item.id) === idAnexo) ?? null
          : null
      );
      setItems(matafuegosData);
      setCandidates(candidatesData);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar los matafuegos.");
    } finally {
      setLoading(false);
    }
  }, [anexoMode, canAdmin, idAnexo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!modalOpen) return;
    const targetAnexo = Number(form.id_anexo);
    if (!targetAnexo) {
      setFormSubdependencias([]);
      return;
    }

    let cancelled = false;
    obtenerSubdependencias(targetAnexo)
      .then((data) => {
        if (!cancelled) setFormSubdependencias(data as Subdependencia[]);
      })
      .catch(() => {
        if (!cancelled) setFormSubdependencias([]);
      });

    return () => {
      cancelled = true;
    };
  }, [form.id_anexo, modalOpen]);

  useEffect(() => {
    if (loading || (!highlightedId && !highlightedMobiliarioId)) return;

    const timeout = window.setTimeout(() => {
      const target = highlightedId
        ? items.find((item) => String(item.id) === highlightedId)
        : items.find((item) => String(item.id_mobiliario) === highlightedMobiliarioId);

      if (target) {
        document
          .getElementById(`matafuego-${target.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    return () => window.clearTimeout(timeout);
  }, [highlightedId, highlightedMobiliarioId, loading, items]);

  const selectedAnexo = useMemo(
    () => anexos.find((item) => String(item.id) === form.id_anexo),
    [anexos, form.id_anexo]
  );

  const selectedSubdependencia = useMemo(
    () => formSubdependencias.find((item) => String(item.id) === form.id_subdependencia),
    [formSubdependencias, form.id_subdependencia]
  );

  const openEdit = (item: Matafuego) => {
    setEditing(item);
    setForm({
      id_anexo: item.id_anexo ? String(item.id_anexo) : idAnexo ? String(idAnexo) : "",
      id_subdependencia: item.id_subdependencia ? String(item.id_subdependencia) : "",
      asignado_vehiculo: Boolean(item.vehiculo?.trim()),
      vehiculo: item.vehiculo || "",
      codigo: item.codigo || "",
      tipo: item.tipo || "",
      capacidad: item.capacidad || "",
      fecha_vencimiento: dateInput(item.fecha_vencimiento),
      fecha_control: dateInput(item.fecha_control),
      fecha_recarga: dateInput(item.fecha_recarga),
      estado_recarga: item.estado_recarga || "",
      senalizacion: boolToSelect(item.senalizacion),
      presion_adecuada: boolToSelect(item.presion_adecuada),
      color_marbete: matafuegoMarbeteOption(item.color_marbete).value,
      prueba_hidraulica: dateInput(item.prueba_hidraulica),
      estado: item.estado || "activo",
      observaciones: item.observaciones || "",
    });
    setModalOpen(true);
  };

  const buildPayload = (): MatafuegoPayload => ({
    id_anexo: Number(form.id_anexo),
    id_subdependencia: form.id_subdependencia ? Number(form.id_subdependencia) : null,
    id_mobiliario: editing?.id_mobiliario || null,
    vehiculo: form.asignado_vehiculo
      ? form.vehiculo.trim().toLocaleUpperCase("es-AR") || null
      : null,
    codigo: form.codigo || null,
    ubicacion_detalle: null,
    tipo: form.tipo || null,
    capacidad: form.capacidad || null,
    fecha_vencimiento: dateValueForApi(form.fecha_vencimiento, "Vencimiento"),
    fecha_control: dateValueForApi(form.fecha_control, "Control"),
    fecha_recarga: dateValueForApi(form.fecha_recarga, "Fecha de recarga"),
    estado_recarga: form.estado_recarga || null,
    senalizacion: selectToBool(form.senalizacion),
    presion_adecuada: selectToBool(form.presion_adecuada),
    color_marbete: form.color_marbete || null,
    prueba_hidraulica: dateValueForApi(form.prueba_hidraulica, "Prueba hidráulica"),
    estado: form.estado,
    observaciones: form.observaciones || null,
  });

  const handleSave = async () => {
    if (!editing || !canEdit) return;
    if (!form.id_anexo) {
      toast.error("Selecciona un anexo.");
      return;
    }

    try {
      setSaving(true);
      const updated = await editarMatafuego(editing.id, buildPayload());
      setItems((prev) => {
        if (anexoMode && idAnexo && Number(updated.id_anexo) !== Number(idAnexo)) {
          return prev.filter((item) => item.id !== updated.id);
        }
        return prev.map((item) => (item.id === updated.id ? updated : item));
      });
      setModalOpen(false);
      setEditing(null);
      emitMatafuegosUpdated();
      toast.success("Matafuego actualizado.");
      void loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = (item: Matafuego) => {
    setRemoveTarget(item);
  };

  const confirmDeactivate = async () => {
    if (!removeTarget) return;
    try {
      setRemoving(true);
      await desactivarMatafuego(removeTarget.id);
      setItems((prev) => prev.filter((item) => item.id !== removeTarget.id));
      setRemoveTarget(null);
      emitMatafuegosUpdated();
      toast.success("Matafuego quitado.");
      void loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo quitar.");
    } finally {
      setRemoving(false);
    }
  };

  const toggleCandidate = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleImport = async () => {
    if (selectedIds.length === 0) {
      toast.error("Selecciona al menos un mobiliario.");
      return;
    }
    try {
      setImporting(true);
      const result = await importarMatafuegosDesdeMobiliario(selectedIds, {
        fecha_vencimiento: dateValueForApi(importFecha, "Vencimiento"),
        fecha_control: dateValueForApi(importControl, "Control"),
        observaciones: importObservaciones || null,
      });
      toast.success(`Importados: ${result.cantidad}`);
      setSelectedIds([]);
      setImportFecha("");
      setImportControl("");
      setImportObservaciones("");
      emitMatafuegosUpdated();
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo importar.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Wrapper>
      <Toaster />
      <ConfirmModal
        isOpen={Boolean(removeTarget)}
        title="Quitar matafuego"
        message={
          removeTarget
            ? `Vas a quitar "${titleOf(removeTarget)}" del modulo de control.`
            : "Esta accion no se puede deshacer."
        }
        confirmText="Quitar"
        cancelText="Cancelar"
        loading={removing}
        onConfirm={confirmDeactivate}
        onCancel={() => {
          if (!removing) setRemoveTarget(null);
        }}
      />

      <main className="min-h-screen px-3 py-5 text-slate-950 sm:px-4 sm:py-6 dark:text-white">
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="border-b border-slate-200 pb-5 dark:border-slate-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                  {anexoMode
                    ? anexo
                      ? `${anexo.id} - ${anexo.nombre}`
                      : `Anexo ${idAnexo}`
                    : "Control de matafuegos"}
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {anexoMode
                    ? "Vista filtrada por anexo."
                    : "Todos los matafuegos activos del sistema."}
                </p>
                <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <span
                    className="h-4 w-4 shrink-0 rounded border border-slate-400"
                    style={{ backgroundColor: currentYearMarbete.hex }}
                    aria-hidden="true"
                  />
                  Marbete {currentYear}: {currentYearMarbete.label}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/Anexos")}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anexos
                </button>
                {anexoMode && (
                  <Link
                    href="/matafuegos"
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-800 hover:bg-white dark:border-red-800 dark:bg-red-950/30 dark:text-red-100 dark:hover:bg-slate-900"
                  >
                    <Flame className="h-4 w-4" />
                    Ver todos
                  </Link>
                )}
                {!comisario && (
                  <Link
                    href={anexoMode && idAnexo ? `/matafuegos/imprimir?anexo=${idAnexo}` : "/matafuegos/imprimir"}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </Link>
                )}
                <button
                  type="button"
                  onClick={loadData}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Total" value={stats.total} tone="slate" active={filter === "todos"} onClick={() => setFilter("todos")} />
            <StatCard label="Vencidos" value={stats.vencidos} tone="red" active={filter === "vencido"} onClick={() => setFilter("vencido")} />
            <StatCard label="10 dias" value={stats.vence10} tone="rose" active={filter === "vence_10"} onClick={() => setFilter("vence_10")} />
            <StatCard label="30 dias" value={stats.vence30} tone="amber" active={filter === "vence_30"} onClick={() => setFilter("vence_30")} />
            <StatCard label="90 dias" value={stats.vence90} tone="yellow" active={filter === "vence_90"} onClick={() => setFilter("vence_90")} />
            <StatCard label="Sin fecha" value={stats.sinFecha} tone="slate" active={filter === "sin_fecha"} onClick={() => setFilter("sin_fecha")} />
          </section>

          {stats.vencidos > 0 && (
            <button
              type="button"
              onClick={() => setFilter("vencido")}
              className="flex w-full flex-wrap items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-900 transition hover:border-red-400 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100"
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <strong>{stats.vencidos} {stats.vencidos === 1 ? "equipo necesita" : "equipos necesitan"} atención.</strong>
              <span>Hay matafuegos vencidos que requieren revisión.</span>
              <span className="ml-auto font-bold">Revisar equipos →</span>
            </button>
          )}

          <section className="overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-700">
              <div>
                <h2 className="text-base font-black">Inventario de equipos</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {visibleItems.length} de {stats.total} matafuegos
                </p>
              </div>
              <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800" role="group" aria-label="Vista de inventario">
                <button type="button" onClick={() => setInventoryView("table")} aria-pressed={inventoryView === "table"} className={`inline-flex h-8 items-center gap-1.5 rounded px-3 text-xs font-bold ${inventoryView === "table" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}><List className="h-4 w-4" /> Tabla</button>
                <button type="button" onClick={() => setInventoryView("cards")} aria-pressed={inventoryView === "cards"} className={`inline-flex h-8 items-center gap-1.5 rounded px-3 text-xs font-bold ${inventoryView === "cards" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}><LayoutGrid className="h-4 w-4" /> Tarjetas</button>
              </div>
            </div>

            <div className="flex flex-col gap-2 p-4 lg:flex-row lg:items-center">
              <label className="relative block min-w-0 flex-1">
                <span className="sr-only">Buscar matafuego</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por ID, ubicacion, vehiculo o descripcion"
                  className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
              {!anexoMode && (
                <select value={anexoFilter} onChange={(event) => setAnexoFilter(event.target.value)} aria-label="Filtrar por anexo" className={`${inputClasses} lg:w-52`}>
                  <option value="">Todos los anexos</option>
                  {anexos.map((item) => <option key={item.id} value={item.id}>{item.id} - {item.nombre}</option>)}
                </select>
              )}
              <select value={filter} onChange={(event) => setFilter(event.target.value as MatafuegoFilter)} aria-label="Filtrar por estado" className={`${inputClasses} lg:w-44`}>
                <option value="todos">Todos los estados</option>
                <option value="vencido">Vencidos</option>
                <option value="vence_10">En 10 días</option>
                <option value="vence_30">En 30 días</option>
                <option value="vence_90">En 90 días</option>
                <option value="vigente">Vigentes</option>
                <option value="sin_fecha">Sin fecha</option>
              </select>
            </div>

            {loading ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                Cargando...
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay matafuegos cargados.
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay matafuegos para esta busqueda o filtro.
              </div>
            ) : (
              inventoryView === "cards" ? (
              <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 2xl:grid-cols-3">
                {visibleItems.map((item) => (
                  <MatafuegoCard
                    key={item.id}
                    item={item}
                    highlighted={
                      String(item.id) === highlightedId ||
                      String(item.id_mobiliario) === highlightedMobiliarioId
                    }
                    canEdit={canEdit}
                    onEdit={() => openEdit(item)}
                  />
                ))}
              </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      <tr><th className="px-4 py-3">Equipo</th><th className="px-4 py-3">Ubicación</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Vencimiento</th><th className="px-4 py-3">Último control</th><th className="px-4 py-3">Marbete</th><th className="px-4 py-3"><span className="sr-only">Acción</span></th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {visibleItems.map((item) => {
                        const meta = ALERTA_META[item.alerta] || ALERTA_META.sin_fecha;
                        return <tr key={item.id} id={`matafuego-${item.id}`} className={`hover:bg-slate-50 dark:hover:bg-slate-800/70 ${String(item.id) === highlightedId || String(item.id_mobiliario) === highlightedMobiliarioId ? "bg-cyan-50 dark:bg-cyan-950/40" : ""}`}>
                          <td className="px-4 py-3"><div className="flex items-center gap-3"><MatafuegoPhoto photos={[item.foto_url, item.foto_url_2]} title={titleOf(item)} mini /><span className="min-w-0"><strong className="block max-w-56 break-words text-slate-900 dark:text-white">{item.tipo || "Matafuego"}{item.capacidad ? ` · ${item.capacidad}` : ""}</strong><span className="text-xs text-slate-500 dark:text-slate-400">ID {item.id_mobiliario || item.codigo || item.id}</span></span></div></td>
                          <td className="px-4 py-3"><strong className="block text-slate-800 dark:text-slate-100">{item.anexo || "Sin anexo"}</strong><span className="text-xs text-slate-500 dark:text-slate-400">{item.subdependencia || item.ubicacion_detalle || "Sin sector"}{item.vehiculo ? ` · ${item.vehiculo}` : ""}</span></td>
                          <td className="px-4 py-3"><span className={`inline-flex rounded border px-2 py-1 text-xs font-bold ${meta.badge}`}>{meta.label}</span></td>
                          <td className="px-4 py-3"><strong className="block">{dateLabel(item.fecha_vencimiento)}</strong><span className="text-xs text-slate-500 dark:text-slate-400">{daysLabel(item.dias_para_vencer)}</span></td>
                          <td className="px-4 py-3">{dateLabel(item.fecha_control)}</td>
                          <td className="px-4 py-3"><ColorPill value={item.color_marbete} /></td>
                          <td className="px-4 py-3"><button type="button" onClick={() => openEdit(item)} className="whitespace-nowrap text-xs font-bold text-cyan-800 hover:underline dark:text-cyan-300">Ver detalle ↗</button></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </section>

          {canAdmin && anexoMode && (
            <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-black">
                    <PackageSearch className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
                    Candidatos desde mobiliario
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {candidates.length} pendientes
                  </p>
                </div>
                {candidates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds(candidates.map((item) => item.id_mobiliario))}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
                  >
                    Seleccionar todos
                  </button>
                )}
              </div>

              {candidates.length > 0 ? (
                <>
                  <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr_2fr_auto] lg:items-end">
                    <Field label="Vencimiento">
                      <ManualDateInput
                        value={importFecha}
                        onChange={setImportFecha}
                      />
                    </Field>
                    <Field label="Control">
                      <ManualDateInput
                        value={importControl}
                        onChange={setImportControl}
                      />
                    </Field>
                    <Field label="Observaciones">
                      <input
                        type="text"
                        value={importObservaciones}
                        onChange={(event) => setImportObservaciones(event.target.value)}
                        placeholder="Observaciones"
                        className={inputClasses}
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={importing || selectedIds.length === 0}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400 lg:w-auto"
                    >
                      <Upload className="h-4 w-4" />
                      Importar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                    {candidates.map((candidate) => (
                      <label
                        key={candidate.id_mobiliario}
                        className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 hover:border-cyan-300 dark:border-slate-800 dark:bg-slate-900/70"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(candidate.id_mobiliario)}
                          onChange={() => toggleCandidate(candidate.id_mobiliario)}
                          className="mt-1 h-4 w-4 shrink-0"
                        />
                        <MatafuegoPhoto
                          photos={[candidate.foto_url, candidate.foto_url_2]}
                          title={candidate.descripcion || "Matafuego"}
                          compact
                        />
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-cyan-700 dark:text-cyan-300">
                            ID: {candidate.id_mobiliario} - {candidate.subdependencia}
                          </span>
                          <span className="mt-1 block line-clamp-2 text-sm font-black">
                            {candidate.descripcion || "Sin descripcion"}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                            {[candidate.rubro, candidate.clase_bien].filter(Boolean).join(" / ")}
                          </span>
                          {candidate.vehiculo && (
                            <span className="mt-1 block text-xs font-semibold text-cyan-800 dark:text-cyan-200">
                              Vehículo: {candidate.vehiculo}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No hay candidatos pendientes para importar.
                </div>
              )}
            </section>
          )}
        </div>

        {modalOpen && editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 sm:p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="matafuego-detail-title" className="flex h-dvh w-full max-w-3xl flex-col overflow-hidden bg-white shadow-xl sm:h-[min(92dvh,900px)] sm:rounded-md sm:border sm:border-slate-200 dark:bg-slate-900 dark:sm:border-slate-700">
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                    Inventario / ID {editing.id_mobiliario || editing.id}
                  </p>
                  <h2 id="matafuego-detail-title" className="mt-1 text-xl font-black">Detalle del matafuego</h2>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">{titleOf(editing)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                  title="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 sm:p-5 dark:bg-slate-950">
              <fieldset disabled={!canEdit} className="space-y-4 disabled:opacity-80">
              <section className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 text-sm font-black"><span className="mr-3 text-cyan-700 dark:text-cyan-300">01</span>Ubicacion e identificacion</h3>
                <div className="mb-4 rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-100">
                  <p className="text-xs font-black uppercase">Ubicacion automatica</p>
                  <p className="mt-1">
                    {selectedAnexo ? `${selectedAnexo.id} - ${selectedAnexo.nombre}` : "Selecciona anexo"}
                  </p>
                  <p className="mt-1 text-cyan-800 dark:text-cyan-200">
                    {selectedSubdependencia
                      ? `${selectedSubdependencia.id} - ${selectedSubdependencia.nombre}`
                      : "Sin subdependencia"}
                  </p>
                </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Anexo">
                  <select
                    value={form.id_anexo}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        id_anexo: event.target.value,
                        id_subdependencia: "",
                      }))
                    }
                    className={inputClasses}
                  >
                    <option value="">Seleccionar anexo</option>
                    {anexos.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.id} - {item.nombre}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Subdependencia">
                  <select
                    value={form.id_subdependencia}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, id_subdependencia: event.target.value }))
                    }
                    className={inputClasses}
                  >
                    <option value="">Sin subdependencia</option>
                    {formSubdependencias.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.id} - {sub.nombre}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="md:col-span-2 rounded-md border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                      <Car className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-300" />
                      Asignado a vehículo
                    </span>
                    <input
                      type="checkbox"
                      checked={form.asignado_vehiculo}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setForm((prev) => ({
                          ...prev,
                          asignado_vehiculo: checked,
                          vehiculo: checked ? prev.vehiculo : "",
                        }));
                      }}
                      className="h-4 w-4 shrink-0 accent-cyan-700"
                    />
                  </label>

                  {form.asignado_vehiculo && (
                    <div className="relative mt-3">
                      <Car className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={form.vehiculo}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, vehiculo: event.target.value }))
                        }
                        placeholder="Ej. Combi 2 o Toyota Hilux"
                        className={`${inputClasses} pl-10 uppercase`}
                      />
                    </div>
                  )}
                </div>

                <Field label="Codigo">
                  <input
                    value={form.codigo}
                    onChange={(event) => setForm((prev) => ({ ...prev, codigo: event.target.value }))}
                    className={inputClasses}
                  />
                </Field>

                {canAdmin && (
                  <Field label="Estado">
                    <select
                      value={form.estado}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, estado: event.target.value as FormState["estado"] }))
                      }
                      className={inputClasses}
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </Field>
                )}

              </div>
              </section>
              <section className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 text-sm font-black"><span className="mr-3 text-cyan-700 dark:text-cyan-300">02</span>Caracteristicas tecnicas</h3>
                <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tipo">
                  <input
                    value={form.tipo}
                    onChange={(event) => setForm((prev) => ({ ...prev, tipo: event.target.value }))}
                    placeholder="ABC / CO2"
                    className={inputClasses}
                  />
                </Field>

                <Field label="Capacidad">
                  <input
                    value={form.capacidad}
                    onChange={(event) => setForm((prev) => ({ ...prev, capacidad: event.target.value }))}
                    placeholder="5kg"
                    className={inputClasses}
                  />
                </Field>

                </div>
              </section>
              <section className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 text-sm font-black"><span className="mr-3 text-cyan-700 dark:text-cyan-300">03</span>Fechas y mantenimiento</h3>
                <div className="grid gap-4 md:grid-cols-2">
                <Field label="Vencimiento">
                  <ManualDateInput
                    value={form.fecha_vencimiento}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, fecha_vencimiento: value }))
                    }
                  />
                </Field>

                <Field label="Control">
                  <ManualDateInput
                    value={form.fecha_control}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, fecha_control: value }))
                    }
                  />
                </Field>

                <Field label="Fecha recarga">
                  <ManualDateInput
                    value={form.fecha_recarga}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, fecha_recarga: value }))
                    }
                  />
                </Field>

                <Field label="Estado recarga">
                  <select
                    value={form.estado_recarga}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        estado_recarga: event.target.value as FormState["estado_recarga"],
                      }))
                    }
                    className={inputClasses}
                  >
                    <option value="">Sin cargar</option>
                    <option value="B">B</option>
                    <option value="M">M</option>
                  </select>
                </Field>

                <Field label="Señalización">
                  <select
                    value={form.senalizacion}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        senalizacion: event.target.value as BoolSelectValue,
                      }))
                    }
                    className={inputClasses}
                  >
                    <option value="">Sin cargar</option>
                    <option value="true">Si</option>
                    <option value="false">No</option>
                  </select>
                </Field>

                <Field label="Presión adecuada">
                  <select
                    value={form.presion_adecuada}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        presion_adecuada: event.target.value as BoolSelectValue,
                      }))
                    }
                    className={inputClasses}
                  >
                    <option value="">Sin cargar</option>
                    <option value="true">Si</option>
                    <option value="false">No</option>
                  </select>
                </Field>

                <Field label="Prueba hidráulica">
                  <ManualDateInput value={form.prueba_hidraulica} onChange={(value) => setForm((prev) => ({ ...prev, prueba_hidraulica: value }))} />
                </Field>
                </div>
              </section>
              <section className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 text-sm font-black"><span className="mr-3 text-cyan-700 dark:text-cyan-300">04</span>Marbete y observaciones</h3>
                <div className="space-y-4">
                <div>
                  <span className="mb-2 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Color marbete</span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {MATAFUEGO_COLOR_MARBETE_OPTIONS.map((option) => {
                      const active = form.color_marbete === option.value;
                      return (
                        <button
                          key={option.value || "sin-color"}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, color_marbete: option.value }))
                          }
                          aria-pressed={active}
                          className={`flex h-10 min-w-0 items-center gap-2 rounded-md border px-2 text-left text-xs font-bold transition ${
                            active
                              ? "border-cyan-600 bg-cyan-50 text-cyan-950 ring-2 ring-cyan-600/20 dark:border-cyan-400 dark:bg-cyan-950/40 dark:text-cyan-100"
                              : "border-slate-300 bg-white text-slate-700 hover:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          }`}
                        >
                          <span className="h-5 w-5 shrink-0 rounded border border-slate-400" style={{ backgroundColor: option.hex || "transparent" }} />
                          <span className="truncate">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, color_marbete: currentYearMarbete.value }))
                    }
                    className="mt-2 inline-flex h-9 items-center gap-2 rounded-md border border-cyan-300 bg-cyan-50 px-3 text-xs font-black text-cyan-900 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-100"
                  >
                    <Palette className="h-4 w-4" /> Usar {currentYearMarbete.label} ({currentYear})
                  </button>
                </div>

                <div className="md:col-span-2">
                  <Field label="Observaciones">
                    <textarea
                      rows={3}
                      value={form.observaciones}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, observaciones: event.target.value }))
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </Field>
                </div>
              </div>

              </section>
              </fieldset>
              <section className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 text-sm font-black"><span className="mr-3 text-cyan-700 dark:text-cyan-300">05</span>Fotografias</h3>
                <div className="max-w-md"><MatafuegoPhoto photos={[editing.foto_url, editing.foto_url_2]} title={titleOf(editing)} /></div>
              </section>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900">
                {canAdmin && <button type="button" onClick={() => { setModalOpen(false); handleDeactivate(editing); }} className="mr-auto text-sm font-bold text-red-700 hover:underline dark:text-red-300">Quitar del control</button>}
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-10 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  Cancelar
                </button>
                {canEdit && <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="h-10 rounded-md bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>}
              </div>
            </div>
          </div>
        )}
      </main>
    </Wrapper>
  );
}

function MatafuegoCard({
  item,
  highlighted,
  canEdit,
  onEdit,
}: {
  item: Matafuego;
  highlighted: boolean;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const meta = ALERTA_META[item.alerta] || ALERTA_META.sin_fecha;

  return (
    <article
      id={`matafuego-${item.id}`}
      className={`flex h-full min-w-0 flex-col rounded-md border border-slate-200 bg-white p-4 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 ${
        highlighted ? "ring-2 ring-red-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-950" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <MatafuegoPhoto photos={[item.foto_url, item.foto_url_2]} title={titleOf(item)} compact />
        <span className={`inline-flex rounded border px-2 py-1 text-xs font-bold ${meta.badge}`}>{meta.label}</span>
      </div>
      <h3 className="mt-3 break-words text-base font-black text-slate-900 dark:text-white">{item.tipo || "Matafuego"}{item.capacidad ? ` · ${item.capacidad}` : ""}</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">ID {item.id_mobiliario || item.codigo || item.id} · {item.anexo || "Sin anexo"}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.subdependencia || item.ubicacion_detalle || "Sin sector"}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-200 py-3 dark:border-slate-700">
        <InfoField icon={<CalendarDays className="h-3.5 w-3.5" />} label="Vencimiento">{dateLabel(item.fecha_vencimiento)}</InfoField>
        <InfoField icon={<CalendarDays className="h-3.5 w-3.5" />} label="Control">{dateLabel(item.fecha_control)}</InfoField>
        <InfoField icon={<Palette className="h-3.5 w-3.5" />} label="Marbete"><ColorPill value={item.color_marbete} /></InfoField>
        <InfoField icon={<Car className="h-3.5 w-3.5" />} label="Vehículo">{item.vehiculo || "No asignado"}</InfoField>
      </dl>
      <button type="button" onClick={onEdit} className="mt-4 flex h-10 w-full items-center justify-center rounded-md border border-slate-300 text-sm font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-white dark:hover:bg-slate-800">{canEdit ? "Ver detalle y editar" : "Ver detalle"} ↗</button>
    </article>
  );
}

function MatafuegoPhoto({
  photos,
  title,
  compact = false,
  mini = false,
  card = false,
}: {
  photos: Array<string | null | undefined>;
  title: string;
  compact?: boolean;
  mini?: boolean;
  card?: boolean;
}) {
  const frameClass = mini
    ? "h-12 w-12 shrink-0 rounded-md border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
    : compact
    ? "h-20 w-20 shrink-0 rounded-md border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
    : card
      ? "aspect-[4/3] w-full rounded-md border border-slate-200 bg-slate-100 sm:aspect-square dark:border-slate-700 dark:bg-slate-800"
    : "aspect-[4/3] w-full rounded-md border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800";

  return (
    <MobiliarioPhotoGallery
      photos={photos}
      alt={`Foto de ${title}`}
      className={frameClass}
      imageClassName={card ? "object-contain" : "object-cover"}
      emptyLabel={compact || mini ? "" : "Sin imagen"}
    />
  );
}

function ColorPill({ value }: { value?: string | null }) {
  const option = matafuegoMarbeteOption(value);
  if (!option.value) return <span>-</span>;

  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-3.5 w-3.5 rounded-full border border-slate-400" style={{ backgroundColor: option.hex }} />
      {option.label}
    </span>
  );
}

function InfoField({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
        {icon} {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm font-bold text-slate-950 dark:text-white">{children}</dd>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: "slate" | "red" | "rose" | "amber" | "yellow";
  active: boolean;
  onClick: () => void;
}) {
  const classes = {
    slate: "text-slate-900 dark:text-white",
    red: "text-red-700 dark:text-red-300",
    rose: "text-rose-700 dark:text-rose-300",
    amber: "text-amber-700 dark:text-amber-300",
    yellow: "text-yellow-700 dark:text-yellow-300",
  }[tone];

  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`min-h-24 rounded-md border bg-white p-4 text-left transition hover:border-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-700 dark:bg-slate-900 ${active ? "border-cyan-600 ring-1 ring-cyan-600 dark:border-cyan-400" : "border-slate-200 dark:border-slate-700"}`}>
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-black ${classes}`}>{value}</p>
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}
