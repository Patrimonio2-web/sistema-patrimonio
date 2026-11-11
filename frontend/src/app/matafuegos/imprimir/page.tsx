"use client";

import Image from "next/image";
import { Fragment, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import {
  obtenerMatafuegosPorAnexo,
  obtenerMatafuegosTodos,
  matafuegoMarbeteOption,
  type Matafuego,
} from "@/services/matafuegosService";

function requestedAnexo() {
  if (typeof window === "undefined") return null;
  const value = Number(new URLSearchParams(window.location.search).get("anexo"));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function formatDate(value?: string | null) {
  const iso = value?.slice(0, 10);
  const match = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "-";
}

function yesNo(value?: boolean | null) {
  if (value === true) return "Sí";
  if (value === false) return "No";
  return "-";
}

function todayLabel() {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

function statusLabel(item: Matafuego) {
  if (item.alerta === "vencido") return "Vencido";
  if (item.alerta === "vence_10") return "Vence en 10 días";
  if (item.alerta === "vence_30") return "Vence en 30 días";
  if (item.alerta === "vence_90") return "Vence en 90 días";
  if (item.alerta === "vigente") return "Vigente";
  if (item.alerta === "inactivo") return "Inactivo";
  return "Sin fecha";
}

export default function ImprimirMatafuegosPage() {
  const [items, setItems] = useState<Matafuego[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [anexoId, setAnexoId] = useState<number | null>(null);

  useEffect(() => {
    const nextAnexo = requestedAnexo();
    setAnexoId(nextAnexo);
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = nextAnexo
          ? await obtenerMatafuegosPorAnexo(nextAnexo)
          : await obtenerMatafuegosTodos();
        if (!cancelled) setItems(data);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) setError("No se pudo preparar la planilla de matafuegos.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const groups = useMemo(() => {
    const grouped = new Map<number, Matafuego[]>();
    for (const item of items) {
      const list = grouped.get(item.id_anexo) || [];
      list.push(item);
      grouped.set(item.id_anexo, list);
    }
    return [...grouped.entries()].sort(([a], [b]) => a - b);
  }, [items]);

  const summary = useMemo(
    () => ({
      total: items.length,
      vencidos: items.filter((item) => item.alerta === "vencido").length,
      proximos: items.filter((item) =>
        ["vence_10", "vence_30", "vence_90"].includes(item.alerta)
      ).length,
      sinFecha: items.filter((item) => item.alerta === "sin_fecha").length,
    }),
    [items]
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 print:bg-white">
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 8mm;
        }

        @media print {
          html,
          body {
            background: white !important;
            color: #020617 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .print-report {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            color: #020617 !important;
          }

          .annex-group {
            break-inside: avoid-page;
          }

          .fire-table thead {
            display: table-header-group;
          }

          .fire-table thead tr {
            background: #0f172a !important;
            color: #ffffff !important;
          }

          .fire-table th,
          .fire-table td {
            border-color: #475569 !important;
          }

          .fire-table tbody tr:nth-child(odd) {
            background: #e2e8f0 !important;
          }

          .fire-table td {
            color: #020617 !important;
          }

          .fire-table tr {
            break-inside: avoid;
          }
        }
      `}</style>

      <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-red-700">Matafuegos</p>
            <h1 className="text-lg font-black">Vista de impresión</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-bold hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-bold hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading || Boolean(error) || items.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          </div>
        </div>
      </header>

      <section className="print-report mx-auto my-6 w-[calc(100%-2rem)] max-w-[1600px] bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-5 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-4">
            <Image
              src="/la-rioja-logo.png"
              alt="Legislatura de La Rioja"
              width={64}
              height={80}
              unoptimized
              className="h-16 w-auto object-contain"
            />
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-600">Legislatura de la Provincia de La Rioja</p>
              <h2 className="mt-1 text-xl font-black uppercase leading-tight">
                Planillas de relevamientos de extintores portátiles de incendio
              </h2>
              <p className="mt-1 text-sm font-bold text-red-800">
                {anexoId && items[0]
                  ? `${items[0].id_anexo} - ${items[0].anexo}`
                  : "Informe general por anexos"}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right text-xs">
            <p className="font-bold">Dirección de Patrimonio</p>
            <p>Fecha: {todayLabel()}</p>
          </div>
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-slate-500">Preparando planilla...</p>
        ) : error ? (
          <p className="py-16 text-center text-sm font-bold text-red-700">{error}</p>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">No hay matafuegos para imprimir.</p>
        ) : (
          <>
            <div className="my-4 grid grid-cols-4 border border-slate-300 text-center text-xs">
              <Summary label="Total" value={summary.total} />
              <Summary label="Vencidos" value={summary.vencidos} />
              <Summary label="Próximos a vencer" value={summary.proximos} />
              <Summary label="Sin fecha" value={summary.sinFecha} />
            </div>

            <div className="space-y-5">
              {groups.map(([id, group]) => (
                <section key={id} className="annex-group">
                  <div className="flex items-end justify-between border-b border-slate-800 pb-1">
                    <div>
                      <p className="text-[9px] font-bold uppercase text-red-700">Anexo</p>
                      <h3 className="text-sm font-black uppercase">{id} - {group[0]?.anexo || "Sin nombre"}</h3>
                    </div>
                    <p className="text-xs font-bold">{group.length} matafuegos</p>
                  </div>
                  <table className="fire-table mt-2 w-full table-fixed border-collapse text-[10px] leading-snug">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <Header>ID mobiliario</Header>
                        <Header>Código</Header>
                        <Header>Ubicación</Header>
                        <Header>Vehículo</Header>
                        <Header>Tipo</Header>
                        <Header>Capacidad</Header>
                        <Header>Vencimiento</Header>
                        <Header>Estado</Header>
                      </tr>
                    </thead>
                    <tbody>
                      {group.map((item) => (<Fragment key={item.id}>
                        <tr key={item.id} className="align-top odd:bg-slate-50">
                          <Cell><strong>{item.id_mobiliario || ""}</strong></Cell>
                          <Cell>{item.codigo?.trim() || ""}</Cell>
                          <Cell>{item.subdependencia || item.ubicacion_detalle || "-"}</Cell>
                          <Cell>{item.vehiculo?.trim() || ""}</Cell>
                          <Cell>{item.tipo || "-"}</Cell>
                          <Cell>{item.capacidad || "-"}</Cell>
                          <Cell>{formatDate(item.fecha_vencimiento)}</Cell>
                          <Cell>{statusLabel(item)}</Cell>
                        </tr>
                        <tr key={`${item.id}-maintenance`} className="bg-slate-50 align-top">
                          <td colSpan={8} className="border border-slate-500 px-2 py-1.5 text-slate-950">
                            <div className="grid grid-cols-7 gap-2">
                              <PrintDetail label="Control">{formatDate(item.fecha_control)}</PrintDetail>
                              <PrintDetail label="Recarga">{formatDate(item.fecha_recarga)}</PrintDetail>
                              <PrintDetail label="Est. recarga">{item.estado_recarga || "-"}</PrintDetail>
                              <PrintDetail label="Señalización">{yesNo(item.senalizacion)}</PrintDetail>
                              <PrintDetail label="Presión">{yesNo(item.presion_adecuada)}</PrintDetail>
                              <PrintDetail label="Marbete"><PrintMarbete value={item.color_marbete} /></PrintDetail>
                              <PrintDetail label="P. hidráulica">{formatDate(item.prueba_hidraulica)}</PrintDetail>
                            </div>
                          </td>
                        </tr>
                      </Fragment>))}
                    </tbody>
                  </table>
                  {group.some((item) => item.observaciones) && (
                    <div className="mt-1 border border-slate-300 px-2 py-1 text-[10px]">
                      <strong>Observaciones: </strong>
                      {group
                        .filter((item) => item.observaciones)
                        .map((item) => `${item.codigo || item.id_mobiliario || `MF-${item.id}`}: ${item.observaciones}`)
                        .join(" | ")}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-slate-500 bg-slate-100 px-3 py-2 last:border-r-0">
      <p className="font-black uppercase text-slate-800">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function Header({ children }: { children: React.ReactNode }) {
  return <th className="border border-slate-500 px-1 py-1.5 text-left font-black uppercase">{children}</th>;
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="break-words border border-slate-500 px-1 py-1.5 font-medium text-slate-950">{children}</td>;
}

function PrintDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0 break-words"><span className="block text-[8px] font-black uppercase text-slate-600">{label}</span><span className="font-semibold">{children}</span></div>;
}

function PrintMarbete({ value }: { value?: string | null }) {
  const option = matafuegoMarbeteOption(value);
  if (!option.value) return <span>-</span>;

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block h-3 w-3 shrink-0 border border-slate-500"
        style={{ backgroundColor: option.hex }}
      />
      {option.label}
    </span>
  );
}
