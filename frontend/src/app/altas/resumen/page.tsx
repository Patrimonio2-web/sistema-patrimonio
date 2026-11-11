"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import { obtenerAltas, type AltaMovimiento } from "@/services/altasService";
import { obtenerRubros, type Rubro } from "@/services/nomencladorService";
import { canPreviewPlanillasAltas } from "@/services/authRole";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const money = (cents: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(cents / 100);

function centsOf(item: AltaMovimiento) {
  const calculated = Number(item.cantidad || 0) * Number(item.valor_unitario || 0);
  const amount = calculated > 0 ? calculated : Number(item.valor_total || 0);
  return Math.round((Number.isFinite(amount) ? amount : 0) * 100);
}

function rubroCode(item: AltaMovimiento) {
  return String(item.id_rubro || item.codigo_presup || "Sin rubro");
}

export default function ResumenAnualAltas() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [items, setItems] = useState<AltaMovimiento[]>([]);
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [year, setYear] = useState("");
  const [selected, setSelected] = useState<{ code: string; month: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const permitted = canPreviewPlanillasAltas();
    setAllowed(permitted);
    if (!permitted) { setLoading(false); return; }
    let active = true;
    Promise.all([obtenerAltas(), obtenerRubros().catch(() => [] as Rubro[])])
      .then(([altas, allRubros]) => {
        if (!active) return;
        setItems(altas);
        setRubros(allRubros);
        setYear((current) => current || [...new Set(altas.map((item) => item.anio_planilla).filter(Boolean))].sort().reverse()[0] || String(new Date().getFullYear()));
        setError("");
      })
      .catch(() => { if (active) setError("No se pudo cargar el resumen. Intentá nuevamente."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const years = useMemo(() => [...new Set(items.map((item) => item.anio_planilla).filter((value): value is string => Boolean(value)))].sort().reverse(), [items]);
  const yearItems = useMemo(() => items.filter((item) => item.anio_planilla === year), [items, year]);
  const rows = useMemo(() => {
    const names = new Map(rubros.map((rubro) => [String(rubro.id_rubro), rubro.nombre]));
    for (const item of yearItems) if (!names.has(rubroCode(item))) names.set(rubroCode(item), item.rubro_nombre || "Sin rubro");
    return [...names].sort(([a], [b]) => a.localeCompare(b, "es", { numeric: true })).map(([code, name]) => {
      const cells = MESES.map((month) => {
        const records = yearItems.filter((item) => rubroCode(item) === code && item.mes_planilla?.toLowerCase() === month.toLowerCase());
        return { records, cents: records.reduce((sum, item) => sum + centsOf(item), 0) };
      });
      return { code, name, cells, total: cells.reduce((sum, cell) => sum + cell.cents, 0) };
    });
  }, [rubros, yearItems]);
  const monthTotals = MESES.map((_, month) => rows.reduce((sum, row) => sum + row.cells[month].cents, 0));
  const annualTotal = monthTotals.reduce((sum, value) => sum + value, 0);
  const selectedRow = selected ? rows.find((row) => row.code === selected.code) : undefined;
  const detail = selectedRow && selected ? selectedRow.cells[selected.month] : undefined;

  if (allowed === false) return <main className="mx-auto max-w-xl p-8"><h1 className="text-xl font-bold">Resumen no disponible</h1><p className="mt-2">Tu cuenta no tiene acceso a la vista previa de altas.</p><Link className="mt-4 inline-block underline" href="/altas">Volver a Altas</Link></main>;

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 dark:bg-slate-900 dark:text-white sm:p-6 print:bg-white print:p-0 print:text-black">
      <style jsx global>{`@page { size: A4 landscape; margin: 12mm; } @media print { .summary-no-print { display: none !important; } .summary-sheet { border: 0 !important; box-shadow: none !important; padding: 0 !important; } .summary-table { font-size: 7pt !important; } .summary-table th, .summary-table td { padding: 3px 2px !important; border-color: #777 !important; } .summary-detail { break-inside: avoid; } }`}</style>
      <div className="mx-auto max-w-[1600px]">
        <div className="summary-no-print mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href="/altas" className="inline-flex items-center gap-1 text-sm font-bold text-cyan-700 dark:text-cyan-300"><ArrowLeft className="h-4 w-4" /> Volver a Altas</Link>
            <h1 className="mt-2 text-2xl font-black">Resumen anual de altas</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">Vista previa del gasto por rubro y mes.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-bold uppercase">Año<select value={year} onChange={(event) => { setYear(event.target.value); setSelected(null); }} className="mt-1 block h-10 rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white">{years.length ? years.map((value) => <option key={value} value={value}>{value}</option>) : <option value={year}>{year}</option>}</select></label>
            <button type="button" onClick={() => { setLoading(true); setReload((current) => current + 1); }} className="inline-flex h-10 items-center gap-2 rounded border border-slate-300 px-3 text-sm font-bold dark:border-slate-600"><RefreshCw className="h-4 w-4" /> Actualizar</button>
            <button type="button" onClick={() => window.print()} disabled={loading || Boolean(error)} className="inline-flex h-10 items-center gap-2 rounded bg-cyan-700 px-4 text-sm font-bold text-white disabled:opacity-50"><Printer className="h-4 w-4" /> Imprimir / PDF</button>
          </div>
        </div>
        {error ? <div role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-red-800">{error}</div> : loading ? <p className="p-6">Cargando resumen...</p> : (
          <section className="summary-sheet rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950 sm:p-6 print:rounded-none">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-slate-300 pb-3 dark:border-slate-700 print:border-black">
              <div><p className="text-xs font-bold uppercase">Dirección de Patrimonio</p><h2 className="text-xl font-black">Altas de bienes por rubro</h2></div>
              <p className="font-bold">Año {year}</p>
            </div>
            <div className="overflow-x-auto print:overflow-visible">
              <table className="summary-table w-full min-w-[1150px] border-collapse text-xs print:min-w-0">
                <thead><tr className="bg-slate-200 text-left dark:bg-slate-800 print:bg-slate-200"><th className="border border-slate-300 px-2 py-2 dark:border-slate-700">Cód.</th><th className="min-w-[165px] border border-slate-300 px-2 py-2 dark:border-slate-700">Rubro</th>{MESES.map((month) => <th key={month} className="border border-slate-300 px-2 py-2 text-right dark:border-slate-700">{month}</th>)}<th className="border border-slate-300 px-2 py-2 text-right dark:border-slate-700">Total</th></tr></thead>
                <tbody>{rows.map((row) => <tr key={row.code} className="even:bg-slate-50 dark:even:bg-slate-900 print:even:bg-white"><th scope="row" className="border border-slate-300 px-2 py-2 text-left dark:border-slate-700">{row.code}</th><td className="border border-slate-300 px-2 py-2 dark:border-slate-700">{row.name}</td>{row.cells.map((cell, month) => <td key={month} className={`border border-slate-300 px-1 py-1 text-right dark:border-slate-700 ${selected?.code === row.code && selected.month === month ? "bg-cyan-100 dark:bg-cyan-900 print:bg-white" : ""}`}><button type="button" onClick={() => setSelected({ code: row.code, month })} disabled={!cell.records.length} className="summary-no-print w-full min-w-0 py-1 text-right tabular-nums enabled:text-cyan-800 enabled:underline enabled:underline-offset-2 dark:enabled:text-cyan-300">{money(cell.cents)}</button><span className="hidden tabular-nums print:inline">{money(cell.cents)}</span></td>)}<td className="border border-slate-300 px-2 py-2 text-right font-bold tabular-nums dark:border-slate-700">{money(row.total)}</td></tr>)}</tbody>
                <tfoot><tr className="bg-slate-200 font-black dark:bg-slate-800 print:bg-slate-200"><th colSpan={2} className="border border-slate-300 px-2 py-2 text-left dark:border-slate-700">Total mensual</th>{monthTotals.map((value, month) => <td key={month} className="border border-slate-300 px-2 py-2 text-right tabular-nums dark:border-slate-700">{money(value)}</td>)}<td className="border border-slate-300 px-2 py-2 text-right tabular-nums dark:border-slate-700">{money(annualTotal)}</td></tr></tfoot>
              </table>
            </div>
            {yearItems.length === 0 && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">No hay movimientos cargados para este año.</p>}
            {detail && selectedRow && selected && <section className="summary-detail mt-6 border-t border-slate-300 pt-4 dark:border-slate-700 print:border-black"><div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><div><h3 className="font-black">{selectedRow.code} · {selectedRow.name} · {MESES[selected.month]} {year}</h3><p className="text-sm">{detail.records.length} {detail.records.length === 1 ? "carga" : "cargas"} · Total {money(detail.cents)}</p></div><button type="button" onClick={() => setSelected(null)} className="summary-no-print text-sm font-bold text-cyan-700 dark:text-cyan-300">Cerrar detalle</button></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] border-collapse text-xs print:min-w-0"><thead><tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-100"><th className="border border-slate-300 p-2 text-left">ID</th><th className="border border-slate-300 p-2 text-left">Fecha</th><th className="border border-slate-300 p-2 text-left">Concepto</th><th className="border border-slate-300 p-2 text-right">Cantidad</th><th className="border border-slate-300 p-2 text-right">Importe</th></tr></thead><tbody>{detail.records.map((item) => <tr key={item.id}><td className="border border-slate-300 p-2">{item.id}</td><td className="border border-slate-300 p-2">{item.fecha_alta?.slice(0, 10) || "-"}</td><td className="border border-slate-300 p-2">{item.concepto}</td><td className="border border-slate-300 p-2 text-right">{item.cantidad ?? "-"}</td><td className="border border-slate-300 p-2 text-right tabular-nums">{money(centsOf(item))}</td></tr>)}</tbody></table></div></section>}
          </section>
        )}
      </div>
    </main>
  );
}
