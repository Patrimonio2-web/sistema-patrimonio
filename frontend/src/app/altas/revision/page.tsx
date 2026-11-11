"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { BarChart3, CheckCircle2, ClipboardCheck, Edit3, FileText, Maximize2, Printer, RefreshCw, Save, Search, X, XCircle } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { Wrapper } from "@/components";
import { isSuperAdmin } from "@/services/authRole";
import { editarAlta, type AltaPayload } from "@/services/altasService";
import {
  actualizarRevisionAlta,
  guardarRevisionMovimientoAlta,
  obtenerRevisionAlta,
  obtenerRevisionesAltas,
  type AltaMovimientoConRevision,
  type AltaPlanillaRevision,
  type AltaRevisionDetalle,
  type AltaRevisionEstado,
} from "@/services/altasRevisionService";
import {
  obtenerClasesPorRubro,
  obtenerRubros,
  type Clase,
  type Rubro,
} from "@/services/nomencladorService";

function money(value?: number | null) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dateLabel(value?: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("es-AR").format(new Date(year, month - 1, day));
}

function numberFromInput(value: string) {
  const normalized = value.trim().replace(/\s+/g, "");
  if (!normalized) return 0;

  if (normalized.includes(",") && normalized.includes(".")) {
    const commaIndex = normalized.lastIndexOf(",");
    const dotIndex = normalized.lastIndexOf(".");
    const decimalSeparator = commaIndex > dotIndex ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    const parsed = Number(
      normalized.replace(new RegExp(`\\${thousandsSeparator}`, "g"), "").replace(decimalSeparator, ".")
    );
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (normalized.includes(",")) {
    const parsed = Number(normalized.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function planillaKey(planilla: Pick<AltaPlanillaRevision, "mes_planilla" | "anio_planilla">) {
  return `${planilla.mes_planilla}::${planilla.anio_planilla}`;
}

function printHref(planilla: Pick<AltaPlanillaRevision, "mes_planilla" | "anio_planilla">, previewOnly = false) {
  const qs = new URLSearchParams();
  qs.set("mes", planilla.mes_planilla);
  qs.set("anio", planilla.anio_planilla);
  if (previewOnly) qs.set("preview", "1");
  return `/altas/imprimir?${qs.toString()}`;
}

function estadoLabel(estado: AltaRevisionEstado) {
  if (estado === "aprobada") return "Aprobada";
  if (estado === "en_revision") return "En revision";
  return "Pendiente";
}

function estadoClass(estado: AltaRevisionEstado) {
  if (estado === "aprobada") return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100";
  if (estado === "en_revision") return "border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-100";
  return "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100";
}

function altaTotal(item: AltaMovimientoConRevision) {
  const total = Number(item.cantidad || 0) * Number(item.valor_unitario || 0);
  return Number.isFinite(total) && total > 0 ? total : Number(item.valor_total || 0);
}

export default function RevisionAltasPage() {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [planillas, setPlanillas] = useState<AltaPlanillaRevision[]>([]);
  const [selected, setSelected] = useState<AltaPlanillaRevision | null>(null);
  const [detalle, setDetalle] = useState<AltaRevisionDetalle | null>(null);
  const [comentario, setComentario] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingPlanilla, setSavingPlanilla] = useState(false);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [clasesPorRubro, setClasesPorRubro] = useState<Record<number, Clase[]>>({});
  const [largeViewOpen, setLargeViewOpen] = useState(false);

  useEffect(() => {
    setAllowed(isSuperAdmin());
    setReady(true);
  }, []);

  const loadPlanillas = useCallback(async () => {
    try {
      setLoadingList(true);
      setListError("");
      const data = await obtenerRevisionesAltas();
      setPlanillas(data);
      setSelected((current) => {
        if (current && data.some((item) => planillaKey(item) === planillaKey(current))) return current;
        return data.find((item) => item.estado !== "aprobada") || data[0] || null;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar las revisiones.";
      setListError(message);
      setPlanillas([]);
      toast.error(message);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadDetalle = useCallback(async (planilla: AltaPlanillaRevision | null) => {
    if (!planilla) {
      setDetalle(null);
      return;
    }

    try {
      setLoadingDetail(true);
      setDetailError("");
      const data = await obtenerRevisionAlta(planilla.mes_planilla, planilla.anio_planilla);
      setDetalle(data);
      setComentario(data.planilla.comentario || "");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cargar la planilla.";
      setDetalle(null);
      setDetailError(message);
      toast.error(message);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) loadPlanillas();
  }, [allowed, loadPlanillas]);

  useEffect(() => {
    if (!allowed) return;

    obtenerRubros()
      .then(setRubros)
      .catch(() => toast.error("No se pudieron cargar los rubros del nomenclador."));
  }, [allowed]);

  useEffect(() => {
    if (allowed) loadDetalle(selected);
  }, [allowed, loadDetalle, selected]);

  const ensureClases = useCallback(async (idRubro: number) => {
    if (!idRubro) return;
    if (Object.prototype.hasOwnProperty.call(clasesPorRubro, idRubro)) return;

    try {
      const data = await obtenerClasesPorRubro(idRubro);
      setClasesPorRubro((prev) => ({ ...prev, [idRubro]: data }));
    } catch {
      setClasesPorRubro((prev) => ({ ...prev, [idRubro]: [] }));
      toast.error("No se pudieron cargar las clases del rubro.");
    }
  }, [clasesPorRubro]);

  const stats = useMemo(() => {
    return {
      total: planillas.length,
      pendientes: planillas.filter((item) => item.estado !== "aprobada").length,
      aprobadas: planillas.filter((item) => item.estado === "aprobada").length,
    };
  }, [planillas]);

  const refreshCurrent = async () => {
    await loadPlanillas();
    await loadDetalle(selected);
  };

  const saveEstado = async (estado: AltaRevisionEstado) => {
    if (!detalle) return;
    const wasApproved = detalle.planilla.estado === "aprobada";

    try {
      setSavingPlanilla(true);
      await actualizarRevisionAlta(detalle.planilla.mes_planilla, detalle.planilla.anio_planilla, {
        estado,
        comentario,
      });
      toast.success(estado === "aprobada" ? "Planilla aprobada." : wasApproved ? "Planilla desaprobada." : "Revision guardada.");
      await refreshCurrent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la revision.");
    } finally {
      setSavingPlanilla(false);
    }
  };

  if (!ready) {
    return (
      <Wrapper>
        <main className="min-h-screen px-4 py-8 text-slate-950 dark:text-white">Cargando...</main>
      </Wrapper>
    );
  }

  if (!allowed) {
    return (
      <Wrapper>
        <main className="min-h-screen px-4 py-8 text-slate-950 dark:text-white">
          <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm font-bold uppercase text-cyan-700 dark:text-cyan-300">Planillas - Altas</p>
            <h1 className="mt-2 text-2xl font-black">Revision de altas</h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Esta pantalla es exclusiva para super admin.
            </p>
          </section>
        </main>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <Toaster />
      <main className="min-h-screen px-3 py-5 text-slate-950 dark:text-white sm:px-4 sm:py-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">Planillas - Altas</p>
                <h1 className="mt-2 text-2xl font-black">Revision y aprobacion</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                  Controla los movimientos cargados, marca renglones revisados y habilita la impresion final.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Planillas" value={stats.total} />
                <Stat label="Pendientes" value={stats.pendientes} />
                <Stat label="Aprobadas" value={stats.aprobadas} />
              </div>
            </div>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950/80">
            <div>
              <h2 className="text-base font-black">Resumen anual por rubro</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">Importes por mes y detalle de cada total.</p>
            </div>
            <Link href="/altas/resumen" className="inline-flex h-10 items-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white hover:bg-cyan-800">
              <BarChart3 className="h-4 w-4" /> Ver resumen anual
            </Link>
          </section>

          <section className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
            <aside className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-black">Bandeja</h2>
                <button
                  type="button"
                  onClick={loadPlanillas}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </button>
              </div>

              {loadingList ? (
                <p className="rounded-md border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">
                  Cargando planillas...
                </p>
              ) : listError ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                  <p>No se pudo cargar la bandeja de revision.</p>
                  <p className="mt-1 text-xs font-bold">
                    Si aparece 404, primero sube y deploya el backend con la API nueva.
                  </p>
                </div>
              ) : planillas.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">
                  No hay planillas de altas cargadas.
                </p>
              ) : (
                <div className="space-y-2">
                  {planillas.map((planilla) => {
                    const active = selected && planillaKey(selected) === planillaKey(planilla);
                    return (
                      <button
                        key={planillaKey(planilla)}
                        type="button"
                        onClick={() => setSelected(planilla)}
                        className={`w-full rounded-md border p-3 text-left transition ${
                          active
                            ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30"
                            : "border-slate-200 bg-white hover:border-cyan-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-cyan-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black">{planilla.mes_planilla} {planilla.anio_planilla}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {planilla.movimientos_revisados}/{planilla.total_movimientos} revisados
                            </p>
                            <p className="mt-1 text-xs font-black text-slate-700 dark:text-slate-200">
                              Total: {money(planilla.total_valor)}
                            </p>
                          </div>
                          <span className={`rounded-md border px-2 py-1 text-[11px] font-black ${estadoClass(planilla.estado)}`}>
                            {estadoLabel(planilla.estado)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>

            <section className="min-w-0 rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-5 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
              {!selected ? (
                <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
                  Selecciona una planilla para revisar.
                </p>
              ) : loadingDetail || !detalle ? (
                detailError ? (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-6 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                    <p>No se pudo cargar el detalle de la planilla.</p>
                    <p className="mt-1 text-xs font-bold">{detailError}</p>
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
                    Cargando detalle...
                  </p>
                )
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">Planilla seleccionada</p>
                      <h2 className="mt-1 text-xl font-black">
                        {detalle.planilla.mes_planilla} {detalle.planilla.anio_planilla}
                      </h2>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                        <span className={`rounded-md border px-2.5 py-1 ${estadoClass(detalle.planilla.estado)}`}>
                          {estadoLabel(detalle.planilla.estado)}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 dark:bg-slate-900">
                          {detalle.planilla.movimientos_revisados}/{detalle.planilla.total_movimientos} revisados
                        </span>
                      </div>
                      <div className="mt-3 inline-flex min-w-[180px] flex-col rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                        <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">Totales</span>
                        <span className="text-base font-black">{money(detalle.planilla.total_valor)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setLargeViewOpen(true)}
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
                      >
                        <Maximize2 className="h-4 w-4" />
                        Vista grande
                      </button>
                      <Link
                        href={printHref(detalle.planilla, true)}
                        target="_blank"
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-cyan-300 px-4 text-sm font-black text-cyan-800 hover:bg-cyan-50 dark:border-cyan-700 dark:text-cyan-100 dark:hover:bg-cyan-950/30"
                      >
                        <Search className="h-4 w-4" />
                        Vista previa
                      </Link>
                      <button
                        type="button"
                        onClick={() => saveEstado("en_revision")}
                        disabled={savingPlanilla}
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-cyan-300 px-4 text-sm font-black text-cyan-800 hover:bg-cyan-50 disabled:opacity-60 dark:border-cyan-700 dark:text-cyan-100 dark:hover:bg-cyan-950/30"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        Guardar revision
                      </button>
                      {detalle.planilla.estado === "aprobada" ? (
                        <button
                          type="button"
                          onClick={() => saveEstado("en_revision")}
                          disabled={savingPlanilla}
                          className="inline-flex h-10 items-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" />
                          Desaprobar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => saveEstado("aprobada")}
                          disabled={savingPlanilla}
                          className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Aprobar pase
                        </button>
                      )}
                      <Link
                        href={printHref(detalle.planilla)}
                        target="_blank"
                        className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-black text-white ${
                          detalle.planilla.estado === "aprobada"
                            ? "bg-cyan-700 hover:bg-cyan-800"
                            : "pointer-events-none bg-slate-400"
                        }`}
                      >
                        <Printer className="h-4 w-4" />
                        Imprimir
                      </Link>
                      <Link
                        href={printHref(detalle.planilla)}
                        target="_blank"
                        className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-black text-white ${
                          detalle.planilla.estado === "aprobada"
                            ? "bg-rose-600 hover:bg-rose-700"
                            : "pointer-events-none bg-slate-400"
                        }`}
                      >
                        <FileText className="h-4 w-4" />
                        PDF
                      </Link>
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                      Comentario general
                    </span>
                    <textarea
                      value={comentario}
                      onChange={(event) => setComentario(event.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-cyan-900"
                      placeholder="Motivo, observaciones o control general de la planilla"
                    />
                  </label>

                  <div className="space-y-3">
                    {detalle.movimientos.map((item) => (
                      <RevisionAltaRow
                        key={item.id}
                        item={item}
                        rubros={rubros}
                        clasesPorRubro={clasesPorRubro}
                        ensureClases={ensureClases}
                        onSaved={refreshCurrent}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </section>
        </div>
      </main>

      {largeViewOpen && detalle && (
        <div className="fixed inset-0 z-[90] bg-slate-950/65 p-2 backdrop-blur-sm sm:p-4">
          <section className="mx-auto flex h-full max-w-[96rem] flex-col overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-white">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">Vista grande de revision</p>
                <h2 className="mt-1 text-2xl font-black">
                  {detalle.planilla.mes_planilla} {detalle.planilla.anio_planilla}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                  <span className={`rounded-md border px-2.5 py-1 ${estadoClass(detalle.planilla.estado)}`}>
                    {estadoLabel(detalle.planilla.estado)}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 dark:bg-slate-900">
                    {detalle.planilla.movimientos_revisados}/{detalle.planilla.total_movimientos} revisados
                  </span>
                </div>
                <div className="mt-3 inline-flex min-w-[180px] flex-col rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">Totales</span>
                  <span className="text-base font-black">{money(detalle.planilla.total_valor)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={printHref(detalle.planilla, true)}
                  target="_blank"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-cyan-300 px-4 text-sm font-black text-cyan-800 hover:bg-cyan-50 dark:border-cyan-700 dark:text-cyan-100 dark:hover:bg-cyan-950/30"
                >
                  <Search className="h-4 w-4" />
                  Vista previa
                </Link>
                <button
                  type="button"
                  onClick={() => saveEstado("en_revision")}
                  disabled={savingPlanilla}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-cyan-300 px-4 text-sm font-black text-cyan-800 hover:bg-cyan-50 disabled:opacity-60 dark:border-cyan-700 dark:text-cyan-100 dark:hover:bg-cyan-950/30"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Guardar revision
                </button>
                {detalle.planilla.estado === "aprobada" ? (
                  <button
                    type="button"
                    onClick={() => saveEstado("en_revision")}
                    disabled={savingPlanilla}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" />
                    Desaprobar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => saveEstado("aprobada")}
                    disabled={savingPlanilla}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Aprobar pase
                  </button>
                )}
                <Link
                  href={printHref(detalle.planilla)}
                  target="_blank"
                  className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-black text-white ${
                    detalle.planilla.estado === "aprobada"
                      ? "bg-cyan-700 hover:bg-cyan-800"
                      : "pointer-events-none bg-slate-400"
                  }`}
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Link>
                <button
                  type="button"
                  onClick={() => setLargeViewOpen(false)}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  <X className="h-4 w-4" />
                  Cerrar
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <label className="mb-4 block">
                <span className="mb-1.5 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                  Comentario general
                </span>
                <textarea
                  value={comentario}
                  onChange={(event) => setComentario(event.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-cyan-900"
                  placeholder="Motivo, observaciones o control general de la planilla"
                />
              </label>

              <div className="space-y-3">
                {detalle.movimientos.map((item) => (
                  <RevisionAltaRow
                    key={`large-${item.id}`}
                    item={item}
                    rubros={rubros}
                    clasesPorRubro={clasesPorRubro}
                    ensureClases={ensureClases}
                    onSaved={refreshCurrent}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </Wrapper>
  );
}

function RevisionAltaRow({
  item,
  rubros,
  clasesPorRubro,
  ensureClases,
  onSaved,
}: {
  item: AltaMovimientoConRevision;
  rubros: Rubro[];
  clasesPorRubro: Record<number, Clase[]>;
  ensureClases: (idRubro: number) => Promise<void>;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(() => draftFromItem(item));
  const [revisionComment, setRevisionComment] = useState(item.revision.comentario || "");
  const [saving, setSaving] = useState(false);
  const [savingRevision, setSavingRevision] = useState(false);
  const [showNomenclador, setShowNomenclador] = useState(false);
  const [nomencladorRubro, setNomencladorRubro] = useState(draft.id_rubro);
  const [nomencladorClase, setNomencladorClase] = useState(draft.id_clase);
  const rubroId = Number(draft.id_rubro || 0);
  const nomencladorRubroId = Number(nomencladorRubro || 0);
  const clases = nomencladorRubroId ? clasesPorRubro[nomencladorRubroId] || [] : [];

  useEffect(() => {
    setDraft(draftFromItem(item));
    setRevisionComment(item.revision.comentario || "");
    setNomencladorRubro(item.id_rubro ? String(item.id_rubro) : "");
    setNomencladorClase(item.id_clase ? String(item.id_clase) : "");
  }, [item]);

  useEffect(() => {
    if (rubroId) void ensureClases(rubroId);
  }, [ensureClases, rubroId]);

  useEffect(() => {
    if (nomencladorRubroId) void ensureClases(nomencladorRubroId);
  }, [ensureClases, nomencladorRubroId]);

  const saveAlta = async () => {
    try {
      setSaving(true);
      const cantidad = numberFromInput(draft.cantidad);
      const unitario = numberFromInput(draft.valor_unitario);
      const payload: AltaPayload = {
        fecha_alta: draft.fecha_alta,
        cantidad,
        concepto: draft.concepto.trim(),
        disposicion: draft.disposicion.trim() || null,
        fecha_resolucion: draft.fecha_resolucion || null,
        valor_unitario: unitario,
        valor_total: cantidad * unitario,
        causa_alta: draft.causa_alta.trim() || null,
        codigo_presup: draft.codigo_presup.trim() || null,
        identidad: draft.identidad.trim() || null,
        mes_planilla: draft.mes_planilla,
        anio_planilla: draft.anio_planilla,
        id_rubro: draft.id_rubro ? Number(draft.id_rubro) : null,
        id_clase: draft.id_clase ? Number(draft.id_clase) : 0,
      };
      await editarAlta(item.id, payload);
      toast.success(`Alta ${item.id} actualizada.`);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo editar la alta.");
    } finally {
      setSaving(false);
    }
  };

  const saveRevision = async (revisado: boolean) => {
    try {
      setSavingRevision(true);
      await guardarRevisionMovimientoAlta(item.id, {
        revisado,
        comentario: revisionComment.trim() || null,
      });
      toast.success(revisado ? "Movimiento marcado como revisado." : "Revision quitada.");
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la revision.");
    } finally {
      setSavingRevision(false);
    }
  };

  return (
    <article className={`rounded-md border p-3 shadow-sm ${
      item.revision.revisado
        ? "border-emerald-300 bg-emerald-50/80 ring-1 ring-emerald-200 dark:border-emerald-800 dark:bg-emerald-950/25 dark:ring-emerald-900"
        : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
    }`}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-cyan-100 px-2 py-1 text-xs font-black text-cyan-800 dark:bg-cyan-950 dark:text-cyan-100">
              ID {item.id}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold dark:bg-slate-900">
              {dateLabel(item.fecha_alta)}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold dark:bg-slate-900">
              Total {money(altaTotal(item))}
            </span>
            {item.revision.revisado && (
              <span className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-black text-white">
                Revisado
              </span>
            )}
          </div>
          <p className="mt-2 break-words text-sm font-black">{item.concepto || "-"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={saveAlta}
            disabled={saving}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-amber-500 px-3 text-xs font-black text-white hover:bg-amber-600 disabled:opacity-60"
          >
            <Edit3 className="h-4 w-4" />
            {saving ? "Guardando" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => setShowNomenclador((prev) => !prev)}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-cyan-300 bg-cyan-50 px-3 text-xs font-black text-cyan-800 hover:bg-white dark:border-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-100"
          >
            <Search className="h-4 w-4" />
            Nomenclador
          </button>
          <button
            type="button"
            onClick={() => saveRevision(!item.revision.revisado)}
            disabled={savingRevision}
            className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-black text-white disabled:opacity-60 ${
              item.revision.revisado ? "bg-slate-600 hover:bg-slate-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {item.revision.revisado ? "Quitar revisado" : "Marcar revisado"}
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-12">
        <Field className="xl:col-span-2" label="Fecha">
          <Input type="date" value={draft.fecha_alta} onChange={(value) => setDraft((prev) => ({ ...prev, fecha_alta: value }))} />
        </Field>
        <Field className="xl:col-span-2" label="Cantidad">
          <Input value={draft.cantidad} onChange={(value) => setDraft((prev) => ({ ...prev, cantidad: value }))} />
        </Field>
        <Field className="md:col-span-2 xl:col-span-8" label="Concepto">
          <Input value={draft.concepto} onChange={(value) => setDraft((prev) => ({ ...prev, concepto: value }))} />
        </Field>
        <Field className="xl:col-span-4" label="Disposicion">
          <Input value={draft.disposicion} onChange={(value) => setDraft((prev) => ({ ...prev, disposicion: value }))} />
        </Field>
        <Field className="xl:col-span-2" label="Unitario">
          <Input value={draft.valor_unitario} onChange={(value) => setDraft((prev) => ({ ...prev, valor_unitario: value }))} />
        </Field>
        <Field className="xl:col-span-2" label="Causa">
          <Input value={draft.causa_alta} onChange={(value) => setDraft((prev) => ({ ...prev, causa_alta: value.toUpperCase() }))} />
        </Field>
        <Field className="xl:col-span-2" label="Cod. presup.">
          <Input value={draft.codigo_presup} onChange={(value) => setDraft((prev) => ({ ...prev, codigo_presup: value, id_rubro: value || prev.id_rubro }))} />
        </Field>
        <Field className="xl:col-span-2" label="Clase">
          <Input value={draft.id_clase} onChange={(value) => setDraft((prev) => ({ ...prev, id_clase: value }))} />
        </Field>
        {showNomenclador && (
          <div className="md:col-span-2 xl:col-span-12 rounded-md border border-cyan-200 bg-cyan-50/70 p-3 dark:border-cyan-900 dark:bg-cyan-950/20">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-cyan-800 dark:text-cyan-100">Nomenclador de control</p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Sirve para comparar rubro y clase. Solo cambia el renglon si aplicas y luego guardas.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    id_rubro: nomencladorRubro,
                    codigo_presup: nomencladorRubro || prev.codigo_presup,
                    id_clase: nomencladorClase,
                  }))
                }
                className="inline-flex h-9 items-center justify-center rounded-md bg-cyan-700 px-3 text-xs font-black text-white hover:bg-cyan-800"
              >
                Aplicar al renglon
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Rubro">
                <Select
                  value={nomencladorRubro}
                  onChange={(value) => {
                    setNomencladorRubro(value);
                    setNomencladorClase("");
                  }}
                >
                  <option value="">Sin rubro</option>
                  {rubros.map((rubro) => (
                    <option key={rubro.id_rubro} value={rubro.id_rubro}>
                      {rubro.id_rubro} - {rubro.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Clase">
                <Select value={nomencladorClase} onChange={setNomencladorClase}>
                  <option value="">0000 - Sin clase</option>
                  {clases.map((clase) => (
                    <option key={clase.id_clase} value={clase.id_clase}>
                      {clase.id_clase} - {clase.descripcion}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        )}
        <Field className="md:col-span-2 xl:col-span-12" label="Comentario de revision">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={revisionComment} onChange={setRevisionComment} placeholder="Observacion del control" />
            <button
              type="button"
              onClick={() => saveRevision(item.revision.revisado)}
              disabled={savingRevision}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-xs font-black hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-900"
            >
              <Save className="h-4 w-4" />
              Guardar comentario
            </button>
          </div>
        </Field>
      </div>
    </article>
  );
}

function draftFromItem(item: AltaMovimientoConRevision) {
  return {
    fecha_alta: item.fecha_alta?.slice(0, 10) || "",
    cantidad: item.cantidad ? String(item.cantidad) : "",
    concepto: item.concepto || "",
    disposicion: item.disposicion || "",
    fecha_resolucion: item.fecha_resolucion?.slice(0, 10) || "",
    valor_unitario: item.valor_unitario ? String(item.valor_unitario) : "",
    causa_alta: item.causa_alta || "",
    codigo_presup: item.codigo_presup || (item.id_rubro ? String(item.id_rubro) : ""),
    identidad: item.identidad || "",
    mes_planilla: item.mes_planilla || "",
    anio_planilla: item.anio_planilla || "",
    id_rubro: item.id_rubro ? String(item.id_rubro) : "",
    id_clase: item.id_clase ? String(item.id_clase) : "",
  };
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-cyan-900"
    />
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-cyan-900"
    >
      {children}
    </select>
  );
}
