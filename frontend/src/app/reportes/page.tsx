"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Building2,
  CameraOff,
  Car,
  CircleHelp,
  ClipboardList,
  Download,
  Flame,
  FolderX,
  Laptop,
  Layers3,
  Monitor,
  Package,
  Phone,
  Printer,
  RefreshCw,
  Search,
  Snowflake,
  Tag,
  Tv,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Wrapper } from "@/components";
import { type AlertKey, type ReportSelection, type SpecificKey } from "@/lib/reportDetail";
import { obtenerUltimosMobiliarios } from "@/services/mobiliarioService";
import type { MobiliarioUltimo } from "@/types/types";
import ReportDetailDialog from "./ReportDetailDialog";
import {
  fetchDashboard,
  type DashboardAlertas,
  type DashboardResponse,
  type PieItem,
} from "@/services/dashboardService";

type ChartItem = PieItem & {
  color: string;
  porcentaje: number;
};

const numberFormatter = new Intl.NumberFormat("es-AR");
const percentFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const CHART_COLORS = [
  "#0e7490",
  "#047857",
  "#b45309",
  "#b91c1c",
  "#4338ca",
  "#7e22ce",
  "#0f766e",
  "#c2410c",
  "#0369a1",
  "#4d7c0f",
  "#be185d",
  "#475569",
];

const STATE_META: Record<string, { label: string; color: string }> = {
  nuevo: { label: "Nuevo", color: "#0284c7" },
  bueno: { label: "Bueno", color: "#059669" },
  regular: { label: "Regular", color: "#d97706" },
  "malo / inutil": { label: "Malo / Inútil", color: "#dc2626" },
  malo: { label: "Malo", color: "#dc2626" },
  inutil: { label: "Malo / Inútil", color: "#dc2626" },
  "inútil": { label: "Malo / Inútil", color: "#dc2626" },
  "sin estado": { label: "Sin estado", color: "#64748b" },
  "sin dato": { label: "Sin estado", color: "#64748b" },
  otro: { label: "Otro", color: "#7c3aed" },
};

const SPECIFIC_META: Record<
  string,
  { label: string; icon: LucideIcon; tone: string }
