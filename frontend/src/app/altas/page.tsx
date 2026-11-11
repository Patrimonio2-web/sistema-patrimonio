"use client";

import { useCallback, useEffect, useMemo, useState, type InputHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import {
  CircleCheck,
  Clock3,
  Edit3,
  FileText,
  BarChart3,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { Wrapper } from "@/components";
import ConfirmModal from "@/components/Modal/ConfirmModal";
import { canPreviewPlanillasAltas, isAdmin, isSuperAdmin, isViewer } from "@/services/authRole";
import {
  cambiarEstadoAlta,
  crearAlta,
  editarAlta,
  eliminarAlta,
  obtenerAltas,
  type AltaMovimiento,
  type AltaPayload,
} from "@/services/altasService";
import {
  buscarClases,
  obtenerRubros,
  type Clase,
  type Rubro,
} from "@/services/nomencladorService";

const MESES = [
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

const CAUSAS_ALTA = ["COMPRA DIRECTA", "DONACION", "TRANSFERENCIA", "OTRA"];

type ResolucionTipo = "RESOL" | "RESOL SL" | "RESOL PSL" | "DCTO";

type FormState = {
  mes_planilla: string;
  anio_planilla: string;
  fecha_alta: string;
  concepto: string;
  tipo_resolucion: ResolucionTipo;
  disposicion_numero: string;
  disposicion: string;
  fecha_resolucion: string;
  cantidad: string;
  valor_unitario: string;
  valor_total: string;
  causa_alta: string;
  codigo_presup: string;
  identidad: string;
  id_rubro: string;
  id_clase: string;
};

function todayInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function currentMonthName() {
  return MESES[new Date().getMonth()];
}

function emptyForm(): FormState {
  return {
    mes_planilla: currentMonthName(),
    anio_planilla: String(new Date().getFullYear()),
    fecha_alta: todayInput(),
    concepto: "",
    tipo_resolucion: "RESOL",
    disposicion_numero: "",
    disposicion: "",
    fecha_resolucion: "",
    cantidad: "",
    valor_unitario: "",
    valor_total: "",
    causa_alta: "",
    codigo_presup: "",
    identidad: "",
    id_rubro: "",
    id_clase: "",
  };
}

function numberFromInput(value: string) {
  const normalized = value.trim().replace(/\s+/g, "");
  if (!normalized) return 0;

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    const commaIndex = normalized.lastIndexOf(",");
    const dotIndex = normalized.lastIndexOf(".");
    const decimalSeparator = commaIndex > dotIndex ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    const parsed = Number(
      normalized.replace(new RegExp(`\\${thousandsSeparator}`, "g"), "").replace(decimalSeparator, ".")
    );
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (hasComma) {
    const parsed = Number(normalized.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (hasDot) {
    const parts = normalized.split(".");
    const decimalOrThousands =
      parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3
        ? normalized.replace(".", "")
        : normalized;
    const parsed = Number(parts.length > 2 ? parts.join("") : decimalOrThousands);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function plainNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function calcularValorTotal(cantidad: number, unitario: number) {
  const total = cantidad * unitario;
  return Number.isFinite(total) ? total : 0;
}

function money(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function dateLabel(value?: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("es-AR").format(new Date(year, month - 1, day));
}

function formatDateForResolution(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function buildDisposicion(tipo: ResolucionTipo, numero: string, fecha: string) {
  const cleanNumero = numero.trim();
  if (!cleanNumero) return "";

  if (tipo === "DCTO") {
    return `DCTO. N°${cleanNumero}${fecha ? ` ${formatDateForResolution(fecha)}` : ""}`;
  }

  const label =
    tipo === "RESOL" ? "(P.S.A.)" : tipo === "RESOL PSL" ? "(P.S.L.)" : "(S.L.)";
  return `RESOL. N°${cleanNumero} ${label}${fecha ? ` ${formatDateForResolution(fecha)}` : ""}`;
}

function normalizeCausaAlta(value: string) {
  const clean = value.trim();
  if (clean.toUpperCase() === "C") return "COMPRA DIRECTA";
  return value.toUpperCase();
}

function toPayload(form: FormState): AltaPayload {
  const cantidad = numberFromInput(form.cantidad);
  const valorUnitario = numberFromInput(form.valor_unitario);
  const valorTotal = calcularValorTotal(cantidad, valorUnitario);

  return {
    fecha_alta: form.fecha_alta,
    cantidad,
    concepto: form.concepto.trim(),
    disposicion: form.disposicion.trim() || null,
    fecha_resolucion: form.fecha_resolucion || null,
    valor_unitario: valorUnitario,
    valor_total: valorTotal,
    causa_alta: form.causa_alta.trim() || null,
    codigo_presup: form.codigo_presup.trim() || null,
    identidad: form.identidad.trim() || null,
    mes_planilla: form.mes_planilla,
    anio_planilla: form.anio_planilla.trim(),
    id_rubro: form.id_rubro ? Number(form.id_rubro) : null,
    id_clase: form.id_clase ? Number(form.id_clase) : 0,
  };
}

function printHref(mes: string, anio: string, previewOnly = false) {
  const qs = new URLSearchParams();
  if (mes) qs.set("mes", mes);
  if (anio.trim()) qs.set("anio", anio.trim());
  if (previewOnly) qs.set("preview", "1");
  return `/altas/imprimir?${qs.toString()}`;
}

function altaValorTotal(item: AltaMovimiento) {
  const cantidad = Number(item.cantidad || 0);
  const unitario = Number(item.valor_unitario || 0);
  const total = calcularValorTotal(cantidad, unitario);
  return total > 0 ? total : Number(item.valor_total || 0);
}

function formatClaseAlta(item: Pick<AltaMovimiento, "id_clase" | "clase_nombre">) {
  if (item.id_clase === null || item.id_clase === undefined || Number(item.id_clase) === 0) {
    return "0000";
  }
  return String(item.id_clase);
}

export default function AltasPage() {
  const viewer = isViewer();
  const admin = isAdmin();
  const superadmin = isSuperAdmin();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [allRegistros, setAllRegistros] = useState<AltaMovimiento[]>([]);
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [claseSearch, setClaseSearch] = useState("");
  const [clases, setClases] = useState<Clase[]>([]);
  const [searchingClases, setSearchingClases] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AltaMovimiento | null>(null);
  const [statusTarget, setStatusTarget] = useState<AltaMovimiento | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroAnio, setFiltroAnio] = useState("");
  const [bandejaAnio, setBandejaAnio] = useState("");
  const [bandejaMes, setBandejaMes] = useState("");
  const [bandejaEstado, setBandejaEstado] = useState<"todos" | "pendiente" | "aprobado">("todos");
  const [mostrarTodosLosMeses, setMostrarTodosLosMeses] = useState(false);

  const registros = useMemo(() => allRegistros.filter((item) =>
    (!filtroMes || item.mes_planilla?.toLowerCase() === filtroMes.toLowerCase()) &&
    (!filtroAnio.trim() || item.anio_planilla === filtroAnio.trim())
  ), [allRegistros, filtroMes, filtroAnio]);

  const planillasPorMes = useMemo(() => {
    const months = new Map<string, { mes: string; anio: string; registros: number; aprobadas: number; total: number }>();
    for (const item of allRegistros) {
      const mes = MESES.find((name) => name.toLowerCase() === item.mes_planilla?.toLowerCase()) || item.mes_planilla || "Sin mes";
      const anio = item.anio_planilla || "Sin año";
      const key = `${anio}|${mes}`;
      const group = months.get(key) || { mes, anio, registros: 0, aprobadas: 0, total: 0 };
      group.registros += 1;
      if (item.estado_carga === "aprobada") group.aprobadas += 1;
      group.total += altaValorTotal(item);
      months.set(key, group);
    }
    return [...months.values()].sort((a, b) =>
      b.anio.localeCompare(a.anio, "es", { numeric: true }) || MESES.indexOf(b.mes) - MESES.indexOf(a.mes)
    );
  }, [allRegistros]);

  const selectedPlanilla = planillasPorMes.find((planilla) =>
    planilla.mes === filtroMes && planilla.anio === filtroAnio.trim()
  );

  const aniosBandeja = [...new Set(planillasPorMes.map((planilla) => planilla.anio))];
  const planillasFiltradas = planillasPorMes.filter((planilla) =>
    (!bandejaAnio || planilla.anio === bandejaAnio) &&
    (!bandejaMes || planilla.mes === bandejaMes) &&
    (bandejaEstado === "todos" || (bandejaEstado === "aprobado" ? planilla.aprobadas === planilla.registros : planilla.aprobadas < planilla.registros))
  );
  const planillasVisibles = mostrarTodosLosMeses ? planillasFiltradas : planillasFiltradas.slice(0, 6);

  const grouped = useMemo(() => {
    return registros.reduce<Record<string, AltaMovimiento[]>>((acc, item) => {
      const key = item.rubro_nombre || "Sin rubro";
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [registros]);

  const totalFiltrado = useMemo(
    () => registros.reduce((acc, item) => acc + altaValorTotal(item), 0),
    [registros]
  );

  useEffect(() => {
    obtenerRubros()
      .then(setRubros)
      .catch((error) => {
        console.error(error);
        toast.error("No se pudieron cargar los rubros.");
      });
  }, []);

  useEffect(() => {
    const query = claseSearch.trim();
    if (form.id_clase || query.length < 2) {
      setClases([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        setSearchingClases(true);
        setClases(await buscarClases(query));
      } catch (error) {
        console.error(error);
        setClases([]);
      } finally {
        setSearchingClases(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [claseSearch, form.id_clase]);

  useEffect(() => {
    const cantidad = numberFromInput(form.cantidad);
    const unitario = numberFromInput(form.valor_unitario);
    const nextTotal = cantidad && unitario ? plainNumber(calcularValorTotal(cantidad, unitario)) : "";
    setForm((prev) => (prev.valor_total === nextTotal ? prev : { ...prev, valor_total: nextTotal }));
  }, [form.cantidad, form.valor_unitario]);

  useEffect(() => {
    const next = buildDisposicion(
      form.tipo_resolucion,
      form.disposicion_numero,
      form.fecha_resolucion
    );
    if (!next) return;
    setForm((prev) => (prev.disposicion === next ? prev : { ...prev, disposicion: next }));
  }, [form.tipo_resolucion, form.disposicion_numero, form.fecha_resolucion]);

  const loadRegistros = useCallback(async () => {
    try {
      setLoading(true);
      setAllRegistros(await obtenerAltas());
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar las altas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRegistros();
  }, [loadRegistros]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setClaseSearch("");
    setClases([]);
  };

  const handleClaseSearch = (value: string) => {
    setClaseSearch(value);
    setForm((prev) => ({
      ...prev,
      id_clase: "",
      id_rubro: "",
      codigo_presup: "",
    }));
  };

  const selectClase = (clase: Clase) => {
    const rubroId = Number(clase.id_clase) === 9999 ? "" : String(clase.id_rubro);
    setForm((prev) => ({ ...prev, id_clase: String(clase.id_clase), id_rubro: rubroId, codigo_presup: rubroId }));
    setClaseSearch(`${clase.id_clase} - ${clase.descripcion}`);
    setClases([]);
  };

  const validate = () => {
    if (!form.mes_planilla || !form.anio_planilla || !form.fecha_alta || !form.concepto || !form.cantidad) {
      toast.error("Completa los campos obligatorios.");
      return false;
    }
    if (form.id_clase && !form.id_rubro) {
      toast.error("Selecciona el rubro para la clase elegida.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      const payload = toPayload(form);
      let saved: AltaMovimiento;
      if (editingId) {
        saved = await editarAlta(editingId, payload);
        toast.success("Alta actualizada.");
      } else {
        saved = await crearAlta(payload);
        toast.success("Alta guardada.");
      }
      resetForm();
      await loadRegistros();
      setStatusTarget(saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: AltaMovimiento) => {
    setEditingId(item.id);
    setClaseSearch(item.id_clase ? `${item.id_clase}${item.clase_nombre ? ` - ${item.clase_nombre}` : ""}` : "");
    setForm({
      mes_planilla: item.mes_planilla || currentMonthName(),
      anio_planilla: item.anio_planilla || String(new Date().getFullYear()),
      fecha_alta: item.fecha_alta?.slice(0, 10) || todayInput(),
      concepto: item.concepto || "",
      tipo_resolucion: "RESOL",
      disposicion_numero: "",
      disposicion: item.disposicion || "",
      fecha_resolucion: item.fecha_resolucion?.slice(0, 10) || "",
      cantidad: item.cantidad ? String(item.cantidad) : "",
      valor_unitario: item.valor_unitario ? String(item.valor_unitario) : "",
      valor_total: item.valor_total ? String(item.valor_total) : "",
      causa_alta: item.causa_alta || "",
      codigo_presup: item.codigo_presup || (item.id_rubro ? String(item.id_rubro) : ""),
      identidad: item.identidad || "",
      id_rubro: item.id_rubro ? String(item.id_rubro) : "",
      id_clase: item.id_clase ? String(item.id_clase) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (item: AltaMovimiento) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await eliminarAlta(deleteTarget.id);
      toast.success("Alta eliminada.");
      setDeleteTarget(null);
      await loadRegistros();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
    } finally {
      setDeleting(false);
    }
  };

  const updateStatus = async (estado: "pendiente" | "aprobada") => {
    if (!statusTarget) return;
    try {
      setStatusSaving(true);
      const updated = await cambiarEstadoAlta(statusTarget.id, estado);
      setAllRegistros((current) => current.map((item) => item.id === updated.id ? updated : item));
      setStatusTarget(null);
      toast.success(estado === "aprobada" ? "Alta aprobada." : "Alta marcada como pendiente.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado.");
    } finally {
      setStatusSaving(false);
    }
  };

  const canExport = Boolean(filtroMes && filtroAnio.trim());
  const canPreviewAltas = canPreviewPlanillasAltas();
  const canOpenPreview = canPreviewAltas && canExport;
  const canPrepareOutput = superadmin && canExport;

  return (
    <Wrapper>
      <Toaster />
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Eliminar alta"
        message={
          deleteTarget
            ? `Vas a eliminar la alta ID ${deleteTarget.id}. Esta accion no se puede deshacer.`
            : "Esta accion no se puede deshacer."
        }
        confirmText="Eliminar alta"
        cancelText="Cancelar"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
      {statusTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="alta-status-title" className="w-full max-w-md rounded-md border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="alta-status-title" className="text-base font-black">Estado del alta ID {statusTarget.id}</h2>
                <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">{statusTarget.concepto}</p>
              </div>
              <button type="button" onClick={() => setStatusTarget(null)} disabled={statusSaving} title="Cerrar" aria-label="Cerrar" className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void updateStatus("pendiente")} disabled={statusSaving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-amber-500 px-3 text-sm font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:text-amber-300 dark:hover:bg-amber-950/30"><Clock3 className="h-4 w-4" /> Pendiente</button>
              <button type="button" onClick={() => void updateStatus("aprobada")} disabled={statusSaving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"><CircleCheck className="h-4 w-4" /> Aprobada</button>
            </div>
            <button type="button" onClick={() => setStatusTarget(null)} disabled={statusSaving} className="mt-4 w-full text-center text-sm text-slate-500 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">Ahora no</button>
          </section>
        </div>
      )}
      <main className="min-h-screen w-full min-w-0 overflow-x-hidden px-3 py-5 text-slate-950 dark:text-white sm:px-4 sm:py-6">
        <div className="mx-auto w-full max-w-7xl space-y-5">
          {!viewer && (
            <section className="min-w-0 rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-black">
                    <Plus className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
                    {editingId ? `Editar alta ID ${editingId}` : "Nueva alta"}
                  </h2>
                </div>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
                  >
                    <X className="h-4 w-4" />
                    Cancelar edición
                  </button>
                )}
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
                <div className="xl:col-span-3">
                  <Field label="Mes planilla">
                    <Select value={form.mes_planilla} onChange={(value) => setForm((prev) => ({ ...prev, mes_planilla: value }))}>
                      <option value="">Seleccionar</option>
                      {MESES.map((mes) => (
                        <option key={mes} value={mes}>{mes}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="xl:col-span-2">
                  <Field label="Año planilla">
                    <Input value={form.anio_planilla} onChange={(value) => setForm((prev) => ({ ...prev, anio_planilla: value }))} />
                  </Field>
                </div>
                <div className="xl:col-span-3">
                  <Field label="Fecha alta">
                    <Input type="date" value={form.fecha_alta} onChange={(value) => setForm((prev) => ({ ...prev, fecha_alta: value }))} />
                  </Field>
                </div>
                <div className="xl:col-span-4">
                  <Field label="Cantidad">
                    <Input type="number" value={form.cantidad} onChange={(value) => setForm((prev) => ({ ...prev, cantidad: value }))} />
                  </Field>
                </div>

                <div className="md:col-span-2 xl:col-span-12">
                  <Field label="Descripción">
                    <Input value={form.concepto} onChange={(value) => setForm((prev) => ({ ...prev, concepto: value }))} />
                  </Field>
                </div>

                <div className="xl:col-span-3">
                  <Field label="Tipo resolución">
                    <Select value={form.tipo_resolucion} onChange={(value) => setForm((prev) => ({ ...prev, tipo_resolucion: value as ResolucionTipo }))}>
                      <option value="RESOL">PSA</option>
                      <option value="RESOL SL">SL</option>
                      <option value="RESOL PSL">PSL</option>
                      <option value="DCTO">DCTO</option>
                    </Select>
                  </Field>
                </div>
                <div className="xl:col-span-3">
                  <Field label="Nro. resolución">
                    <Input value={form.disposicion_numero} onChange={(value) => setForm((prev) => ({ ...prev, disposicion_numero: value }))} />
                  </Field>
                </div>
                <div className="xl:col-span-3">
                  <Field label="Fecha resolución">
                    <Input type="date" value={form.fecha_resolucion} onChange={(value) => setForm((prev) => ({ ...prev, fecha_resolucion: value }))} />
                  </Field>
                </div>
                <div className="xl:col-span-3">
                  <Field label="Disposición">
                    <Input value={form.disposicion} onChange={(value) => setForm((prev) => ({ ...prev, disposicion: value }))} />
                  </Field>
                </div>

                <div className="xl:col-span-3">
                  <Field label="Valor unitario">
                    <Input inputMode="decimal" value={form.valor_unitario} onChange={(value) => setForm((prev) => ({ ...prev, valor_unitario: value }))} />
                  </Field>
                </div>
                <div className="xl:col-span-3">
                  <Field label="Valor total">
                    <Input value={form.valor_total} onChange={(value) => setForm((prev) => ({ ...prev, valor_total: value }))} readOnly />
                  </Field>
                </div>
                <div className="xl:col-span-3">
                  <Field label="Causa de alta">
                    <Input list="causas-alta" value={form.causa_alta} onChange={(value) => setForm((prev) => ({ ...prev, causa_alta: normalizeCausaAlta(value) }))} />
                  </Field>
                </div>
                <div className="xl:col-span-3">
                  <Field label="Identidad">
                    <Input value={form.identidad} onChange={(value) => setForm((prev) => ({ ...prev, identidad: value }))} />
                  </Field>
                </div>

                <div className="relative md:col-span-2 xl:col-span-5">
                  <Field label="Clase">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input value={claseSearch} onChange={(event) => handleClaseSearch(event.target.value)} placeholder="Escribí el código o nombre de la clase" role="combobox" aria-expanded={clases.length > 0} aria-controls="alta-clase-results" autoComplete="off" className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-cyan-400 dark:focus:ring-cyan-950" />
                      {searchingClases && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Buscando...</span>}
                    </div>
                  </Field>
                  {clases.length > 0 && (
                    <div id="alta-clase-results" className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-950">
                      {clases.map((clase) => (
                        <button key={`${clase.id_rubro}-${clase.id_clase}`} type="button" onClick={() => selectClase(clase)} className="flex w-full items-start gap-2 rounded px-3 py-2 text-left text-sm hover:bg-cyan-50 dark:hover:bg-cyan-950/40">
                          <span className="font-black text-cyan-700 dark:text-cyan-300">{clase.id_clase}</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{clase.descripcion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="xl:col-span-4">
                  <Field label="Rubro asignado">
                    {Number(form.id_clase) === 9999 ? (
                      <Select
                        value={form.id_rubro}
                        onChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            id_rubro: value,
                            codigo_presup: value,
                          }))
                        }
                      >
                        <option value="">Elegir rubro</option>
                        {rubros.map((rubro) => (
                          <option key={rubro.id_rubro} value={rubro.id_rubro}>
                            {rubro.id_rubro} - {rubro.nombre}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input value={form.id_rubro ? `${form.id_rubro} - ${rubros.find((rubro) => String(rubro.id_rubro) === form.id_rubro)?.nombre || ""}` : ""} onChange={() => undefined} placeholder="Se completa al elegir la clase" readOnly />
                    )}
                  </Field>
                </div>
                <div className="xl:col-span-3">
                  <Field label="Código presupuestario">
                    <Input value={form.codigo_presup} onChange={() => undefined} placeholder="Automático" readOnly />
                  </Field>
                </div>
              </div>
              <datalist id="causas-alta">
                {CAUSAS_ALTA.map((causa) => (
                  <option key={causa} value={causa} />
                ))}
              </datalist>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-cyan-700 px-5 text-sm font-black text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar alta"}
                </button>
              </div>
            </section>
          )}

          <section aria-label="Planillas por mes" className="min-w-0 border-y border-slate-200 py-4 dark:border-slate-800">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-black">Planillas por mes</h2>
                {!loading && <p className="text-xs text-slate-500 dark:text-slate-400">Mostrando {planillasVisibles.length} de {planillasFiltradas.length} meses</p>}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {(bandejaAnio || bandejaMes || bandejaEstado !== "todos") && (
                  <button type="button" onClick={() => { setBandejaAnio(""); setBandejaMes(""); setBandejaEstado("todos"); setMostrarTodosLosMeses(false); }} className="inline-flex items-center gap-1 text-sm font-bold text-slate-600 hover:underline dark:text-slate-300"><X className="h-4 w-4" /> Limpiar filtros</button>
                )}
                {(filtroMes || filtroAnio) && (
                  <button type="button" onClick={() => { setFiltroMes(""); setFiltroAnio(""); }} className="text-sm font-bold text-cyan-700 hover:underline dark:text-cyan-300">Ver todos los movimientos</button>
                )}
              </div>
            </div>
            <div className="mb-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[160px_160px_minmax(0,1fr)] lg:items-end">
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Año</span>
                <Select value={bandejaAnio} onChange={(value) => { setBandejaAnio(value); setMostrarTodosLosMeses(false); }}>
                  <option value="">Todos los años</option>
                  {aniosBandeja.map((anio) => <option key={anio} value={anio}>{anio}</option>)}
                </Select>
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Mes</span>
                <Select value={bandejaMes} onChange={(value) => { setBandejaMes(value); setMostrarTodosLosMeses(false); }}>
                  <option value="">Todos los meses</option>
                  {MESES.map((mes) => <option key={mes} value={mes}>{mes}</option>)}
                </Select>
              </label>
              <div className="min-w-0">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Estado</span>
                <div className="grid h-11 max-w-[360px] grid-cols-3 rounded-md border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900" role="group" aria-label="Filtrar planillas por estado">
                  {(["todos", "pendiente", "aprobado"] as const).map((estado) => (
                    <button key={estado} type="button" aria-pressed={bandejaEstado === estado} onClick={() => { setBandejaEstado(estado); setMostrarTodosLosMeses(false); }} className={`min-w-0 rounded px-1 text-xs font-bold transition-colors ${bandejaEstado === estado ? "bg-cyan-700 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                      {estado === "todos" ? "Todos" : estado === "pendiente" ? "Pendientes" : "Aprobados"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Cargando planillas...</p>
            ) : planillasPorMes.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no hay altas cargadas.</p>
            ) : planillasFiltradas.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">No hay meses que coincidan con estos filtros.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {planillasVisibles.map((planilla) => {
                  const aprobada = planilla.aprobadas === planilla.registros;
                  const selected = filtroMes === planilla.mes && filtroAnio.trim() === planilla.anio;
                  return (
                    <button
                      key={`${planilla.anio}-${planilla.mes}`}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setFiltroMes(planilla.mes);
                        setFiltroAnio(planilla.anio);
                        document.getElementById("altas-registros")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={`min-w-0 rounded-md border px-3 py-2.5 text-left transition-colors ${selected ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500 dark:bg-cyan-950/30" : "border-slate-200 bg-white hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-cyan-500"}`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0 font-black">{planilla.mes} {planilla.anio}</span>
                        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-xs font-bold ${aprobada ? "border-emerald-600 text-emerald-700 dark:text-emerald-300" : "border-amber-500 text-amber-700 dark:text-amber-300"}`}>{aprobada ? "Aprobado" : "Pendiente"}</span>
                      </span>
                      <span className="mt-1 block break-words text-xs text-slate-600 dark:text-slate-300">{planilla.aprobadas}/{planilla.registros} aprobadas · {money(planilla.total)}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {planillasFiltradas.length > 6 && (
              <button type="button" onClick={() => setMostrarTodosLosMeses((current) => !current)} className="mt-3 text-sm font-bold text-cyan-700 hover:underline dark:text-cyan-300">
                {mostrarTodosLosMeses ? "Mostrar menos" : `Ver ${planillasFiltradas.length - 6} meses más`}
              </button>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950/80">
            <div>
              <h2 className="text-base font-black">Resumen anual por rubro</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">Importes por mes y detalle de cada total.</p>
            </div>
            <Link href="/altas/resumen" className="inline-flex h-10 items-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white hover:bg-cyan-800">
              <BarChart3 className="h-4 w-4" /> Ver resumen anual
            </Link>
          </div>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black">
                  <Search className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
                  Movimientos cargados
                </h2>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[180px_140px_repeat(3,minmax(112px,auto))]">
                <Select value={filtroMes} onChange={setFiltroMes}>
                  <option value="">Todos los meses</option>
                  {MESES.map((mes) => (
                    <option key={mes} value={mes}>{mes}</option>
                  ))}
                </Select>
                <Input value={filtroAnio} onChange={setFiltroAnio} placeholder="Año" />
                <button
                  type="button"
                  onClick={loadRegistros}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  <RefreshCw className="h-4 w-4" />
                  Filtrar
                </button>
                <a
                  href={canOpenPreview ? printHref(filtroMes, filtroAnio, true) : undefined}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    if (!canPreviewAltas) {
                      event.preventDefault();
                      toast.error("Dante no tiene acceso a la vista previa de altas.");
                      return;
                    }
                    if (!canExport) {
                      event.preventDefault();
                      toast.error("Elegí mes y año para abrir la vista previa.");
                    }
                  }}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold text-white ${
                    canOpenPreview ? "bg-cyan-700 hover:bg-cyan-800" : "cursor-not-allowed bg-slate-400"
                  }`}
                >
                  <Printer className="h-4 w-4" />
                  Vista previa
                </a>
                <a
                  href={canPrepareOutput ? printHref(filtroMes, filtroAnio) : undefined}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    if (!superadmin) {
                      event.preventDefault();
                      toast.error("Impresion y PDF se habilitan desde revision super admin.");
                      return;
                    }
                    if (!canExport) {
                      event.preventDefault();
                      toast.error("Elegí mes y año para preparar el PDF.");
                    }
                  }}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold text-white ${
                    canPrepareOutput ? "bg-rose-600 hover:bg-rose-700" : "cursor-not-allowed bg-slate-400"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Preparar PDF
                </a>
              </div>
            </div>
          </section>

          <section id="altas-registros" className="scroll-mt-20 rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,520px)] lg:items-end">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">
                  Planillas
                </p>
                <h1 className="mt-2 text-2xl font-black">Altas de bienes</h1>
                {selectedPlanilla && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {selectedPlanilla.mes} {selectedPlanilla.anio} · {selectedPlanilla.aprobadas === selectedPlanilla.registros ? "Aprobado" : "Pendiente"}
                  </p>
                )}
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
                <Stat label="Registros" value={registros.length.toLocaleString("es-AR")} />
                <Stat label="Total" value={money(totalFiltrado)} />
                <Stat label="Rubros" value={Object.keys(grouped).length.toString()} />
              </div>
            </div>
          </section>

          {loading ? (
            <div className="rounded-md border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Cargando altas...
            </div>
          ) : registros.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No hay movimientos para mostrar.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([rubro, items]) => (
                <section
                  key={rubro}
                  className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/80"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                    <h3 className="text-base font-black">{rubro}</h3>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                      {items.length}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {items.map((item) => (
                      <article
                        key={item.id}
                        className="grid min-w-0 gap-3 px-4 py-3 text-sm lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.05fr)_minmax(0,1fr)_auto] lg:items-start"
                      >
                        <div className="min-w-0">
                          <p className="break-words font-black leading-snug text-slate-950 dark:text-white">
                            {item.concepto || "-"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge label="Fecha" value={dateLabel(item.fecha_alta)} />
                            <Badge label="Cant." value={item.cantidad ?? "-"} />
                            {admin ? (
                              <button type="button" onClick={() => setStatusTarget(item)} title="Cambiar estado de esta alta" className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold ${item.estado_carga === "aprobada" ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"}`}>
                                {item.estado_carga === "aprobada" ? <CircleCheck className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                                {item.estado_carga === "aprobada" ? "Aprobada" : "Pendiente"}
                              </button>
                            ) : (
                              <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-bold ${item.estado_carga === "aprobada" ? "border-emerald-600 text-emerald-700 dark:text-emerald-300" : "border-amber-500 text-amber-700 dark:text-amber-300"}`}>{item.estado_carga === "aprobada" ? "Aprobada" : "Pendiente"}</span>
                            )}
                          </div>
                        </div>

                        <div className="grid min-w-0 gap-2">
                          <MiniField label="Disposición" value={item.disposicion || "-"} />
                          <MiniField label="Causa" value={item.causa_alta || "-"} />
                        </div>

                        <div className="grid min-w-0 grid-cols-2 gap-2">
                          <MiniField label="Unitario" value={money(item.valor_unitario)} />
                          <MiniField label="Total" value={money(altaValorTotal(item))} strong />
                          <MiniField label="Cód. presup." value={item.codigo_presup || "-"} />
                          <MiniField label="Clase" value={formatClaseAlta(item)} />
                          <div className="col-span-2">
                            <MiniField label="Identidad" value={item.identidad || "-"} />
                          </div>
                        </div>

                        {!viewer && (
                          <div className="flex gap-2 lg:justify-end">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-amber-500 text-white hover:bg-amber-600"
                              title="Editar"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </Wrapper>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
      <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 break-words text-lg font-black leading-tight">{value}</p>
    </div>
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

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly,
  inputMode,
  list,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  list?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      inputMode={inputMode}
      list={list}
      className={`h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-cyan-400 dark:focus:ring-cyan-950 ${
        readOnly ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : ""
      }`}
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
      className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
    >
      {children}
    </select>
  );
}

function Badge({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-800 ring-1 ring-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-100 dark:ring-cyan-500/20">
      <span className="text-cyan-600 dark:text-cyan-300">{label}:</span>
      {value}
    </span>
  );
}

function MiniField({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <p className="min-w-0 break-words rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
      <span className="mb-0.5 block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className={strong ? "font-black text-slate-950 dark:text-white" : "font-semibold"}>
        {value}
      </span>
    </p>
  );
}
