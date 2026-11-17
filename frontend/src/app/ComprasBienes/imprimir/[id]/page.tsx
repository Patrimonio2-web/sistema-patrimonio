"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import {
  obtenerReporteCompras,
  type CompraBienReporte,
} from "@/services/comprasBienesService";

const MONTHS = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];

function dateLabel(value?: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year.slice(-2)}` : value;
}

export default function ImprimirComprasBienesPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const sheetRef = useRef<HTMLElement>(null);
  const autoDownloadStarted = useRef(false);
  const [report, setReport] = useState<CompraBienReporte | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    obtenerReporteCompras(Number(params.id))
      .then(setReport)
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudo cargar el reporte"
        )
      );
  }, [params.id]);

  const downloadPdf = useCallback(async () => {
    if (!report || !sheetRef.current || downloading) return;
    try {
      setDownloading(true);
      setPdfError("");
      const { default: html2pdf } = await import("html2pdf.js");
      await html2pdf()
        .set({
          margin: 0,
          filename: `compras-bienes-${report.anio}-${String(report.mes).padStart(2, "0")}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2.2,
            useCORS: true,
            backgroundColor: "#ffffff",
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"], avoid: ".purchase-row, .purchase-closing" },
        })
        .from(sheetRef.current)
        .save();
    } catch (reason) {
      console.error(reason);
      setPdfError("No se pudo generar el PDF. Intentá nuevamente.");
    } finally {
      setDownloading(false);
    }
  }, [downloading, report]);

  useEffect(() => {
    if (
      !report ||
      searchParams.get("download") !== "1" ||
      autoDownloadStarted.current
    ) {
      return;
    }
    autoDownloadStarted.current = true;
    const timer = window.setTimeout(() => void downloadPdf(), 350);
    return () => window.clearTimeout(timer);
  }, [downloadPdf, report, searchParams]);

  if (error) {
    return <main className="p-8 text-center font-bold text-red-700">{error}</main>;
  }
  if (!report) {
    return <main className="p-8 text-center font-bold">Preparando reporte...</main>;
  }

  return (
    <main className="min-h-screen overflow-x-auto bg-slate-300 py-6 text-slate-950 print:overflow-visible print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex w-[min(210mm,calc(100%-2rem))] flex-wrap items-center justify-between gap-3 rounded-md bg-white p-3 shadow">
        <button
          type="button"
          onClick={() => window.close()}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void downloadPdf()}
            disabled={downloading}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Generando..." : "Descargar PDF"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-black text-white hover:bg-cyan-800"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
        {pdfError && (
          <p className="w-full text-right text-xs font-bold text-red-700">
            {pdfError}
          </p>
        )}
      </div>

      <section
        ref={sheetRef}
        className="purchase-pdf-page mx-auto min-h-[297mm] w-[210mm] bg-white p-[4mm] shadow-xl print:shadow-none"
      >
      <article className="purchase-print-sheet min-h-[289mm] w-full border-[4px] border-double border-black bg-white p-[10mm] font-sans text-black">
        <header className="border-[3px] border-black px-4 py-3 text-center">
          <h1 className="text-[20px] font-black leading-tight">
            DIRECCIÓN DE PATRIMONIO
          </h1>
          <p className="text-[16px] font-black leading-tight">
            REPORTE DE COMPRAS DE BIENES DE USO
          </p>
          <p className="mt-1 border-t border-black pt-1 text-[13px] font-black">
            AÑO: {report.anio} · MES: {MONTHS[report.mes - 1]}
          </p>
        </header>

        <table className="mt-3 w-full table-fixed border-collapse text-[9pt] leading-tight">
          <colgroup>
            <col style={{ width: "14%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "16%" }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-100 text-black">
              <th className="border-2 border-black p-1 text-[8pt]">
                Posible ubicación
              </th>
              <th className="border-2 border-black p-1 text-[8pt]">
                Cantidad
              </th>
              <th className="border-2 border-black p-1 text-[8pt]">
                Descripción según factura
              </th>
              <th className="border-2 border-black p-1 text-[8pt]">Proveedor</th>
              <th className="border-2 border-black p-1 text-[8pt]">Valor compra (ARS)</th>
              <th className="border-2 border-black p-1 text-[8pt]">
                Fecha de factura
              </th>
              <th className="border-2 border-black p-1 text-[8pt]">
                Fecha de listado
              </th>
              <th className="border-2 border-black p-1 text-[8pt]">
                Estado según relevamiento
              </th>
            </tr>
          </thead>
          <tbody>
            {report.items?.map((item, index) => (
              <tr key={item.id ?? index} className="purchase-row break-inside-avoid">
                <td className="break-words border-2 border-black p-1 text-center font-bold uppercase">
                  {item.posible_ubicacion}
                </td>
                <td className="break-words border-2 border-black p-1 text-center font-bold">
                  {item.cantidad}
                </td>
                <td className="whitespace-pre-wrap break-words border-2 border-black p-1 text-center">
                  {item.descripcion_factura}
                </td>
                <td className="break-words border-2 border-black p-1 text-center font-semibold">
                  {item.proveedor || "-"}
                </td>
                <td className="break-words border-2 border-black p-1 text-right">
                  {item.valor_compra == null || item.valor_compra === "" ? "-" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(item.valor_compra))}
                </td>
                <td className="border-2 border-black p-1 text-center">
                  {dateLabel(item.fecha_compra)}
                </td>
                <td className="border-2 border-black p-1 text-center">
                  {dateLabel(item.fecha_listado)}
                </td>
                <td className="whitespace-pre-wrap break-words border-2 border-black p-1 text-center font-bold uppercase">
                  {item.estado_relevamiento}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="purchase-closing mt-6">
        <section className="min-h-[45mm]">
          <h2 className="border-b-2 border-black pb-1 text-[13px] font-black uppercase">
            Observaciones
          </h2>
          <div className="observation-lines mt-2 min-h-[34mm] whitespace-pre-wrap text-[11px] leading-7">
            {report.observaciones}
          </div>
        </section>

        <footer className="mt-6 grid grid-cols-[1.2fr_1fr] items-end gap-6 border-t-2 border-black pt-6 text-[12px]">
          <div className="border-r-2 border-black pr-6 text-center">
            <p className="text-[15px] font-black">PONGO EN CONOCIMIENTO</p>
            <p className="mt-2">Prosecretaría Administrativa</p>
            <p>Función Legislativa</p>
            <p>La Rioja</p>
          </div>
          <div className="space-y-9 pb-2">
            <p>
              Firma: <span className="inline-block w-[68%] border-b border-black" />
            </p>
            <p>
              Fecha: <span className="inline-block w-[68%] border-b border-black" />
            </p>
          </div>
        </footer>
        </div>
      </article>
      </section>

      <style jsx global>{`
        @page {
          size: auto;
          margin: 0;
        }

        .purchase-pdf-page,
        .purchase-pdf-page * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .observation-lines {
          background-image: repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent 25px,
            #334155 25px,
            #334155 27px
          );
        }

        @media print {
          html,
          body {
            width: 210mm;
            min-height: 297mm;
            margin: 0 !important;
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .purchase-pdf-page {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: white !important;
            box-shadow: none !important;
          }

          .purchase-print-sheet {
            width: 100% !important;
            min-height: 289mm !important;
            border: 4px double #000 !important;
            box-shadow: none !important;
            box-decoration-break: clone;
            -webkit-box-decoration-break: clone;
          }

          thead {
            display: table-header-group;
          }

          .purchase-row {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .purchase-closing {
            break-inside: avoid-page;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}
