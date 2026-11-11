"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  Check,
  CheckCheck,
  Building2,
  CalendarDays,
  Download,
  Eye,
  FilePlus2,
  Keyboard,
  MessageSquareText,
  Pencil,
  Plus,
  Printer,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { Wrapper } from "@/components";
import { getAuthUser } from "@/services/authRole";
import {
  enviarMensajeCompras,
  crearProveedorCompras,
  eliminarProveedorCompras,
  guardarReporteCompras,
  listarProveedoresCompras,
  listarReportesCompras,
  marcarReporteComprasLeido,
  obtenerReporteCompras,
  type CompraBienItem,
  type CompraBienReporte,
  type CompraProveedor,
} from "@/services/comprasBienesService";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const SURVEY_STATES = [
  "NO IDENTIFICADO",
  "ENCONTRADO",
  "ENCONTRADO NO COINCIDE/FACTURA",
] as const;

const fieldClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:[color-scheme:dark] dark:focus:border-cyan-400 dark:focus:ring-cyan-950";
const textareaClass = `${fieldClass} h-auto min-h-20 resize-y py-2`;

function emptyItem(): CompraBienItem {
  return {
    posible_ubicacion: "",
    cantidad: 1,
    descripcion_factura: "",
    fecha_compra: "",
    fecha_listado: "",
    estado_relevamiento: "",
    proveedor: "",
  };
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(
    "es-AR",
    withTime
      ? { dateStyle: "short", timeStyle: "short" }
      : { dateStyle: "short" }
  ).format(date);
}

function surveyStateClasses(state: string) {
  if (state === "ENCONTRADO") {
    return "border-emerald-600 bg-emerald-100 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-100";
  }
  if (state === "NO IDENTIFICADO") {
    return "border-rose-600 bg-rose-100 text-rose-900 dark:border-rose-400 dark:bg-rose-500/20 dark:text-rose-100";
  }
  return "border-amber-600 bg-amber-100 text-amber-950 dark:border-amber-400 dark:bg-amber-500/20 dark:text-amber-100";
}

function formatPurchaseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function parsePurchaseDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 2000 ||
    year > 2100 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function PurchaseDateInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [mode, setMode] = useState<"manual" | "calendar">("manual");
  const [manualValue, setManualValue] = useState(() => formatPurchaseDate(value));

  useEffect(() => {
    setManualValue(formatPurchaseDate(value));
  }, [value]);

  return (
    <div className="grid gap-1.5">
      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-slate-300 bg-slate-100 p-0.5 dark:border-slate-600 dark:bg-slate-950">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`inline-flex h-7 items-center justify-center gap-1 rounded text-[10px] font-black uppercase transition ${mode === "manual" ? "bg-white text-cyan-800 shadow-sm dark:bg-slate-800 dark:text-cyan-200" : "text-slate-500 dark:text-slate-400"}`}
        >
          <Keyboard className="h-3.5 w-3.5" /> Manual
        </button>
        <button
          type="button"
          onClick={() => setMode("calendar")}
          className={`inline-flex h-7 items-center justify-center gap-1 rounded text-[10px] font-black uppercase transition ${mode === "calendar" ? "bg-white text-cyan-800 shadow-sm dark:bg-slate-800 dark:text-cyan-200" : "text-slate-500 dark:text-slate-400"}`}
        >
          <CalendarDays className="h-3.5 w-3.5" /> Calendario
        </button>
      </div>

      {mode === "manual" ? (
        <input
          required
          type="text"
          inputMode="numeric"
          maxLength={10}
          pattern="\d{2}/\d{2}/\d{4}"
          placeholder="DD/MM/AAAA"
          value={manualValue}
          onChange={(event) => {
            const next = event.target.value.replace(/[^\d/]/g, "").slice(0, 10);
            setManualValue(next);
            const parsed = parsePurchaseDate(next);
            event.currentTarget.setCustomValidity(
              next.length === 10 && !parsed ? "Ingresa una fecha valida." : ""
            );
            if (parsed) onChange(parsed);
            else if (!next) onChange("");
          }}
          onBlur={(event) => {
            if (manualValue && !parsePurchaseDate(manualValue)) {
              event.currentTarget.setCustomValidity("Ingresa una fecha valida en formato DD/MM/AAAA.");
            }
          }}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
          aria-label={`${label} manual en formato dia, mes y año`}
        />
      ) : (
        <input
          required
          type="date"
          value={value}
          min="2000-01-01"
          max="2100-12-31"
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
          aria-label={`${label} elegida con calendario`}
        />
      )}
    </div>
  );
}

