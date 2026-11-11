// src/app/Auditoria/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Wrapper } from "@/components";
import HistorialModal from "@/components/Modal/HistorialModal";
import { fetchAuditoria } from "@/services/auditoriaService";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

type AuditRow = {
  id: number;
  fecha: string;
  usuario: string | null;
  accion: string | null;
  tabla_afectada: string | null;
  id_registro: string | null;
  descripcion: string | null;
  datos_anteriores: unknown;
  datos_nuevos: unknown;
  ip_origen: string | null;
  user_agent: string | null;
};

type HistorialState = {
  open: boolean;
  tabla?: string;
  idRegistro?: string | number | null;
};

function actionLabel(action?: string | null) {
  const a = (action || "").toUpperCase();

  if (a === "INSERT" || a === "CREATE") return "Creado";
  if (a === "UPDATE") return "Editado";
  if (a === "DELETE") return "Eliminado";

  return action || "—";
}

function badge(action?: string | null) {
  const a = (action || "").toUpperCase();
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset";

  if (a === "INSERT" || a === "CREATE") {
    return `${base} bg-green-100 text-green-800 ring-green-300 dark:bg-green-900/30 dark:text-green-200 dark:ring-green-700/40`;
  }

  if (a === "UPDATE") {
    return `${base} bg-amber-100 text-amber-800 ring-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700/40`;
  }

  if (a === "DELETE") {
    return `${base} bg-red-100 text-red-700 ring-red-300 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-700/40`;
  }

  return `${base} bg-gray-100 text-gray-800 ring-gray-300 dark:bg-gray-900/40 dark:text-gray-200 dark:ring-white/10`;
}

function safeJSON(x: unknown) {
  if (!x) return null;
  if (typeof x === "object") return x as Record<string, unknown>;

  try {
    return JSON.parse(String(x)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function computeDiff(before: unknown, after: unknown) {
  const b = safeJSON(before) || {};
  const a = safeJSON(after) || {};
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)])).sort();

  const rows: { field: string; v1: string; v2: string }[] = [];

  for (const k of keys) {
    const s1 =
      b[k] == null
        ? ""
        : typeof b[k] === "object"
          ? JSON.stringify(b[k], null, 2)
          : String(b[k]);

    const s2 =
      a[k] == null
        ? ""
        : typeof a[k] === "object"
          ? JSON.stringify(a[k], null, 2)
          : String(a[k]);

    if (s1 !== s2) {
      rows.push({ field: k, v1: s1, v2: s2 });
    }
  }

  return rows;
}

function parseFechaAR(fecha: string | null | undefined) {
  if (!fecha) return 0;

  const match = fecha.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/
  );

  if (!match) return 0;

  const [, dd, mm, yyyy, hh, mi] = match;
  return new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(mi)
  ).getTime();
}

function getChangeKind(row: AuditRow) {
  const before = safeJSON(row.datos_anteriores) || {};
  const after = safeJSON(row.datos_nuevos) || {};

  const ubicAntes = String(before.ubicacion_id ?? "");
  const ubicDesp = String(after.ubicacion_id ?? "");

  const anexoAntes = String(before.anexo ?? before.anexo_nombre ?? "");
  const anexoDesp = String(after.anexo ?? after.anexo_nombre ?? "");

  const subAntes = String(before.subdependencia ?? before.subdependencia_nombre ?? "");
  const subDesp = String(after.subdependencia ?? after.subdependencia_nombre ?? "");

  if (ubicAntes !== ubicDesp && (ubicAntes || ubicDesp)) return "ubicacion";
  if (
    (anexoAntes !== anexoDesp || subAntes !== subDesp) &&
    (anexoAntes || anexoDesp || subAntes || subDesp)
  ) {
    return "movimiento";
  }

  return "general";
}

function changeTone(kind: "ubicacion" | "movimiento" | "general") {
  if (kind === "ubicacion") {
    return "border-cyan-200 dark:border-cyan-800 bg-cyan-50/60 dark:bg-cyan-950/20";
  }
  if (kind === "movimiento") {
    return "border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/20";
  }
  return "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800";
}

function kindLabel(kind: "ubicacion" | "movimiento" | "general") {
  if (kind === "ubicacion") return "Ubicación";
  if (kind === "movimiento") return "Movimiento";
  return "General";
}

