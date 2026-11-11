import { fetchDashboard } from "./dashboardService";
import { listarReportesCompras, obtenerReporteCompras } from "./comprasBienesService";
import { obtenerAltas } from "./altasService";
import { obtenerMatafuegosTodos } from "./matafuegosService";
import type { AssistantAnswer } from "./patrimonioAssistantService";

const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export async function answerReports(question: string, text: string): Promise<AssistantAnswer> {
  const detailed = /\b(cuales|lista|listado|detalle|mostrar|mostra|ver)\b/.test(text);
  if (/\b(compra|compras|proveedor|factura)\b/.test(text)) {
    const reports = await listarReportesCompras();
    const month = months.findIndex((name) => text.includes(name));
    const year = text.match(/\b20\d{2}\b/)?.[0];
    const selected = reports.filter((report) => (month < 0 || report.mes === month + 1) && (!year || report.anio === Number(year)));
    const rows = selected.reduce((sum, report) => sum + Number(report.total_items || 0), 0);
    const units = selected.reduce((sum, report) => sum + Number(report.total_unidades || 0), 0);
    const summary = `${selected.length} reportes de compras${month >= 0 ? ` de ${months[month]}` : ""}${year ? ` de ${year}` : ""}, con ${rows} filas y ${units} unidades.`;
    if (!detailed && !/\b(proveedor|observaciones)\b/.test(text)) return { text: summary };
    if (selected.length > 12) return { text: `${summary} Indicá un mes y año para revisar el contenido completo.` };
    const full = await Promise.all(selected.map((report) => obtenerReporteCompras(report.id)));
    if (/\bproveedor\b/.test(text)) {
      const counts = new Map<string, number>();
      full.flatMap((report) => report.items || []).forEach((item) => {
        const name = item.proveedor?.trim() || "Sin proveedor";
        counts.set(name, (counts.get(name) || 0) + 1);
      });
      return { text: `${summary} Proveedores por filas: ${Array.from(counts).map(([name, count]) => `${name}: ${count}`).join("; ") || "ninguno"}.` };
    }
    return { text: summary, details: full.map((report) => ({
      label: `${months[report.mes - 1]} ${report.anio}: ${report.total_items} filas, ${report.total_unidades} unidades${report.observaciones ? `; observaciones: ${report.observaciones}` : ""}`,
      href: "/ComprasBienes",
    })) };
  }
  if (/\b(alta|altas)\b/.test(text)) {
    const year = text.match(/\b20\d{2}\b/)?.[0];
    const data = await obtenerAltas(year ? { anio: year } : {});
    const units = data.reduce((sum, row) => sum + Number(row.cantidad || 0), 0);
    return { text: `${data.length} movimientos de alta${year ? ` en ${year}` : ""}, con ${units} unidades registradas.`, details: detailed ? data.slice(0, 8).map((row) => ({ label: `${row.fecha_alta || "Sin fecha"}: ${row.concepto || "Sin concepto"}, ${row.cantidad || 0} unidades`, href: "/altas" })) : undefined };
  }
  if (/\b(matafuego|matafuegos|extintor|extintores)\b/.test(text)) {
    const data = await obtenerMatafuegosTodos();
    const expired = data.filter((row) => row.alerta === "vencido");
    return { text: `${data.length} matafuegos registrados, ${data.filter((row) => row.estado === "activo").length} activos y ${expired.length} vencidos.`, details: detailed ? data.slice(0, 8).map((row) => ({ label: `ID ${row.id_mobiliario || row.id}: ${row.anexo}, ${row.subdependencia || "sin subdependencia"}; ${row.alerta}`, href: "/matafuegos" })) : undefined };
  }
  const dashboard = await fetchDashboard();
  return { text: `Reportes actuales: ${dashboard.kpis.mobiliario} bienes, ${dashboard.kpis.anexos} anexos, ${dashboard.kpis.subdependencias} subdependencias y ${dashboard.kpis.altas} altas. Alertas: ${dashboard.alertas?.faltantes ?? 0} faltantes, ${dashboard.alertas?.para_baja ?? 0} para baja y ${dashboard.alertas?.para_reparacion ?? 0} para reparación.`, details: [{ label: "Abrir reportes", href: "/reportes" }] };
}