> = {
  computadoras: {
    label: "Computadoras",
    icon: Laptop,
    tone: "bg-cyan-50 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200",
  },
  impresoras: {
    label: "Impresoras",
    icon: Printer,
    tone: "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200",
  },
  monitores: {
    label: "Monitores",
    icon: Monitor,
    tone: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  televisores: {
    label: "Televisores",
    icon: Tv,
    tone: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  },
  telefonia: {
    label: "Telefonía",
    icon: Phone,
    tone: "bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  },
  climatizacion: {
    label: "Climatización",
    icon: Snowflake,
    tone: "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
  },
  vehiculos: {
    label: "Vehículos",
    icon: Car,
    tone: "bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200",
  },
  matafuegos: {
    label: "Matafuegos",
    icon: Flame,
    tone: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200",
  },
};

const ALERT_META: Array<{
  key: AlertKey;
  label: string;
  icon: LucideIcon;
  tone: string;
}> = [
  { key: "no_dado", label: "No dados", icon: Ban, tone: "text-red-700 dark:text-red-300" },
  { key: "faltantes", label: "Faltantes", icon: XCircle, tone: "text-red-700 dark:text-red-300" },
  { key: "para_baja", label: "Para baja", icon: AlertTriangle, tone: "text-red-700 dark:text-red-300" },
  { key: "para_reparacion", label: "Para reparación", icon: Wrench, tone: "text-amber-700 dark:text-amber-300" },
  { key: "problema_etiqueta", label: "Problema de etiqueta", icon: Tag, tone: "text-amber-700 dark:text-amber-300" },
  { key: "sobrantes", label: "Sobrantes", icon: Package, tone: "text-violet-700 dark:text-violet-300" },
  { key: "sin_estado", label: "Sin estado", icon: CircleHelp, tone: "text-slate-700 dark:text-slate-300" },
  { key: "sin_foto", label: "Sin foto", icon: CameraOff, tone: "text-slate-700 dark:text-slate-300" },
  { key: "sin_rubro", label: "Sin rubro", icon: FolderX, tone: "text-slate-700 dark:text-slate-300" },
  { key: "sin_clase", label: "Sin clase", icon: Layers3, tone: "text-slate-700 dark:text-slate-300" },
];

const EMPTY_ALERTS: DashboardAlertas = {
  no_dado: 0,
  para_reparacion: 0,
  para_baja: 0,
  faltantes: 0,
  sobrantes: 0,
  problema_etiqueta: 0,
  sin_estado: 0,
  sin_foto: 0,
  sin_rubro: 0,
  sin_clase: 0,
};

function formatNumber(value: number) {
  return numberFormatter.format(Number(value || 0));
}

function formatPercent(value: number) {
  return `${percentFormatter.format(value)}%`;
}

function itemTotal(items: PieItem[]) {
  return items.reduce((total, item) => total + Number(item.value || 0), 0);
}

function chartItems(items: PieItem[], limit?: number): ChartItem[] {
  const sorted = [...items].sort((a, b) => Number(b.value) - Number(a.value));
  const total = itemTotal(sorted);
  return (limit ? sorted.slice(0, limit) : sorted).map((item, index) => ({
    ...item,
    value: Number(item.value || 0),
    color: CHART_COLORS[index % CHART_COLORS.length],
    porcentaje: total ? (Number(item.value || 0) / total) * 100 : 0,
  }));
}

function stateItems(items: PieItem[]): ChartItem[] {
  const total = itemTotal(items);
  return items
    .map((item) => {
      const meta = STATE_META[item.label.toLocaleLowerCase("es-AR")] ?? {
        label: item.label,
        color: "#7c3aed",
      };
      return {
        label: meta.label,
        value: Number(item.value || 0),
        color: meta.color,
        porcentaje: total ? (Number(item.value || 0) / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.value - a.value);
}

function shorten(value: string, max = 24) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function ChartTooltip({
  active,
  payload,
  showPercent = true,
}: {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: Partial<ChartItem>;
  }>;
  showPercent?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="max-w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-950">
      <p className="font-bold text-slate-950 dark:text-white">{item?.label || "Sin dato"}</p>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        {formatNumber(Number(payload[0].value || 0))} bienes
      </p>
      {showPercent && item?.porcentaje != null && (
        <p className="font-semibold text-cyan-700 dark:text-cyan-300">
          {formatPercent(item.porcentaje)}
        </p>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="text-2xl font-black text-slate-950 dark:text-white">{formatNumber(value)}</p>
      <p className="mt-1 flex min-h-8 items-start justify-between gap-1 break-words text-xs font-bold uppercase leading-4 text-slate-500 dark:text-slate-400">
        {label} {onClick && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-cyan-700 dark:text-cyan-300" />}
      </p>
    </>
  );
  const classes = "min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80";
  return onClick ? (
    <button type="button" onClick={onClick} aria-label={`Ver ${label}: ${formatNumber(value)} bienes`} className={`${classes} text-left transition hover:border-cyan-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-700`}>
      {content}
    </button>
  ) : <div className={classes}>{content}</div>;
}

function HorizontalChart({
  data,
  color = "#0e7490",
  height = 330,
  showPercent = true,
}: {
  data: ChartItem[];
  color?: string;
  height?: number;
  showPercent?: boolean;
}) {
  if (!data.length) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Sin datos para mostrar
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 6, right: 22, bottom: 6, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" opacity={0.55} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={132}
            tickFormatter={(value: string) => shorten(value)}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip showPercent={showPercent} />} cursor={{ fill: "#94a3b8", opacity: 0.1 }} />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ReportesPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [selection, setSelection] = useState<ReportSelection | null>(null);
  const [detailItems, setDetailItems] = useState<MobiliarioUltimo[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailRetry, setDetailRetry] = useState(0);
  const [returnContext, setReturnContext] = useState({ search: "", page: 1, itemId: "" });
  const restoredRef = useRef(false);
  const closeDetail = useCallback(() => {
    setSelection(null);
    const url = new URL(window.location.href);
    for (const key of ["detalleTipo", "detalleClave", "busqueda", "pagina", "fila"]) {
      url.searchParams.delete(key);
    }
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);
  const openDetail = (nextSelection: ReportSelection) => {
    setReturnContext({ search: "", page: 1, itemId: "" });
    setSelection(nextSelection);
  };

  useEffect(() => {
    if (!selection || detailItems) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError("");
    obtenerUltimosMobiliarios({ force: true })
      .then((items) => { if (!cancelled) setDetailItems(items); })
      .catch((loadError) => {
        if (!cancelled) setDetailError(loadError instanceof Error ? loadError.message : "No se pudo cargar el detalle.");
      })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [detailItems, detailRetry, selection]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setData(await fetchDashboard());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los reportes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data || restoredRef.current) return;
    restoredRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const kind = params.get("detalleTipo");
    const key = params.get("detalleClave");
    if (!key) return;

    let restored: ReportSelection | null = null;
    if (kind === "specific") {
      const item = data.destacados?.find((entry) => entry.label.toLocaleLowerCase("es-AR") === key);
      if (item) restored = { kind, key: key as SpecificKey, label: specificMeta(item.label).label, total: item.value };
    } else if (kind === "alert") {
      const meta = ALERT_META.find((entry) => entry.key === key);
      if (meta) restored = { kind, key: meta.key, label: meta.label, total: data.alertas?.[meta.key] ?? 0 };
    }
    if (!restored) return;

    const page = Number(params.get("pagina"));
    setReturnContext({
      search: params.get("busqueda") || "",
      page: Number.isSafeInteger(page) && page > 0 ? page : 1,
      itemId: params.get("fila") || "",
    });
    setSelection(restored);
  }, [data]);

  const states = useMemo(() => stateItems(data?.por_estado ?? []), [data?.por_estado]);
  const annexes = useMemo(() => chartItems(data?.por_anexo ?? []), [data?.por_anexo]);
  const groups = useMemo(() => chartItems(data?.por_rubro ?? []), [data?.por_rubro]);
  const classes = useMemo(() => chartItems(data?.por_clase ?? []), [data?.por_clase]);
  const specifics = useMemo(() => chartItems(data?.destacados ?? []), [data?.destacados]);
  const alerts = data?.alertas ?? EMPTY_ALERTS;
  const stateTotal = itemTotal(states);

  const filteredClasses = useMemo(() => {
    const query = classSearch.trim().toLocaleLowerCase("es-AR");
    if (!query) return classes;
    return classes.filter((item) => item.label.toLocaleLowerCase("es-AR").includes(query));
  }, [classSearch, classes]);

  const exportExcel = () => {
    if (!data) return;

    const workbook = XLSX.utils.book_new();
    const append = (name: string, rows: Record<string, string | number>[]) => {
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet["!cols"] = Object.keys(rows[0] ?? {}).map((key) => ({
        wch: Math.min(48, Math.max(key.length + 2, 16)),
      }));
      XLSX.utils.book_append_sheet(workbook, sheet, name);
    };

    append("Resumen", [
      { Indicador: "Bienes registrados", Cantidad: data.kpis.mobiliario },
      { Indicador: "Anexos", Cantidad: data.kpis.anexos },
      { Indicador: "Subdependencias", Cantidad: data.kpis.subdependencias },
      { Indicador: "Clases con bienes", Cantidad: classes.length },
    ]);
    append("Estados", states.map((item) => ({ Estado: item.label, Cantidad: item.value, Porcentaje: formatPercent(item.porcentaje) })));
    append("Bienes especificos", specifics.map((item) => ({ Categoria: displaySpecificLabel(item.label), Cantidad: item.value })));
    append("Anexos", annexes.map((item, index) => ({ Ranking: index + 1, Anexo: item.label, Cantidad: item.value, Porcentaje: formatPercent(item.porcentaje) })));
    append("Rubros", groups.map((item, index) => ({ Ranking: index + 1, Rubro: item.label, Cantidad: item.value, Porcentaje: formatPercent(item.porcentaje) })));
    append("Clases", classes.map((item, index) => ({ Ranking: index + 1, Clase: item.label, Cantidad: item.value, Porcentaje: formatPercent(item.porcentaje) })));
    append("Alertas", ALERT_META.map((item) => ({ Alerta: item.label, Cantidad: alerts[item.key] })));

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `reporte_patrimonio_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <Wrapper>
      <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-1 pb-12 pt-1 sm:px-3 lg:px-5">
        <header className="mb-6 border-b border-slate-200 pb-5 dark:border-slate-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">Control patrimonial</p>
              <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">Reportes</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Inventario, conservación, distribución y alertas operativas.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                title="Actualizar reportes"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span className="sr-only">Actualizar reportes</span>
              </button>
              <button
                type="button"
                onClick={exportExcel}
                disabled={!data || loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <Download className="h-4 w-4" />
                Exportar Excel
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            <span>{error}</span>
            <button type="button" onClick={() => void load()} className="shrink-0 font-bold underline">Reintentar</button>
          </div>
        )}

        <section className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Bienes registrados" value={data?.kpis.mobiliario ?? 0} icon={Package} tone="bg-cyan-50 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200" />
          <MetricCard label="Anexos" value={data?.kpis.anexos ?? 0} icon={Building2} tone="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" />
          <MetricCard label="Subdependencias" value={data?.kpis.subdependencias ?? 0} icon={ClipboardList} tone="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200" />
          <MetricCard label="Clases con bienes" value={classes.length} icon={Layers3} tone="bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200" />
        </section>

        <section className="mb-8 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Estado de conservación</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Bienes agrupados por su estado informado.</p>
            </div>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{formatNumber(stateTotal)} total</span>
          </div>
          <div className="grid items-center gap-6 md:grid-cols-[minmax(280px,0.85fr)_1.15fr]">
            <div className="h-[270px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={states} dataKey="value" nameKey="label" innerRadius={72} outerRadius={108} paddingAngle={2} strokeWidth={0}>
                    {states.map((item) => <Cell key={item.label} fill={item.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <text x="50%" y="47%" textAnchor="middle" className="fill-slate-950 text-2xl font-black dark:fill-white">{formatNumber(stateTotal)}</text>
                  <text x="50%" y="57%" textAnchor="middle" className="fill-slate-500 text-xs font-bold">BIENES</text>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {states.map((item) => (
                <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-3">
                  <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="font-black text-slate-950 dark:text-white">{formatNumber(item.value)}</span>
                  <span className="w-16 text-right text-sm font-semibold text-slate-500">{formatPercent(item.porcentaje)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Bienes específicos</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Conteos por clase y descripción patrimonial.</p>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            {(data?.destacados ?? []).map((item) => {
              const meta = specificMeta(item.label);
              return <MetricCard key={item.label} label={meta.label} value={item.value} icon={meta.icon} tone={meta.tone} onClick={() => openDetail({ kind: "specific", key: item.label.toLocaleLowerCase("es-AR") as SpecificKey, label: meta.label, total: item.value })} />;
            })}
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-5">
            <HorizontalChart
              data={specifics.map((item) => ({ ...item, label: displaySpecificLabel(item.label) }))}
              color="#0f766e"
              height={300}
              showPercent={false}
            />
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Alertas y calidad de datos</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Registros que requieren revisión o completar información.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 xl:grid-cols-10">
            {ALERT_META.map(({ key, label, icon: Icon, tone }) => (
              <button type="button" key={key} onClick={() => openDetail({ kind: "alert", key, label, total: alerts[key] })} aria-label={`Ver ${label}: ${formatNumber(alerts[key])} bienes`} className="rounded-lg border border-slate-200 bg-white px-3 py-4 text-left shadow-sm transition hover:border-cyan-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-700 dark:border-slate-800 dark:bg-slate-950/80">
                <Icon className={`h-5 w-5 ${tone}`} />
                <p className="mt-3 text-xl font-black text-slate-950 dark:text-white">{formatNumber(alerts[key])}</p>
                <p className="mt-1 flex items-start justify-between gap-1 break-words text-xs font-bold text-slate-500 dark:text-slate-400">{label}<ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-cyan-700 dark:text-cyan-300" /></p>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-8 grid gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-black text-slate-950 dark:text-white">Bienes por anexo</h2>
              <span className="text-xs font-bold text-slate-500">{annexes.length} ubicaciones</span>
            </div>
            <HorizontalChart data={annexes.slice(0, 14)} color="#0e7490" height={420} />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-black text-slate-950 dark:text-white">Bienes por rubro</h2>
              <span className="text-xs font-bold text-slate-500">{groups.length} rubros</span>
            </div>
            <HorizontalChart data={groups.slice(0, 12)} color="#4338ca" height={420} />
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-black text-slate-950 dark:text-white">Detalle por clase</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Consulta directa de las clases con bienes registrados.</p>
            </div>
            <label className="relative block w-full sm:w-72">
              <span className="sr-only">Buscar clase</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={classSearch}
                onChange={(event) => setClassSearch(event.target.value)}
                placeholder="Buscar clase"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <tr>
                  <th className="w-16 px-4 py-3">#</th>
                  <th className="px-4 py-3">Clase</th>
                  <th className="w-32 px-4 py-3 text-right">Bienes</th>
                  <th className="w-32 px-4 py-3 text-right">Porcentaje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredClasses.map((item, index) => (
                  <tr key={item.label} className="hover:bg-slate-50 dark:hover:bg-slate-900/70">
                    <td className="px-4 py-3 font-semibold text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{item.label}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-950 dark:text-white">{formatNumber(item.value)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-cyan-700 dark:text-cyan-300">{formatPercent(item.porcentaje)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filteredClasses.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-500">No se encontraron clases.</div>
            )}
            {loading && <div className="h-1 animate-pulse bg-cyan-600" />}
          </div>
        </section>
        {selection && (
          <ReportDetailDialog
            key={`${selection.kind}-${selection.key}`}
            selection={selection}
            items={detailItems}
            loading={detailLoading}
            error={detailError}
            initialSearch={returnContext.search}
            initialPage={returnContext.page}
            initialItemId={returnContext.itemId}
            onClose={closeDetail}
            onRetry={() => setDetailRetry((value) => value + 1)}
          />
        )}
      </main>
    </Wrapper>
  );
}

function specificMeta(label: string) {
  return SPECIFIC_META[label.toLocaleLowerCase("es-AR")] ?? {
    label,
    icon: Package,
    tone: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };
}

function displaySpecificLabel(label: string) {
  return specificMeta(label).label;
}