function kindBadgeClass(kind: "ubicacion" | "movimiento" | "general") {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset";

  if (kind === "ubicacion") {
    return `${base} bg-cyan-100 text-cyan-800 ring-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-200 dark:ring-cyan-700/40`;
  }

  if (kind === "movimiento") {
    return `${base} bg-violet-100 text-violet-800 ring-violet-300 dark:bg-violet-900/30 dark:text-violet-200 dark:ring-violet-700/40`;
  }

  return `${base} bg-gray-100 text-gray-700 ring-gray-300 dark:bg-gray-900/30 dark:text-gray-200 dark:ring-gray-700/40`;
}

function buildResume(row: AuditRow) {
  const before = safeJSON(row.datos_anteriores) || {};
  const after = safeJSON(row.datos_nuevos) || {};

  const ubicAntes = String(before.ubicacion_id ?? "");
  const ubicDesp = String(after.ubicacion_id ?? "");

  const anexoAntes = String(before.anexo ?? before.anexo_nombre ?? "");
  const anexoDesp = String(after.anexo ?? after.anexo_nombre ?? "");

  const subAntes = String(before.subdependencia ?? before.subdependencia_nombre ?? "");
  const subDesp = String(after.subdependencia ?? after.subdependencia_nombre ?? "");

  if (ubicAntes !== ubicDesp && (ubicAntes || ubicDesp)) {
    return `Cambio de ubicación: ${ubicAntes || "—"} → ${ubicDesp || "—"}`;
  }

  if (
    (anexoAntes !== anexoDesp || subAntes !== subDesp) &&
    (anexoAntes || anexoDesp || subAntes || subDesp)
  ) {
    return `Movimiento: ${anexoAntes || "—"} / ${subAntes || "—"} → ${anexoDesp || "—"} / ${subDesp || "—"}`;
  }

  if (row.descripcion) return row.descripcion;

  const a = (row.accion || "").toUpperCase();
  if (a === "INSERT" || a === "CREATE") return "Registro creado";
  if (a === "DELETE") return "Registro eliminado";

  return "Registro editado";
}

