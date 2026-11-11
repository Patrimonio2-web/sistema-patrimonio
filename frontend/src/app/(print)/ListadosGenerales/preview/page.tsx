//  src/app/(print)/ListadosGenerales/preview/page.tsx 
"use client";

import Image from "next/image";
import { Fragment, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import {
  generarListadoJson,
  type ListadoResponse,
} from "@/services/listadosService";

const logoUrl =
  "https://res.cloudinary.com/dqsacd9ez/image/upload/v1762866358/logo_legislatura_wgtwjy.jpg";

const PDF_MARGIN_MM: [number, number, number, number] = [10, 10, 10, 10];
const PDF_LEGAL_SIZE_PT = {
  width: 612,
  height: 1008,
};
const MM_PER_POINT = 25.4 / 72;
const CSS_PX_PER_MM = 96 / 25.4;
const PDF_PAGE_GUARD_PX = 8;

const pdfInnerSizePx = {
  width: Math.floor(
    (PDF_LEGAL_SIZE_PT.width * MM_PER_POINT -
      PDF_MARGIN_MM[1] -
      PDF_MARGIN_MM[3]) *
      CSS_PX_PER_MM
  ),
  height: Math.floor(
    (PDF_LEGAL_SIZE_PT.height * MM_PER_POINT -
      PDF_MARGIN_MM[0] -
      PDF_MARGIN_MM[2]) *
      CSS_PX_PER_MM
  ),
};

function waitForLayout() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function getListadoItemKey(
  rubroId: number | null,
  claseId: number | null,
  itemId: string
) {
  return `item-${rubroId}-${claseId}-${itemId}`;
}

function getLastListadoItemKey(data: ListadoResponse) {
  for (let r = data.grupos.length - 1; r >= 0; r -= 1) {
    const rubro = data.grupos[r];

    for (let c = rubro.clases.length - 1; c >= 0; c -= 1) {
      const clase = rubro.clases[c];
      const lastItem = clase.items[clase.items.length - 1];

      if (lastItem) {
        return getListadoItemKey(
          rubro.rubro_id,
          clase.clase_id,
          lastItem.id
        );
      }
    }
  }

  return null;
}

function getNextTableRow(row: HTMLTableRowElement) {
  let next = row.nextElementSibling;

  while (next && !next.matches("tr:not(.pdf-page-spacer)")) {
    next = next.nextElementSibling;
  }

  return next as HTMLTableRowElement | null;
}

function getRowsToKeepTogether(row: HTMLTableRowElement) {
  const rows = [row];

  if (row.classList.contains("keep-with-next")) {
    const nextRow = getNextTableRow(row);

    if (nextRow) {
      rows.push(nextRow);
    }
  }

  return rows;
}

function insertPdfSpacerBefore(row: HTMLTableRowElement, height: number) {
  const spacerRow = document.createElement("tr");
  const spacerCell = document.createElement("td");
  const table = row.closest("table");
  const columnCount =
    table?.querySelectorAll("colgroup col").length ||
    Array.from(row.cells).reduce((total, cell) => total + cell.colSpan, 0) ||
    1;

  spacerRow.className = "pdf-page-spacer";
  spacerCell.colSpan = columnCount;
  spacerCell.style.height = `${Math.max(height, 0)}px`;
  spacerCell.style.padding = "0";
  spacerCell.style.border = "0";
  spacerCell.style.lineHeight = "0";
  spacerCell.style.fontSize = "0";
  spacerCell.innerHTML = "&nbsp;";
  spacerRow.appendChild(spacerCell);
  row.parentNode?.insertBefore(spacerRow, row);
}

function paginatePdfTables(root: HTMLElement) {
  const rows = Array.from(
    root.querySelectorAll<HTMLTableRowElement>("tbody > tr:not(.pdf-page-spacer)")
  );

  rows.forEach((row) => {
    const rowsToKeep = getRowsToKeepTogether(row);
    const firstRect = rowsToKeep[0].getBoundingClientRect();
    const lastRect = rowsToKeep[rowsToKeep.length - 1].getBoundingClientRect();
    const blockTop = firstRect.top;
    const blockBottom = lastRect.bottom;
    const blockHeight = blockBottom - blockTop;

    if (blockHeight >= pdfInnerSizePx.height) {
      return;
    }

    const pageEnd =
      (Math.floor(blockTop / pdfInnerSizePx.height) + 1) *
      pdfInnerSizePx.height;

    if (blockBottom + PDF_PAGE_GUARD_PX > pageEnd) {
      insertPdfSpacerBefore(
        row,
        pageEnd - blockTop + PDF_PAGE_GUARD_PX
      );
    }
  });
}

async function createPdfExportClone(source: HTMLDivElement) {
  const host = document.createElement("div");
  const clone = source.cloneNode(true) as HTMLDivElement;

  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = `${pdfInnerSizePx.width}px`;
  host.style.visibility = "hidden";
  host.style.pointerEvents = "none";
  host.style.background = "#ffffff";

  host.appendChild(clone);
  document.body.appendChild(host);

  await waitForLayout();
  paginatePdfTables(clone);
  await waitForLayout();

  return {
    clone,
    cleanup: () => host.remove(),
  };
}

export default function PreviewListadoPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ListadoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const pdfRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadListado = async () => {
      try {
        setLoading(true);

        const filtros = searchParams.getAll("filtros");

        const response = await generarListadoJson({
          anexo: searchParams.get("anexo") || "todos",
          subdependencia: searchParams.get("subdependencia") || "todas",
          rubro: searchParams.get("rubro") || "",
          clase: searchParams.get("clase") || "",
          estado_conservacion: searchParams.get("estado_conservacion") || "",
          tipo_listado:
            (searchParams.get("tipo_listado") as "clasico" | "entrega") ||
            "clasico",
          filtros,
          incluir_faltantes:
            searchParams.get("incluir_faltantes") === "true",
        });

        setData(response);
      } catch {
        toast.error("Error al generar el listado");
      } finally {
        setLoading(false);
      }
    };

    loadListado();
  }, [searchParams]);

  const handleDescargarPdf = async () => {
    if (!pdfRef.current || !data) {
      toast.error("No hay contenido disponible para exportar");
      return;
    }

    let cleanupPdfClone: (() => void) | null = null;

    try {
      setDownloadingPdf(true);

      const { default: html2pdf } = await import("html2pdf.js");

      const tipoNombre =
        data.tipo_listado === "entrega" ? "listado-entrega" : "listado-clasico";

      const anexoNombre = (data.anexo_nombre || "anexo")
        .toString()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]/g, "");

      const subdependenciaNombre = (
        data.subdependencia_nombre || "subdependencia"
      )
        .toString()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]/g, "");

      const fechaNombre = (data.fecha_emision || "fecha")
        .toString()
        .replace(/\//g, "-")
        .replace(/\s+/g, "-");

      const filename = `${tipoNombre}-${anexoNombre}-${subdependenciaNombre}-${fechaNombre}.pdf`;

      const { clone, cleanup } = await createPdfExportClone(pdfRef.current);
      cleanupPdfClone = cleanup;

      await html2pdf()
        .set({
          margin: PDF_MARGIN_MM,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
          },
          jsPDF: {
            unit: "mm",
            format: "legal",
            orientation: "portrait",
          },
          pagebreak: {
            mode: ["legacy"],
            avoid:
              ".footer-block, .signature-block",
          },
        })
        .from(clone)
        .save();

      cleanupPdfClone();
      cleanupPdfClone = null;

      toast.success("PDF generado correctamente");
    } catch {
      toast.error("No se pudo descargar el PDF");
    } finally {
      cleanupPdfClone?.();
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600 text-lg">Generando listado...</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-red-600 text-lg">No se pudo generar el listado.</p>
      </main>
    );
  }

  const isEntrega = data.tipo_listado === "entrega";
  const totalCols = isEntrega ? 2 : 4;
  const lastItemKey = isEntrega ? null : getLastListadoItemKey(data);

  return (
    <>
      <Toaster />

      <style jsx global>{`
        .avoid-break,
        .footer-block,
        .signature-block {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .keep-with-next {
          break-after: avoid;
          page-break-after: avoid;
        }

        table {
          page-break-inside: auto;
        }

        tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .classic-print-total-row {
          display: none;
        }

        @media print {
          @page {
            size: legal;
            margin: 10mm;
          }

          html,
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-toolbar {
            display: none !important;
          }

          .print-container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-repeat-header {
            display: table-row !important;
          }

          .signature-block {
            break-inside: avoid;
            page-break-inside: avoid;
            page-break-before: auto;
            margin-top: 28px !important;
          }

          .footer-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .classic-print-footer {
            display: none !important;
          }

          .classic-print-total-row {
            display: table-row !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          thead {
            display: table-header-group;
          }
        }

        @media screen {
          .print-repeat-header {
            display: none !important;
          }
        }
      `}</style>

      <main className="bg-white min-h-screen text-black">
        <div className="print-toolbar sticky top-0 z-20 bg-white border-b px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">Vista previa del listado</h1>
            <p className="text-sm text-gray-600">
              Tipo: {isEntrega ? "Listado de entrega" : "Cl\u00e1sico"}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={() => {
                window.location.href = "/ListadosGenerales";
              }}
              className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
            >
              Volver
            </button>

            <button
              onClick={handleDescargarPdf}
              disabled={downloadingPdf}
              className={`px-4 py-2 rounded text-white ${
                downloadingPdf
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {downloadingPdf ? "Generando PDF..." : "Descargar PDF"}
            </button>

            <button
              onClick={() => {
                window.print();
              }}
              className="px-4 py-2 rounded bg-teal-600 text-white hover:bg-teal-700"
            >
              Imprimir
            </button>
          </div>
        </div>

        <div
          ref={pdfRef}
          className="print-container max-w-[1100px] mx-auto px-6 py-8 bg-white"
        >
          <div className="relative text-center mb-5">
            <Image
              src={logoUrl}
              alt="Logo"
              width={80}
              height={80}
              priority
              className="mx-auto mb-2 h-auto w-20"
            />
            <h1 className="text-[18px] font-bold">
              LEGISLATURA DE LA PROVINCIA DE LA RIOJA
            </h1>
            <p className="text-[14px]">
              {isEntrega
                ? "Listado General de Bienes Muebles"
                : "Inventario de Bienes Muebles"}
            </p>
          </div>

          <div className="border-t-2 border-black mb-4" />

          <div className="mb-5 text-[14px] leading-6">
            <p>
              <strong>Anexo:</strong>{" "}
              {data.anexo_id
                ? `${data.anexo_id} - ${data.anexo_nombre}`
                : data.anexo_nombre}
            </p>
            <p>
              <strong>Subdependencia:</strong>{" "}
              {data.subdependencia_id
                ? `${data.subdependencia_id} - ${data.subdependencia_nombre}`
                : data.subdependencia_nombre}
            </p>
            <p>
              <strong>{"Fecha de emisi\u00f3n:"}</strong> {data.fecha_emision}
            </p>
          </div>

          {!isEntrega && (
            <div className="mb-5 border border-black bg-gray-100 px-4 py-3 text-center text-[12px] font-semibold uppercase tracking-wide">
              {"Documento de control interno. No v\u00e1lido como constancia de entrega."}
            </div>
          )}

          <table className="w-full border-collapse table-fixed text-[13px]">
            <colgroup>
              <col style={{ width: isEntrega ? "10%" : "12%" }} />
              <col style={{ width: isEntrega ? "90%" : "57%" }} />
              {!isEntrega && <col style={{ width: "15%" }} />}
              {!isEntrega && <col style={{ width: "16%" }} />}
            </colgroup>

            <thead>
              <tr className="print-repeat-header">
                <th
                  colSpan={totalCols}
                  className="border border-black bg-white px-2 py-2 text-left align-top"
                >
                  <div className="text-[12px] leading-5">
                    <p>
                      <strong>Anexo:</strong>{" "}
                      {data.anexo_id
                        ? `${data.anexo_id} - ${data.anexo_nombre}`
                        : data.anexo_nombre}
                    </p>
                    <p>
                      <strong>Subdependencia:</strong>{" "}
                      {data.subdependencia_id
                        ? `${data.subdependencia_id} - ${data.subdependencia_nombre}`
                        : data.subdependencia_nombre}
                    </p>
                    <p>
                      <strong>{"Fecha de emisi\u00f3n:"}</strong> {data.fecha_emision}
                    </p>
                    {!isEntrega && (
                      <p className="mt-2 font-semibold uppercase">
                        {"Documento de control interno. No v\u00e1lido como constancia de entrega o recepci\u00f3n."}
                      </p>
                    )}
                  </div>
                </th>
              </tr>

              <tr>
                <th className="border border-black bg-gray-100 px-2 py-2 text-left uppercase align-middle">
                  ID
                </th>
                <th className="border border-black bg-gray-100 px-2 py-2 text-left uppercase align-middle">
                  {"Descripci\u00f3n"}
                </th>
                {!isEntrega && (
                  <>
                    <th className="border border-black bg-gray-100 px-2 py-2 text-center uppercase align-middle">
                      {"Estado de conservaci\u00f3n"}
                    </th>
                    <th className="border border-black bg-gray-100 px-2 py-2 text-center uppercase align-middle whitespace-nowrap">
                      Observaciones
                    </th>
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {data.grupos.length > 0 ? (
                data.grupos.map((rubro) => (
                  <Fragment
                    key={`rubro-${rubro.rubro_id}-${rubro.rubro_nombre}`}
                  >
                    <tr className="avoid-break keep-with-next">
                      <td
                        colSpan={totalCols}
                        className="border border-black bg-gray-200 font-bold uppercase px-2 py-2"
                      >
                        RUBRO: <strong>{rubro.rubro_id ?? "-"}</strong> -{" "}
                        {rubro.rubro_nombre}
                      </td>
                    </tr>

                    {rubro.clases.map((clase) => (
                      <Fragment
                        key={`clase-${rubro.rubro_id}-${clase.clase_id}-${clase.clase_nombre}`}
                      >
                        <tr className="avoid-break keep-with-next">
                          <td
                            colSpan={totalCols}
                            className="border border-black bg-gray-100 font-semibold px-5 py-2"
                          >
                            Clase: <strong>{clase.clase_id ?? "-"}</strong> -{" "}
                            {clase.clase_nombre}
                          </td>
                        </tr>

                        {clase.items.map((item) => {
                          const itemKey = getListadoItemKey(
                            rubro.rubro_id,
                            clase.clase_id,
                            item.id
                          );

                          return (
                            <tr
                              key={itemKey}
                              className={`avoid-break ${
                                itemKey === lastItemKey ? "keep-with-next" : ""
                              }`}
                            >
                              <td className="border border-black px-2 py-2 align-top">
                                {item.id}
                              </td>
                              <td className="border border-black px-2 py-2 align-top">
                                {item.descripcion}
                              </td>

                              {!isEntrega && (
                                <>
                                  <td className="border border-black px-2 py-2 align-top">
                                    {item.estado_conservacion || ""}
                                  </td>
                                  <td className="border border-black px-2 py-2 align-top break-words whitespace-normal text-[12px] leading-tight">
                                    {item.observaciones.join(", ")}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                  </Fragment>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={totalCols}
                    className="text-center text-gray-500 border border-black px-4 py-6"
                  >
                    No se encontraron bienes con los filtros aplicados.
                  </td>
                </tr>
              )}

              {!isEntrega && (
                <tr className="classic-print-total-row avoid-break">
                  <td
                    colSpan={totalCols}
                    className="border border-black px-2 py-2 text-right text-[12px] font-bold"
                  >
                    Total de bienes listados: {data.total_bienes}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div
            className={`footer-block mt-8 border-t border-gray-400 pt-5 ${
              !isEntrega ? "classic-print-footer" : ""
            }`}
          >
            <div className="flex justify-end">
              <p className="mb-16 font-bold text-right text-[15px]">
                Total de bienes listados: {data.total_bienes}
              </p>
            </div>

            {isEntrega && (
              <div className="signature-block mt-0 flex justify-between text-[13px]">
                <div className="w-[45%] text-center">
                  <div className="mx-auto w-[85%] border-t-2 border-black pt-2 font-medium">
                    {"Responsable del \u00c1rea"}
                  </div>
                  <p className="mt-1 text-[11px] text-gray-700">
                    {"Aclaraci\u00f3n y fecha"}
                  </p>
                </div>
                <div className="w-[45%] text-center">
                  <div className="mx-auto w-[85%] border-t-2 border-black pt-2 font-medium">
                    Patrimonio
                  </div>
                  <p className="mt-1 text-[11px] text-gray-700">
                    {"Aclaraci\u00f3n y fecha"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
