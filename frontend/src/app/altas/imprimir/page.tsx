"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { ArrowLeft, FileText, Printer, RefreshCw } from "lucide-react";
import { canPreviewPlanillasAltas, isSuperAdmin } from "@/services/authRole";
import {
  obtenerAltas,
  type AltaMovimiento,
} from "@/services/altasService";

const RUBRO_GENERAL: Record<string, string> = {
  "43": "MAQUINARIA Y EQUIPO",
  "44": "INMUEBLES",
  "45": "VEHICULOS",
  "46": "MOBILIARIO",
  "47": "EQUIPO DE COMUNICACIONES",
  "48": "ACTIVO INTANGIBLE",
};

function getParam(name: string) {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) || "";
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return String(value);
  return new Intl.DateTimeFormat("es-AR").format(new Date(year, month - 1, day));
}

function formatMoney(value?: number | null) {
  const parsed = Number(value || 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function itemValorTotal(item: AltaMovimiento) {
  const cantidad = Number(item.cantidad || 0);
  const unitario = Number(item.valor_unitario || 0);
  const calculado = cantidad * unitario;
  return Number.isFinite(calculado) && calculado > 0 ? calculado : Number(item.valor_total || 0);
}

function formatClaseAlta(item: Pick<AltaMovimiento, "id_clase" | "clase_nombre">) {
  if (item.id_clase === null || item.id_clase === undefined || Number(item.id_clase) === 0) {
    return "0000";
  }
  return String(item.id_clase);
}

function todayLabel() {
  return new Intl.DateTimeFormat("es-AR").format(new Date());
}

function rubroCodigo(item: AltaMovimiento) {
  const raw = String(item.codigo_presup || item.id_rubro || "").replace(/\D/g, "");
  return raw || "000";
}

function rubroGrupoLabel(codigo: string) {
  const clean = codigo.padEnd(2, "0").slice(0, 2);
  return `${clean[0] || "0"}.${clean[1] || "0"}.`;
}

function subrubroLabel(codigo: string) {
  const clean = codigo.replace(/\D/g, "");
  if (clean.length >= 3) return `${clean[0]}.${clean[1]}.${clean[2]}.`;
  if (clean.length >= 2) return `${clean[0]}.${clean[1]}.`;
  return clean;
}

function groupRecords(registros: AltaMovimiento[]) {
  const sorted = [...registros].sort((a, b) => {
    const codeA = rubroCodigo(a);
    const codeB = rubroCodigo(b);
    if (codeA !== codeB) return codeA.localeCompare(codeB, "es-AR", { numeric: true });
    const claseA = String(a.id_clase || "");
    const claseB = String(b.id_clase || "");
    if (claseA !== claseB) return claseA.localeCompare(claseB, "es-AR", { numeric: true });
    return String(a.fecha_alta || "").localeCompare(String(b.fecha_alta || ""));
  });

  return sorted.reduce<Record<string, Record<string, AltaMovimiento[]>>>((acc, item) => {
    const code = rubroCodigo(item);
    const grupo = code.slice(0, 2).padEnd(2, "0");
    const sub = code;
    acc[grupo] = acc[grupo] || {};
    acc[grupo][sub] = acc[grupo][sub] || [];
    acc[grupo][sub].push(item);
    return acc;
  }, {});
}

function groupEntries(grouped: Record<string, Record<string, AltaMovimiento[]>>) {
  return Object.entries(grouped).flatMap(([grupo, subrubros]) => [
    { kind: "grupo" as const, grupo, subrubros },
    ...Object.entries(subrubros).flatMap(([subrubro, items]) => [
      { kind: "subrubro" as const, subrubro, items },
      ...items.map((item) => ({ kind: "item" as const, item })),
    ]),
  ]);
}

export default function ImprimirAltasPage() {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [canPrint, setCanPrint] = useState(false);
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("");
  const [registros, setRegistros] = useState<AltaMovimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const grouped = useMemo(() => groupRecords(registros), [registros]);
  const rows = useMemo(() => groupEntries(grouped), [grouped]);
  const total = useMemo(
    () => registros.reduce((acc, item) => acc + itemValorTotal(item), 0),
    [registros]
  );

  useEffect(() => {
    const previewOnly = getParam("preview") === "1";
    setAllowed(canPreviewPlanillasAltas());
    setCanPrint(isSuperAdmin() && !previewOnly);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !allowed) return;

    const nextMes = getParam("mes");
    const nextAnio = getParam("anio");
    setMes(nextMes);
    setAnio(nextAnio);

    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await obtenerAltas({ mes: nextMes, anio: nextAnio });
        if (!ignore) setRegistros(data);
      } catch (err) {
        console.error(err);
        if (!ignore) setError("No se pudieron cargar las altas para imprimir.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [allowed, ready]);

  useEffect(() => {
    if (!loading && !error && canPrint && getParam("autoprint") === "1") {
      const id = window.setTimeout(() => window.print(), 350);
      return () => window.clearTimeout(id);
    }
  }, [canPrint, error, loading]);

  if (!ready) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 text-black">
        <section className="mx-auto max-w-3xl rounded-md bg-white p-6 shadow-sm">Cargando...</section>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 text-black">
        <section className="mx-auto max-w-3xl rounded-md bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase text-cyan-700">Planillas - Altas</p>
          <h1 className="mt-2 text-2xl font-black">Vista de impresion bloqueada</h1>
          <p className="mt-3 text-sm text-slate-600">
            Dante no tiene acceso a la vista previa de planillas de altas.
          </p>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-black print:bg-white">
      <style jsx global>{`
        @page {
          size: legal landscape;
          margin: 0.4in 0.24in 0.4in 0.24in;
        }

        @media print {
          html,
          body {
            background: #fff !important;
          }

          .no-print {
            display: none !important;
          }

          .print-sheet {
            box-sizing: border-box !important;
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
          }

          .official-table thead {
            display: table-header-group;
          }

          .official-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .screen-only-column {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-cyan-700">Planillas - Altas</p>
            <h1 className="text-lg font-black">Vista de impresión oficial</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
            {canPrint ? (
              <>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white hover:bg-cyan-800"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </button>
              </>
            ) : (
              <span className="inline-flex h-10 items-center rounded-md border border-cyan-200 bg-cyan-50 px-4 text-sm font-black text-cyan-800">
                Solo vista previa
              </span>
            )}
          </div>
        </div>
      </div>

      <section className="print-sheet box-border mx-auto my-6 min-h-[8.5in] w-[13.52in] bg-white px-[0.08in] py-6 shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-sm text-slate-500">Cargando...</div>
        ) : error ? (
          <div className="py-20 text-center text-sm text-red-700">{error}</div>
        ) : (
          <>
            <table className="official-table w-full border-collapse table-fixed font-sans text-[10.25px] font-bold leading-[1.2]">
              <colgroup>
                <col style={{ width: "5.1%" }} />
                <col style={{ width: "5.1%" }} />
                <col style={{ width: "3.6%" }} />
                <col style={{ width: "26.8%" }} />
                <col style={{ width: "15.8%" }} />
                <col style={{ width: "7.4%" }} />
                <col style={{ width: "8.5%" }} />
                <col style={{ width: "11.7%" }} />
                <col style={{ width: "4.7%" }} />
                <col style={{ width: "5.7%" }} />
                <col className="screen-only-column" style={{ width: "5.6%" }} />
              </colgroup>
              <thead>
                <tr>
                  <td colSpan={11} className="relative h-[66px] border-0">
                    <div className="absolute left-[0.08in] top-[-3px] flex w-[0.78in] flex-col items-center text-center">
                      <Image
                        src="/la-rioja-logo.png"
                        alt="La Rioja"
                        width={48}
                        height={63}
                        unoptimized
                        className="h-[0.47in] w-auto object-contain"
                      />
                      <div className="mt-[1px] text-[7.4px] font-black uppercase leading-[1.02]">
                        <div>Funcion Legislativa</div>
                        <div>La Rioja</div>
                      </div>
                    </div>
                    <div className="absolute left-0 right-0 top-0 text-center text-[18px] font-black leading-tight">
                      MOVIMIENTOS DE ALTAS DE BIENES MUEBLES
                    </div>
                    <div className="absolute left-0 right-0 top-[21px] text-center text-[14px] font-black leading-tight">
                      {(mes || "MES").toUpperCase()} {anio || ""}
                    </div>
                    <div className="absolute right-[0.45in] top-[19px] text-left text-[10.4px] font-bold leading-tight">
                      <div>Fecha de Presentación : {todayLabel()}</div>
                      <div>Codificación Básica: 2.0.000.</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="h-[4px] border-0" colSpan={11} />
                </tr>
                <tr className="h-[40px] align-middle">
                  <HeaderCell>Nro. ORDEN</HeaderCell>
                  <HeaderCell>FECHA ALTAS</HeaderCell>
                  <HeaderCell>CANT.</HeaderCell>
                  <HeaderCell>CONCEPTO</HeaderCell>
                  <HeaderCell>DISPOSICION ADMINISTRATIVA FECHA</HeaderCell>
                  <HeaderCell>VALOR UNITARIO</HeaderCell>
                  <HeaderCell>VALOR TOTAL</HeaderCell>
                  <HeaderCell>CAUSAS DE ALTA</HeaderCell>
                  <HeaderCell>CODIGO PRESUP.</HeaderCell>
                  <HeaderCell>CLASE</HeaderCell>
                  <HeaderCell className="screen-only-column">IDENTIDAD</HeaderCell>
                </tr>
              </thead>
              <tbody>
                <PrintRows rows={rows} />
                <tr className="h-[8px]">
                  <td colSpan={10} className="border-0" />
                  <td className="screen-only-column border-0" />
                </tr>
                <tr className="h-[20px]">
                  <td colSpan={4} className="border-0 text-center text-[12.5px] font-black">
                    TOTAL GENERAL
                  </td>
                  <td colSpan={2} className="border-0" />
                  <td className="border-0 text-right text-[12.5px] font-black">{formatMoney(total)}</td>
                  <td colSpan={3} className="border-0" />
                  <td className="screen-only-column border-0" />
                </tr>
              </tbody>
            </table>
          </>
        )}
      </section>
    </main>
  );
}

function HeaderCell({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th className={`border border-black bg-slate-100 px-[6px] py-[4.5px] text-center text-[9.4px] font-black uppercase leading-[1.12] ${className}`}>
      {children}
    </th>
  );
}

function PrintRows({ rows }: { rows: ReturnType<typeof groupEntries> }) {
  let order = 0;

  return (
    <>
      {rows.map((row) => {
        if (row.kind === "grupo") {
          const general = RUBRO_GENERAL[row.grupo] || "SIN RUBRO";
          return (
            <tr key={`grupo-${row.grupo}`} className="h-[17px]">
              <td colSpan={3} className="border border-black px-[6px] py-[1.5px] text-[11.3px] font-black tracking-[0.015em]">
                RUBRO&nbsp;&nbsp;&nbsp;&nbsp; {rubroGrupoLabel(row.grupo)} ...
              </td>
              <td colSpan={7} className="border border-black px-[6px] py-[1.5px] text-[11.3px] font-black tracking-[0.015em]">
                {general}
              </td>
              <td className="screen-only-column border border-black" />
            </tr>
          );
        }

        if (row.kind === "subrubro") {
          const name = row.items[0]?.rubro_nombre || "SIN RUBRO";
          return (
            <tr key={`subrubro-${row.subrubro}`} className="h-[19px]">
              <td colSpan={3} className="border border-black" />
              <td colSpan={7} className="border border-black px-[6px] py-[2px] text-[11.5px] font-black tracking-[0.015em]">
                {subrubroLabel(row.subrubro)} {name.toUpperCase()}
              </td>
              <td className="screen-only-column border border-black" />
            </tr>
          );
        }

        order += 1;
        const item = row.item;

        return (
          <tr key={item.id} className="min-h-[17px] align-middle">
            <BodyCell align="center">{order}</BodyCell>
            <BodyCell align="center">{formatDate(item.fecha_alta)}</BodyCell>
            <BodyCell align="center">{item.cantidad}</BodyCell>
            <BodyCell>{item.concepto}</BodyCell>
            <BodyCell>{item.disposicion}</BodyCell>
            <BodyCell align="right">{formatMoney(item.valor_unitario)}</BodyCell>
            <BodyCell align="right">{formatMoney(itemValorTotal(item))}</BodyCell>
            <BodyCell>{item.causa_alta}</BodyCell>
            <BodyCell align="center">{item.codigo_presup}</BodyCell>
            <BodyCell align="center">{formatClaseAlta(item)}</BodyCell>
            <BodyCell className="screen-only-column">{item.identidad}</BodyCell>
          </tr>
        );
      })}
    </>
  );
}

function BodyCell({
  children,
  align = "left",
  className = "",
}: {
  children?: ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  const alignClass =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return (
    <td className={`border border-black px-[6px] py-[3.5px] align-middle font-semibold leading-[1.18] ${alignClass} ${className}`}>
      {children}
    </td>
  );
}