function LegendDot({ className }: { className: string }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${className}`} />;
}

function DetailBox({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950/50">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
        {title}
      </p>
      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-gray-800 dark:text-gray-200">
        {value || "—"}
      </p>
    </div>
  );
}

export default function AuditoriaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [limit, setLimit] = useState<number>(
    parseInt(searchParams.get("limit") || "50") || 50
  );
  const [page, setPage] = useState<number>(
    parseInt(searchParams.get("page") || "1") || 1
  );

  const offset = useMemo(() => Math.max(0, (page - 1) * limit), [page, limit]);

  const [data, setData] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [openRows, setOpenRows] = useState<Record<number, boolean>>({});
  const [typing, setTyping] = useState(false);

  const [historial, setHistorial] = useState<HistorialState>({
    open: false,
    tabla: undefined,
    idRegistro: null,
  });

  useEffect(() => {
    if (!desde || !hasta) {
      const today = new Date();
      const last = new Date();
      last.setDate(today.getDate() - 30);

      setHasta(today.toISOString().split("T")[0]);
      setDesde(last.toISOString().split("T")[0]);
    }
  }, [desde, hasta]);

  const updateURL = (newParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(newParams).forEach(([k, v]) => {
      if (
        v === undefined ||
        v === "" ||
        (typeof v === "number" && Number.isNaN(v))
      ) {
        params.delete(k);
      } else {
        params.set(k, String(v));
      }
    });

    router.replace(`?${params.toString()}`);
  };

  const fetchData = async (
    overrides?: Partial<{
      limit: number;
      offset: number;
      query: string;
      desde: string;
      hasta: string;
    }>
  ) => {
    setLoading(true);

    try {
      const finalLimit = overrides?.limit ?? limit;
      const finalOffset = overrides?.offset ?? offset;
      const finalQuery = overrides?.query ?? query;
      const finalDesde = overrides?.desde ?? desde;
      const finalHasta = overrides?.hasta ?? hasta;

      const rows = await fetchAuditoria({
        limit: finalLimit,
        offset: finalOffset,
        query: finalQuery.trim() || undefined,
        desde: finalDesde || undefined,
        hasta: finalHasta || undefined,
      });

      const sortedRows = [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
        const timeB = parseFechaAR(b.fecha);
        const timeA = parseFechaAR(a.fecha);

        if (timeB !== timeA) return timeB - timeA;
        return Number(b.id) - Number(a.id);
      });

      setData(sortedRows as AuditRow[]);
      setOpenRows({});
    } catch {
      setData([]);
      toast.error("No se pudo cargar la auditoría");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    updateURL({ query, page: 1, limit, desde, hasta });

    if (!desde || !hasta) return;

    setTyping(true);

    const t = setTimeout(() => {
      fetchData({
        query,
        desde,
        hasta,
        limit,
        offset: 0,
      });
      setTyping(false);
    }, 400);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (!desde || !hasta) return;

    updateURL({ desde, hasta, limit, page, query });
    fetchData({
      query,
      desde,
      hasta,
      limit,
      offset,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, page, desde, hasta]);

  useEffect(() => {
    if (!desde || !hasta) return;

    const interval = setInterval(() => {
      fetchData({
        query,
        desde,
        hasta,
        limit,
        offset,
      });
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, desde, hasta, limit, offset]);

  const showingFrom = useMemo(
    () => (data.length ? offset + 1 : 0),
    [offset, data.length]
  );

  const showingTo = useMemo(() => offset + data.length, [offset, data.length]);

  const handleFilter = () => {
    setPage(1);
    updateURL({ query, desde, hasta, limit, page: 1 });

    fetchData({
      query,
      desde,
      hasta,
      limit,
      offset: 0,
    });
  };

  const handleRefresh = () => {
    const today = new Date();
    const last = new Date();
    last.setDate(today.getDate() - 30);

    const newDesde = last.toISOString().split("T")[0];
    const newHasta = today.toISOString().split("T")[0];

    setDesde(newDesde);
    setHasta(newHasta);
    setPage(1);

    updateURL({
      query,
      desde: newDesde,
      hasta: newHasta,
      limit,
      page: 1,
    });

    fetchData({
      query,
      desde: newDesde,
      hasta: newHasta,
      limit,
      offset: 0,
    });
  };

  function abrirHistorial(tabla: string, idReg: string | number) {
    setHistorial({
      open: true,
      tabla,
      idRegistro: idReg,
    });
  }

  function cerrarHistorial() {
    setHistorial({
      open: false,
      tabla: undefined,
      idRegistro: null,
    });
  }

  return (
    <Wrapper>
      <main className="min-h-screen bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 px-3 py-6 transition-colors duration-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-700/70 dark:bg-gray-900/70 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-2xl font-extrabold tracking-tight text-blue-900 dark:text-white sm:text-3xl md:text-4xl">
                  Auditoría del Sistema
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {typing
                    ? "Buscando cambios..."
                    : "Monitoreá acciones, movimientos y ediciones registradas en el sistema."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5 xl:gap-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPage(1);
                      updateURL({ query, page: 1, limit, desde, hasta });
                      fetchData({
                        query,
                        desde,
                        hasta,
                        limit,
                        offset: 0,
                      });
                    }
                  }}
                  placeholder="Buscar por ID, usuario, acción, tabla o descripción"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400 xl:col-span-2"
                />

                <input
                  type="date"
                  value={desde}
                  onChange={(e) => {
                    setPage(1);
                    setDesde(e.target.value);
                  }}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />

                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => {
                    setPage(1);
                    setHasta(e.target.value);
                  }}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleFilter}
                    className="flex-1 rounded-2xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                  >
                    Filtrar
                  </button>

                  <button
                    onClick={handleRefresh}
                    className="flex-1 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-800/80 dark:focus-visible:ring-offset-gray-900"
                  >
                    Actualizar
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 sm:text-base">
                  Referencias visuales
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Esta guía ayuda a interpretar más rápido las acciones y tipos de cambio.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30">
                  <LegendDot className="bg-green-500" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                    Creado
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30">
                  <LegendDot className="bg-amber-500" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                    Editado
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30">
                  <LegendDot className="bg-red-500" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                    Eliminado
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30">
                  <LegendDot className="bg-cyan-500" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                    Cambio de ubicación
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30">
                  <LegendDot className="bg-violet-500" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                    Movimiento entre sectores
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Registros de auditoría
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {loading
                    ? "Cargando registros..."
                    : `Mostrando ${showingFrom}–${showingTo} (página ${page}, límite ${limit})`}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Por página
                </span>

                <select
                  value={limit}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value) || 50;
                    setPage(1);
                    setLimit(newLimit);
                    updateURL({
                      limit: newLimit,
                      page: 1,
                      query,
                      desde,
                      hasta,
                    });
                  }}
                  className="rounded-xl border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option>25</option>
                  <option>50</option>
                  <option>100</option>
                </select>
              </div>
            </div>

            <div className="xl:hidden space-y-3 bg-gray-50/50 p-3 dark:bg-gray-900/10">
              {!loading && data.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-3 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                  No hay registros de auditoría.
                </div>
              )}

              {data.map((row) => {
                const diffs = computeDiff(row.datos_anteriores, row.datos_nuevos);
                const resume = buildResume(row);
                const kind = getChangeKind(row);
                const isOpen = !!openRows[row.id];

                return (
                  <div
                    key={row.id}
                    className={`overflow-hidden rounded-2xl border shadow-sm ${changeTone(kind)}`}
                  >
                    <div className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={badge(row.accion)}>
                          {actionLabel(row.accion)}
                        </span>
                        <span className={kindBadgeClass(kind)}>
                          {kindLabel(kind)}
                        </span>
                      </div>

                      <div className="mt-3">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">
                          {row.usuario || "—"}
                        </p>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 break-words">
                          {row.fecha} · {row.ip_origen || "—"}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
                        <div className="rounded-xl border border-gray-200 bg-white/70 p-3 dark:border-gray-700 dark:bg-black/10">
                          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Tabla
                          </p>
                          <p className="mt-1 text-gray-900 dark:text-gray-100 break-words">
                            {row.tabla_afectada || "—"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white/70 p-3 dark:border-gray-700 dark:bg-black/10">
                          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            ID Registro
                          </p>
                          <p className="mt-1 break-all text-gray-900 dark:text-gray-100">
                            {row.id_registro || "—"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white/70 p-3 dark:border-gray-700 dark:bg-black/10">
                          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Resumen
                          </p>
                          <p className="mt-1 text-gray-900 dark:text-gray-100 break-words">
                            {resume}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2">
                        <button
                          onClick={() =>
                            setOpenRows((prev) => ({
                              ...prev,
                              [row.id]: !prev[row.id],
                            }))
                          }
                          className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-800/80"
                        >
                          {isOpen ? "Ocultar cambios" : `Ver cambios (${diffs.length})`}
                        </button>

                        {!!row.tabla_afectada && !!row.id_registro && (
                          <button
                            onClick={() =>
                              abrirHistorial(row.tabla_afectada!, row.id_registro!)
                            }
                            className="w-full rounded-2xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                            title="Ver historial del registro"
                          >
                            Historial
                          </button>
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t border-gray-200 bg-white/70 p-4 dark:border-gray-700 dark:bg-black/10">
                        {diffs.length === 0 ? (
                          <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                            Sin diferencias para mostrar.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {diffs.map((d) => (
                              <div
                                key={d.field}
                                className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900/40"
                              >
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">
                                  {d.field}
                                </p>

                                <div className="mt-3 grid grid-cols-1 gap-3">
                                  <DetailBox title="Antes" value={d.v1 || "—"} />
                                  <DetailBox title="Después" value={d.v2 || "—"} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden xl:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                    <tr>
                      <th className="px-6 py-3 text-left">Fecha (AR)</th>
                      <th className="px-6 py-3 text-left">Usuario</th>
                      <th className="px-6 py-3 text-left">Acción</th>
                      <th className="px-6 py-3 text-left">Tipo</th>
                      <th className="px-6 py-3 text-left">Tabla</th>
                      <th className="px-6 py-3 text-left">ID Registro</th>
                      <th className="px-6 py-3 text-left">Descripción</th>
                      <th className="px-6 py-3 text-right"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {!loading && data.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                        >
                          No hay registros de auditoría.
                        </td>
                      </tr>
                    )}

                    {data.map((row) => {
                      const isOpen = !!openRows[row.id];
                      const diffs = computeDiff(row.datos_anteriores, row.datos_nuevos);
                      const kind = getChangeKind(row);

                      return (
                        <React.Fragment key={row.id}>
                          <tr className="transition hover:bg-gray-50 dark:hover:bg-gray-900/40">
                            <td className="px-6 py-4 align-top text-gray-700 dark:text-gray-200">
                              {row.fecha || ""}
                            </td>

                            <td className="px-6 py-4 align-top">
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {row.usuario || "—"}
                              </div>
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 break-words">
                                {row.ip_origen || "—"}
                              </div>
                            </td>

                            <td className="px-6 py-4 align-top">
                              <span className={badge(row.accion)}>
                                {actionLabel(row.accion)}
                              </span>
                            </td>

                            <td className="px-6 py-4 align-top">
                              <span className={kindBadgeClass(kind)}>
                                {kindLabel(kind)}
                              </span>
                            </td>

                            <td className="px-6 py-4 align-top text-gray-700 dark:text-gray-200">
                              {row.tabla_afectada || "—"}
                            </td>

                            <td className="px-6 py-4 align-top break-all text-gray-700 dark:text-gray-200">
                              {row.id_registro || "—"}
                            </td>

                            <td className="px-6 py-4 align-top text-gray-700 dark:text-gray-200">
                              {buildResume(row) || (
                                <span className="italic text-gray-500 dark:text-gray-400">
                                  —
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4 align-top text-right space-x-2">
                              <button
                                onClick={() =>
                                  setOpenRows((prev) => ({
                                    ...prev,
                                    [row.id]: !prev[row.id],
                                  }))
                                }
                                className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-800/80"
                                aria-expanded={isOpen}
                                aria-controls={`diff-${row.id}`}
                              >
                                {isOpen ? "Ocultar" : "Ver cambios"}
                              </button>

                              {!!row.tabla_afectada && !!row.id_registro && (
                                <button
                                  onClick={() =>
                                    abrirHistorial(row.tabla_afectada!, row.id_registro!)
                                  }
                                  className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                                  title="Ver historial del registro"
                                >
                                  Historial
                                </button>
                              )}
                            </td>
                          </tr>

                          {isOpen && (
                            <tr id={`diff-${row.id}`}>
                              <td colSpan={8} className="px-6 pb-5">
                                <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
                                  <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                                    Detalle de cambios
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                      <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
                                        <tr>
                                          <th className="w-[22%] px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
                                            Campo
                                          </th>
                                          <th className="w-[39%] px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
                                            Antes
                                          </th>
                                          <th className="w-[39%] px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
                                            Después
                                          </th>
                                        </tr>
                                      </thead>

                                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {diffs.length === 0 ? (
                                          <tr>
                                            <td
                                              colSpan={3}
                                              className="px-6 py-4 text-gray-500 dark:text-gray-400"
                                            >
                                              Sin diferencias para mostrar.
                                            </td>
                                          </tr>
                                        ) : (
                                          diffs.map((d) => (
                                            <tr
                                              key={d.field}
                                              className="hover:bg-gray-50/80 dark:hover:bg-gray-800/30"
                                            >
                                              <td className="px-6 py-4 align-top">
                                                <div className="rounded-lg bg-gray-50 px-3 py-2 font-medium text-gray-900 dark:bg-gray-950/50 dark:text-gray-100 break-words">
                                                  {d.field}
                                                </div>
                                              </td>

                                              <td className="px-6 py-4 align-top">
                                                <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-3 text-gray-700 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-300 whitespace-pre-wrap break-words leading-6">
                                                  {d.v1 || "—"}
                                                </div>
                                              </td>

                                              <td className="px-6 py-4 align-top">
                                                <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words leading-6">
                                                  {d.v2 || "—"}
                                                </div>
                                              </td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <button
                disabled={page <= 1 || loading}
                onClick={() => page > 1 && setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                Anterior
              </button>

              <div className="text-sm text-gray-600 dark:text-gray-300">
                Página {page}
              </div>

              <button
                disabled={data.length < limit || loading}
                onClick={() => data.length === limit && setPage((p) => p + 1)}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                Siguiente
              </button>
            </div>
          </section>
        </div>

        <HistorialModal
          isOpen={historial.open}
          onClose={cerrarHistorial}
          tabla={historial.tabla || ""}
          idRegistro={historial.idRegistro ?? null}
        />
      </main>
    </Wrapper>
  );
}