export default function ComprasBienesPage() {
  const { username, role } = getAuthUser();
  const canEdit = role === "admin" || role === "superadmin";
  const isDante = (username ?? "").trim().toLowerCase() === "dante";
  const now = new Date();

  const [reports, setReports] = useState<CompraBienReporte[]>([]);
  const [selected, setSelected] = useState<CompraBienReporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number>();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [observations, setObservations] = useState("");
  const [items, setItems] = useState<CompraBienItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [providers, setProviders] = useState<CompraProveedor[]>([]);
  const [providersOpen, setProvidersOpen] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [savingProvider, setSavingProvider] = useState(false);

  useEffect(() => {
    if (!canEdit) return;
    listarProveedoresCompras().then(setProviders).catch(() => toast.error("No se pudieron cargar los proveedores."));
  }, [canEdit]);

  const addProvider = async (event: FormEvent) => {
    event.preventDefault();
    if (!providerName.trim()) return;
    try {
      setSavingProvider(true);
      const saved = await crearProveedorCompras(providerName.trim());
      setProviders((current) => [...current.filter((item) => item.id !== saved.id), saved].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      setProviderName("");
      toast.success("Proveedor guardado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el proveedor.");
    } finally {
      setSavingProvider(false);
    }
  };

  const removeProvider = async (id: number) => {
    if (!window.confirm("¿Quitar este proveedor de la lista? Los reportes guardados conservarán su nombre.")) return;
    try {
      await eliminarProveedorCompras(id);
      setProviders((current) => current.filter((item) => item.id !== id));
      toast.success("Proveedor quitado de la lista.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo quitar el proveedor.");
    }
  };

  const loadReports = useCallback(async () => {
    const data = await listarReportesCompras();
    setReports(data);
    return data;
  }, []);

  const openReport = useCallback(
    async (id: number, quiet = false) => {
      try {
        if (!quiet) setLoadingDetail(true);
        const detail = await obtenerReporteCompras(id);
        let viewedAt = detail.visto_por_dante_at;
        try {
          await marcarReporteComprasLeido(id);
          if (isDante && !viewedAt) viewedAt = new Date().toISOString();
        } catch (readError) {
          console.error("No se pudo registrar la lectura del reporte", readError);
        }

        const visibleDetail = { ...detail, visto_por_dante_at: viewedAt };
        setSelected(visibleDetail);
        setReports((current) =>
          current.map((report) =>
            report.id === id ? { ...report, ...visibleDetail } : report
          )
        );
        window.dispatchEvent(new Event("compras-bienes:updated"));
      } catch (error) {
        if (!quiet) {
          toast.error(
            error instanceof Error ? error.message : "No se pudo abrir el reporte."
          );
        }
      } finally {
        if (!quiet) setLoadingDetail(false);
      }
    },
    [isDante]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadReports();
        if (!cancelled && data[0]) await openReport(data[0].id);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los reportes."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadReports, openReport]);

  useEffect(() => {
    if (!selected?.id) return;
    const interval = window.setInterval(
      () => openReport(selected.id, true),
      30_000
    );
    return () => window.clearInterval(interval);
  }, [openReport, selected?.id]);

  const totalUnits = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0),
    [items]
  );

  const updateItem = (
    index: number,
    field: keyof CompraBienItem,
    value: string | number
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const resetForm = () => {
    setEditingId(undefined);
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setObservations("");
    setItems([emptyItem()]);
    setShowForm(false);
  };

  const editReport = () => {
    if (!selected?.items) return;
    setEditingId(selected.id);
    setYear(selected.anio);
    setMonth(selected.mes);
    setObservations(selected.observaciones);
    setItems(
      selected.items.map((item) => ({
        ...item,
        fecha_listado: item.fecha_listado || item.fecha_compra || "",
      }))
    );
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveReport = async (event: FormEvent) => {
    event.preventDefault();
    if (items.some((item) => !item.fecha_compra.trim())) {
      toast.error("Ingresá una fecha de factura válida en todas las filas.");
      return;
    }
    if (items.some((item) => !item.fecha_listado.trim())) {
      toast.error("Ingresá una fecha de listado válida en todas las filas.");
      return;
    }
    if (items.some((item) => !item.estado_relevamiento.trim())) {
      toast.error("Seleccioná el estado del relevamiento en todas las filas.");
      return;
    }

    try {
      setSaving(true);
      const saved = await guardarReporteCompras(
        {
          anio: year,
          mes: month,
          observaciones: observations,
          items,
        },
        editingId
      );
      toast.success(
        editingId ? "Reporte actualizado." : "Reporte enviado a Dante."
      );
      resetForm();
      await loadReports();
      await openReport(saved.id);
      window.dispatchEvent(new Event("compras-bienes:updated"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar el reporte."
      );
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !message.trim()) return;
    try {
      setSending(true);
      await enviarMensajeCompras(selected.id, message.trim());
      setMessage("");
      await openReport(selected.id, true);
      await loadReports();
      window.dispatchEvent(new Event("compras-bienes:updated"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo enviar el mensaje."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Wrapper>
      <Toaster position="top-center" />
      <div className="mx-auto w-full max-w-[1500px] px-2 py-4 text-slate-950 dark:text-slate-100 sm:px-4">
        <header className="flex flex-col gap-4 border-b border-slate-300 pb-5 dark:border-slate-700 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-cyan-700 dark:text-cyan-300">
              Dirección de Patrimonio
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
              Compras de bienes de uso
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Reportes mensuales enviados a Prosecretaría Administrativa.
            </p>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setProvidersOpen(true); void listarProveedoresCompras().then(setProviders).catch(() => {}); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:border-cyan-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
              <Building2 className="h-4 w-4" /> Proveedores
            </button>
            <button
              type="button"
              onClick={() => {
                if (showForm) resetForm();
                else setShowForm(true);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-black text-white transition hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500"
            >
              <FilePlus2 className="h-4 w-4" />
              {showForm ? "Cancelar carga" : "Nuevo reporte"}
            </button>
            </div>
          )}
        </header>

        {canEdit && showForm && (
          <ReportForm
            editing={Boolean(editingId)}
            year={year}
            month={month}
            observations={observations}
            items={items}
            totalUnits={totalUnits}
            saving={saving}
            setYear={setYear}
            setMonth={setMonth}
            setObservations={setObservations}
            setItems={setItems}
            updateItem={updateItem}
            providers={providers}
            onManageProviders={() => setProvidersOpen(true)}
            onSubmit={saveReport}
          />
        )}

        <div className="mt-5 grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-black text-slate-950 dark:text-white">
                Reportes mensuales
              </h2>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {reports.length}
              </span>
            </div>
            <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
              {loading ? (
                <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  Cargando...
                </p>
              ) : (
                reports.map((report) => (
                  <ReportListItem
                    key={report.id}
                    report={report}
                    active={selected?.id === report.id}
                    onOpen={() => openReport(report.id)}
                  />
                ))
              )}
            </div>
          </aside>

          <ReportDetail
            selected={selected}
            loading={loadingDetail}
            canEdit={canEdit}
            username={username}
            isDante={isDante}
            message={message}
            sending={sending}
            setMessage={setMessage}
            onEdit={editReport}
            onSend={sendMessage}
          />
        </div>
      </div>
      {providersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3" onMouseDown={(event) => { if (event.target === event.currentTarget) setProvidersOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="providers-title" className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
              <div><h2 id="providers-title" className="text-lg font-black">Proveedores</h2><p className="text-sm text-slate-500 dark:text-slate-400">Lista disponible al cargar bienes</p></div>
              <button type="button" onClick={() => setProvidersOpen(false)} title="Cerrar" aria-label="Cerrar proveedores" className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={addProvider} className="flex gap-2 border-b border-slate-200 p-4 dark:border-slate-700">
              <input required maxLength={250} value={providerName} onChange={(event) => setProviderName(event.target.value)} placeholder="Nombre del proveedor" aria-label="Nombre del proveedor" className={fieldClass} />
              <button type="submit" disabled={savingProvider} className="inline-flex h-10 shrink-0 items-center gap-1 rounded-md bg-cyan-700 px-3 text-sm font-bold text-white hover:bg-cyan-800 disabled:opacity-60"><Plus className="h-4 w-4" /> Agregar</button>
            </form>
            <div className="min-h-0 overflow-y-auto p-4">
              {providers.length ? <ul className="divide-y divide-slate-200 dark:divide-slate-700">{providers.map((provider) => <li key={provider.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 break-words text-sm font-semibold">{provider.nombre}</span><button type="button" onClick={() => void removeProvider(provider.id)} title={`Quitar ${provider.nombre}`} aria-label={`Quitar ${provider.nombre}`} className="rounded-md p-2 text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950"><Trash2 className="h-4 w-4" /></button></li>)}</ul> : <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Todavía no hay proveedores.</p>}
            </div>
          </div>
        </div>
      )}
    </Wrapper>
  );
}

type FormProps = {
  editing: boolean;
  year: number;
  month: number;
  observations: string;
  items: CompraBienItem[];
  totalUnits: number;
  saving: boolean;
  providers: CompraProveedor[];
  onManageProviders: () => void;
  setYear: (value: number) => void;
  setMonth: (value: number) => void;
  setObservations: (value: string) => void;
  setItems: React.Dispatch<React.SetStateAction<CompraBienItem[]>>;
  updateItem: (
    index: number,
    field: keyof CompraBienItem,
    value: string | number
  ) => void;
  onSubmit: (event: FormEvent) => void;
};

function ReportForm({
  editing,
  year,
  month,
  observations,
  items,
  totalUnits,
  saving,
  providers,
  onManageProviders,
  setYear,
  setMonth,
  setObservations,
  setItems,
  updateItem,
  onSubmit,
}: FormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mt-5 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex flex-col gap-4 border-b border-slate-300 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/80 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-cyan-700 dark:text-cyan-300">
            Carga mensual
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
            {editing ? "Editar reporte" : "Nuevo reporte"}
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
            Año
            <input
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className={`${fieldClass} mt-1 w-28`}
            />
          </label>
          <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
            Mes
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className={`${fieldClass} mt-1 w-40`}
            >
              {MONTHS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1380px]">
          <div className="grid grid-cols-[1.05fr_90px_1.55fr_180px_180px_1.75fr_48px] bg-slate-800 text-xs font-black uppercase text-white dark:bg-slate-950">
            <span className="p-3">Posible ubicación</span>
            <span className="p-3">Cantidad</span>
            <span className="p-3">Descripción y proveedor</span>
            <span className="p-3">Fecha de factura</span>
            <span className="p-3">Fecha de listado</span>
            <span className="p-3">Estado según relevamiento</span>
            <span />
          </div>

          {items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-[1.05fr_90px_1.55fr_180px_180px_1.75fr_48px] items-start gap-2 border-t border-slate-300 bg-white p-2 even:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:even:bg-slate-800/55"
            >
              <input
                required
                value={item.posible_ubicacion}
                onChange={(event) =>
                  updateItem(index, "posible_ubicacion", event.target.value)
                }
                className={fieldClass}
              />
              <input
                required
                type="number"
                min="1"
                value={item.cantidad}
                onChange={(event) =>
                  updateItem(index, "cantidad", Number(event.target.value))
                }
                className={fieldClass}
              />
              <div className="space-y-2">
              <textarea
                required
                value={item.descripcion_factura}
                onChange={(event) =>
                  updateItem(index, "descripcion_factura", event.target.value)
                }
                className={`${textareaClass} min-h-[106px]`}
              />
              <div className="flex gap-1">
                <select value={item.proveedor || ""} onChange={(event) => updateItem(index, "proveedor", event.target.value)} aria-label={`Proveedor, fila ${index + 1}`} className={fieldClass}>
                  <option value="">Sin proveedor</option>
                  {item.proveedor && !providers.some((provider) => provider.nombre === item.proveedor) && <option value={item.proveedor}>{item.proveedor}</option>}
                  {providers.map((provider) => <option key={provider.id} value={provider.nombre}>{provider.nombre}</option>)}
                </select>
                <button type="button" onClick={onManageProviders} title="Administrar proveedores" aria-label="Administrar proveedores" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 text-cyan-800 hover:bg-cyan-50 dark:border-slate-600 dark:text-cyan-300 dark:hover:bg-slate-800"><Plus className="h-4 w-4" /></button>
              </div>
              </div>
              <PurchaseDateInput
                value={item.fecha_compra}
                onChange={(nextValue) =>
                  updateItem(index, "fecha_compra", nextValue)
                }
                label="Fecha de factura"
              />
              <PurchaseDateInput
                value={item.fecha_listado || ""}
                onChange={(nextValue) =>
                  updateItem(index, "fecha_listado", nextValue)
                }
                label="Fecha de listado"
              />

              <fieldset
                className="grid gap-1.5"
                aria-label={`Estado del relevamiento, fila ${index + 1}`}
              >
                {SURVEY_STATES.map((state) => {
                  const active = item.estado_relevamiento === state;
                  return (
                    <button
                      key={state}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        updateItem(index, "estado_relevamiento", state)
                      }
                      className={`flex min-h-8 items-center gap-2 rounded-md border px-2 py-1 text-left text-[11px] font-black transition ${
                        active
                          ? surveyStateClasses(state)
                          : "border-slate-300 bg-white text-slate-700 hover:border-cyan-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-cyan-400"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          active
                            ? "border-current"
                            : "border-slate-400 dark:border-slate-500"
                        }`}
                      >
                        {active && <Check className="h-3 w-3" />}
                      </span>
                      {state}
                    </button>
                  );
                })}
              </fieldset>

              <button
                type="button"
                onClick={() =>
                  setItems((current) =>
                    current.length === 1
                      ? current
                      : current.filter((_, itemIndex) => itemIndex !== index)
                  )
                }
                disabled={items.length === 1}
                title="Quitar fila"
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-50 disabled:opacity-30 dark:text-rose-300 dark:hover:bg-rose-950/50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-300 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/60 lg:flex-row lg:items-end">
        <button
          type="button"
          onClick={() => setItems((current) => [...current, emptyItem()])}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-cyan-700 bg-cyan-50 px-3 text-sm font-black text-cyan-900 transition hover:bg-cyan-100 dark:border-cyan-500 dark:bg-cyan-950/50 dark:text-cyan-100 dark:hover:bg-cyan-900/60"
        >
          <Plus className="h-4 w-4" /> Agregar fila
        </button>
        <label className="min-w-0 flex-1 text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
          Observaciones
          <textarea
            value={observations}
            onChange={(event) => setObservations(event.target.value)}
            className={`${textareaClass} mt-1`}
            placeholder="Observaciones generales del reporte"
          />
        </label>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-4">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {items.length} filas · {totalUnits} unidades
          </span>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-black text-white transition hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <Save className="h-4 w-4" />
            {saving ? "Guardando..." : "Guardar reporte"}
          </button>
        </div>
      </div>
    </form>
  );
}

function ReportListItem({
  report,
  active,
  onOpen,
}: {
  report: CompraBienReporte;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-md border p-4 text-left transition ${
        active
          ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-200 dark:bg-cyan-950/50 dark:ring-cyan-800"
          : "border-slate-200 bg-white hover:border-cyan-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-cyan-600"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-950 dark:text-white">
            {MONTHS[report.mes - 1]} {report.anio}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {report.total_items} filas · {report.total_unidades} unidades
          </p>
        </div>
        {report.visto_por_dante_at ? (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
            <CheckCheck className="h-3.5 w-3.5" /> Visto
          </span>
        ) : (
          <span className="rounded bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
            Pendiente
          </span>
        )}
      </div>
      {report.mensajes_count > 0 && (
        <p className="mt-3 flex items-center gap-1 text-xs font-bold text-cyan-700 dark:text-cyan-300">
          <MessageSquareText className="h-3.5 w-3.5" />
          {report.mensajes_count} mensajes
        </p>
      )}
    </button>
  );
}

type DetailProps = {
  selected: CompraBienReporte | null;
  loading: boolean;
  canEdit: boolean;
  username: string | null;
  isDante: boolean;
  message: string;
  sending: boolean;
  setMessage: (value: string) => void;
  onEdit: () => void;
  onSend: (event: FormEvent) => void;
};

function ReportDetail({
  selected,
  loading,
  canEdit,
  username,
  isDante,
  message,
  sending,
  setMessage,
  onEdit,
  onSend,
}: DetailProps) {
  if (!selected || loading) {
    return (
      <section className="min-w-0 rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <p className="px-5 py-20 text-center text-sm text-slate-500 dark:text-slate-400">
          {loading ? "Abriendo reporte..." : "Seleccioná un reporte."}
        </p>
      </section>
    );
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <header className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/80 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-cyan-700 dark:text-cyan-300">
            Reporte mensual
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
            {MONTHS[selected.mes - 1]} {selected.anio}
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Creado por {selected.creado_por} · {formatDate(selected.fecha_creacion, true)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-amber-500 bg-amber-50 px-3 text-sm font-black text-amber-900 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-100 dark:hover:bg-amber-500/25"
            >
              <Pencil className="h-4 w-4" /> Editar
            </button>
          )}
          <Link
            href={`/ComprasBienes/imprimir/${selected.id}?download=1`}
            target="_blank"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-600 bg-emerald-50 px-3 text-sm font-black text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-100 dark:hover:bg-emerald-500/25"
          >
            <Download className="h-4 w-4" /> PDF
          </Link>
          <Link
            href={`/ComprasBienes/imprimir/${selected.id}`}
            target="_blank"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-cyan-700 px-3 text-sm font-black text-white hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </Link>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead className="bg-slate-800 text-left text-xs uppercase text-white dark:bg-slate-950">
            <tr>
              <th className="border-r border-slate-600 p-3">Posible ubicación</th>
              <th className="border-r border-slate-600 p-3 text-center">Cantidad</th>
              <th className="border-r border-slate-600 p-3">Descripción según factura</th>
              <th className="border-r border-slate-600 p-3">Fecha de factura</th>
              <th className="border-r border-slate-600 p-3">Fecha de listado</th>
              <th className="p-3">Estado según relevamiento</th>
            </tr>
          </thead>
          <tbody>
            {selected.items?.map((item, index) => (
              <tr
                key={item.id ?? index}
                className="border-b border-slate-300 align-top odd:bg-white even:bg-slate-50 dark:border-slate-700 dark:odd:bg-slate-900 dark:even:bg-slate-800/55"
              >
                <td className="border-r border-slate-200 p-3 font-bold dark:border-slate-700">
                  {item.posible_ubicacion}
                </td>
                <td className="border-r border-slate-200 p-3 text-center font-black dark:border-slate-700">
                  {item.cantidad}
                </td>
                <td className="whitespace-pre-wrap border-r border-slate-200 p-3 dark:border-slate-700">
                  {item.descripcion_factura}
                  {item.proveedor && <span className="mt-2 block text-xs font-bold text-cyan-800 dark:text-cyan-300">Proveedor: {item.proveedor}</span>}
                </td>
                <td className="border-r border-slate-200 p-3 dark:border-slate-700">
                  {formatDate(`${item.fecha_compra}T12:00:00`)}
                </td>
                <td className="border-r border-slate-200 p-3 dark:border-slate-700">
                  {item.fecha_listado
                    ? formatDate(`${item.fecha_listado}T12:00:00`)
                    : "-"}
                </td>
                <td className="p-3">
                  <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-black ${surveyStateClasses(item.estado_relevamiento)}`}>
                    {item.estado_relevamiento}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid border-b border-slate-200 dark:border-slate-700 lg:grid-cols-[1fr_310px]">
        <div className="p-5">
          <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
            Observaciones
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
            {selected.observaciones || "Sin observaciones."}
          </p>
        </div>
        <div className="border-t border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60 lg:border-l lg:border-t-0">
          <p className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
            <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
            {selected.visto_por_dante_at
              ? "Visto por Dante"
              : "Pendiente de lectura"}
          </p>
          {selected.visto_por_dante_at && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formatDate(selected.visto_por_dante_at, true)}
            </p>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="mb-4">
          <h3 className="font-black text-slate-950 dark:text-white">
            Conversación interna
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Patrimonio y Prosecretaría Administrativa
          </p>
        </div>
        <div className="max-h-80 space-y-3 overflow-y-auto rounded-md border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-950">
          {selected.mensajes?.length ? (
            selected.mensajes.map((entry) => {
              const mine =
                entry.autor.toLowerCase() === (username ?? "").toLowerCase();
              return (
                <div
                  key={entry.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-md px-3 py-2 ${
                      mine
                        ? "bg-cyan-700 text-white dark:bg-cyan-600"
                        : "border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    }`}
                  >
                    <p className="text-xs font-black">{entry.autor}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {entry.contenido}
                    </p>
                    <p
                      className={`mt-1 text-[10px] ${
                        mine
                          ? "text-cyan-100"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {formatDate(entry.fecha_creacion, true)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Todavía no hay mensajes.
            </p>
          )}
        </div>
        <form onSubmit={onSend} className="mt-3 flex gap-2">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={3000}
            placeholder={
              isDante
                ? "Escribí una consulta para Patrimonio"
                : "Responder a Dante"
            }
            className={`${textareaClass} min-h-11 flex-1`}
          />
          <button
            type="submit"
            disabled={sending || !message.trim()}
            title="Enviar mensaje"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-cyan-700 text-white transition hover:bg-cyan-800 disabled:opacity-40 dark:bg-cyan-600 dark:hover:bg-cyan-500"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </section>
  );
}
