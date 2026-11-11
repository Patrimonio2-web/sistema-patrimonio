"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  Plus,
  Save,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";
import {
  crearReparacion,
  finalizarReparacion,
  listarReparaciones,
  quitarMarcaReparacion,
  type ReparacionMobiliario,
  type ReparacionPayload,
} from "@/services/reparacionesService";

type Props = {
  isOpen: boolean;
  mobiliarioId: string;
  descripcion?: string;
  paraReparacion?: boolean;
  readOnly?: boolean;
  onClose: () => void;
  onChanged?: (paraReparacion: boolean) => void;
};

const emptyForm: ReparacionPayload = {
  reparado_por: "",
  trabajo_realizado: "",
  fecha_salida: "",
  fecha_retorno: "",
  observaciones: "",
};

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDate(value?: string | null) {
  if (!value) return "Pendiente";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export default function ReparacionModal({
  isOpen,
  mobiliarioId,
  descripcion,
  paraReparacion = false,
  readOnly = false,
  onClose,
  onChanged,
}: Props) {
  const [history, setHistory] = useState<ReparacionMobiliario[]>([]);
  const [marked, setMarked] = useState(paraReparacion);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [finishingId, setFinishingId] = useState<number | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [form, setForm] = useState<ReparacionPayload>(emptyForm);

  const activeRepair = useMemo(
    () => history.find((item) => item.estado === "en_reparacion") ?? null,
    [history]
  );

  const load = async () => {
    try {
      setLoading(true);
      const data = await listarReparaciones(mobiliarioId);
      setHistory(data.reparaciones);
      setMarked(data.para_reparacion);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el historial");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setMarked(paraReparacion);
    setFormOpen(false);
    setFinishingId(null);
    setForm(emptyForm);
    load();
    // El identificador cambia cada vez que se abre para otro bien.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mobiliarioId]);

  if (!isOpen) return null;

  const openNewForm = () => {
    setFinishingId(null);
    setForm({ ...emptyForm, fecha_salida: today() });
    setFormOpen(true);
  };

  const openFinishForm = (item: ReparacionMobiliario) => {
    setFinishingId(item.id);
    setForm({
      reparado_por: item.reparado_por,
      trabajo_realizado: item.trabajo_realizado,
      fecha_salida: item.fecha_salida?.slice(0, 10) || today(),
      fecha_retorno: today(),
      observaciones: item.observaciones || "",
    });
    setFormOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    if (finishingId && !form.fecha_retorno) {
      toast.error("Indica la fecha en que el bien regresó.");
      return;
    }
    try {
      setSaving(true);
      const result = finishingId
        ? await finalizarReparacion(mobiliarioId, finishingId, form)
        : await crearReparacion(mobiliarioId, form);
      setMarked(result.para_reparacion);
      onChanged?.(result.para_reparacion);
      setFormOpen(false);
      setFinishingId(null);
      setForm(emptyForm);
      await load();
      toast.success(finishingId ? "Reparación finalizada." : "Reparación registrada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la reparación");
    } finally {
      setSaving(false);
    }
  };

  const handleClearMark = async () => {
    try {
      setSaving(true);
      const result = await quitarMarcaReparacion(mobiliarioId);
      setMarked(result.para_reparacion);
      onChanged?.(result.para_reparacion);
      setClearConfirmOpen(false);
      toast.success("Marca de reparación quitada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo quitar la marca");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    "mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-amber-900";

  return (
    <>
      <div
        className="fixed inset-0 z-[45] flex items-center justify-center bg-slate-950/70 px-3 py-4 backdrop-blur-sm sm:px-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="repair-modal-title"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) onClose();
        }}
      >
        <section className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <Wrench className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-amber-700 dark:text-amber-300">
                  Bien #{mobiliarioId}
                </p>
                <h2 id="repair-modal-title" className="mt-0.5 text-xl font-black text-slate-950 dark:text-white">
                  Historial de reparaciones
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                  {descripcion || "Mobiliario"}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar" title="Cerrar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <div className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${marked ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30" : "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"}`}>
              <div className="flex items-center gap-3">
                {marked ? <Clock3 className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" /> : <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />}
                <div><p className="text-sm font-black text-slate-950 dark:text-white">{marked ? "Marcado para reparación" : "Sin reparación pendiente"}</p><p className="text-xs text-slate-600 dark:text-slate-300">{activeRepair ? `Salida: ${formatDate(activeRepair.fecha_salida)}` : marked ? "La marca existe pero aún no tiene un registro abierto." : "Los trabajos finalizados permanecen en el historial."}</p></div>
              </div>
              {!readOnly && !formOpen && (
                <div className="flex flex-wrap gap-2">
                  {activeRepair ? (
                    <button type="button" onClick={() => openFinishForm(activeRepair)} className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-black text-white hover:bg-emerald-800"><CheckCircle2 className="h-4 w-4" /> Finalizar reparación</button>
                  ) : (
                    <button type="button" onClick={openNewForm} className="inline-flex h-10 items-center gap-2 rounded-md bg-amber-600 px-3 text-sm font-black text-white hover:bg-amber-700"><Plus className="h-4 w-4" /> Registrar reparación</button>
                  )}
                  {marked && !activeRepair && <button type="button" onClick={() => setClearConfirmOpen(true)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:border-red-300 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Quitar marca</button>}
                </div>
              )}
            </div>

            {formOpen && !readOnly && (
              <form onSubmit={handleSubmit} className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-amber-700 dark:text-amber-300">{finishingId ? "Completar registro" : "Nuevo registro"}</p><h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{finishingId ? "Finalizar reparación" : "Datos de la reparación"}</h3></div><button type="button" onClick={() => setFormOpen(false)} disabled={saving} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-white dark:hover:bg-slate-800" aria-label="Cerrar formulario"><X className="h-4 w-4" /></button></div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">Quién lo reparó<input required maxLength={160} value={form.reparado_por} onChange={(event) => setForm((current) => ({ ...current, reparado_por: event.target.value }))} placeholder="Persona, proveedor o servicio técnico" className={fieldClass} /></label>
                  <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">Fecha de salida<input required type="date" value={form.fecha_salida} onChange={(event) => setForm((current) => ({ ...current, fecha_salida: event.target.value }))} className={fieldClass} /></label>
                  <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200 sm:col-span-2">Qué se le hizo<textarea required maxLength={2000} rows={3} value={form.trabajo_realizado} onChange={(event) => setForm((current) => ({ ...current, trabajo_realizado: event.target.value }))} placeholder="Trabajo solicitado o realizado" className={`${fieldClass} h-auto min-h-24 py-2.5 normal-case`} /></label>
                  <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">Fecha de regreso {finishingId ? "" : "(opcional)"}<input required={Boolean(finishingId)} type="date" min={form.fecha_salida || undefined} value={form.fecha_retorno || ""} onChange={(event) => setForm((current) => ({ ...current, fecha_retorno: event.target.value }))} className={fieldClass} /></label>
                  <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">Observaciones<textarea maxLength={2000} rows={3} value={form.observaciones || ""} onChange={(event) => setForm((current) => ({ ...current, observaciones: event.target.value }))} placeholder="Repuestos, garantía u otros datos" className={`${fieldClass} h-auto min-h-24 py-2.5 normal-case`} /></label>
                </div>
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setFormOpen(false)} disabled={saving} className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Cancelar</button><button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? "Guardando..." : finishingId ? "Guardar y finalizar" : "Guardar reparación"}</button></div>
              </form>
            )}

            <div className="mt-5 flex items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800"><div className="flex items-center gap-2"><History className="h-4 w-4 text-slate-500" /><h3 className="text-sm font-black text-slate-950 dark:text-white">Movimientos de reparación</h3></div><span className="text-xs font-bold text-slate-500">{history.length} registros</span></div>

            <div className="mt-3 space-y-3">
              {loading ? <p className="py-10 text-center text-sm font-semibold text-slate-500">Cargando historial...</p> : history.length ? history.map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-black uppercase ${item.estado === "en_reparacion" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"}`}>{item.estado === "en_reparacion" ? "En reparación" : "Finalizada"}</span><p className="mt-2 flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white"><UserRound className="h-4 w-4 text-slate-400" /> {item.reparado_por}</p></div><div className="text-right text-xs font-semibold text-slate-500"><p className="flex items-center justify-end gap-1"><CalendarDays className="h-3.5 w-3.5" /> Salida: {formatDate(item.fecha_salida)}</p><p className="mt-1">Regreso: {formatDate(item.fecha_retorno)}</p></div></div>
                  <div className="mt-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-800"><p className="font-bold text-slate-900 dark:text-slate-100">{item.trabajo_realizado}</p>{item.observaciones && <p className="mt-2 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{item.observaciones}</p>}<p className="mt-3 text-[11px] font-semibold text-slate-500">Registrado por {item.creado_por || "usuario no informado"}{item.finalizado_por ? ` - Finalizado por ${item.finalizado_por}` : ""}</p></div>
                </article>
              )) : <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700"><Wrench className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" /><p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">Todavía no hay reparaciones registradas</p><p className="mt-1 text-xs text-slate-500">La marca anterior del formulario se conserva y puede quitarse desde aquí.</p></div>}
            </div>
          </div>
        </section>
      </div>

      <ConfirmModal
        isOpen={clearConfirmOpen}
        title="Quitar marca de reparación"
        message="El bien dejará de figurar como pendiente de reparación. El historial guardado no se elimina."
        confirmText="Sí, quitar marca"
        cancelText="Cancelar"
        loadingText="Quitando..."
        loading={saving}
        onConfirm={handleClearMark}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </>
  );
}
