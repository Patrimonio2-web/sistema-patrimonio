import { buscarMobiliario, obtenerAnexos, obtenerSubdependenciasPorAnexo, type BuscadorItem, type FlagKey } from "./buscadorService";
import { fetchWithUser } from "./fetchWithUser";
import { answerReports } from "./patrimonioReportAnswers";

export type AssistantAnswer = {
  text: string;
  details?: Array<{ label: string; href?: string }>;
};

type Location = { id: number; name: string; annexId?: number; annexName?: string };
type AuditEvent = {
  id: number;
  fecha: string;
  usuario: string | null;
  id_registro: string | null;
  datos_anteriores: unknown;
  datos_nuevos: unknown;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
const FLAG_TERMS: Array<{ pattern: RegExp; key: FlagKey; label: string }> = [
  { pattern: /\bfaltant/, key: "faltante", label: "faltantes" },
  { pattern: /\bproblema(?:s)? (?:de )?etiquet/, key: "problema_etiqueta", label: "con problema de etiqueta" },
  { pattern: /\breparaci/, key: "para_reparacion", label: "para reparación" },
  { pattern: /\bpara baja\b/, key: "para_baja", label: "para baja" },
  { pattern: /\bsobrant/, key: "sobrante", label: "sobrantes" },
  { pattern: /\bnumero dado\b/, key: "no_dado", label: "con número dado" },
];

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function objectValue(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try { return objectValue(JSON.parse(value)); } catch { return {}; }
  }
  return {};
}

function locationFromQuestion(question: string, locations: Location[], kind: "anexo" | "subdependencia") {
  const text = normalized(question);
  const marker = kind === "anexo" ? /\banexo\s+/ : /\bsubdependencia\s+/;
  const match = marker.exec(text);
  const rest = match ? text.slice(match.index + match[0].length).replace(/^(de |del |la |el )+/, "") : text;
  const byId = locations.find((item) => rest === String(item.id) || rest.startsWith(`${item.id} `));
  if (byId) return { requested: true, location: byId };
  const matching = locations.filter((item) => {
    const name = normalized(item.name);
    const shortName = name.split(/\b(?:calle|dalmacio|copiapo|urquiza|rivadavia)\b/)[0].trim();
    return rest.includes(name) || (shortName.length >= 5 && rest.includes(shortName)) ||
      (rest.length >= 5 && name.includes(rest));
  });
  const exact = matching.filter((item) => normalized(item.name) === rest);
  const resolved = exact.length === 1 ? exact[0] : matching.length === 1 ? matching[0] : null;
  return { requested: Boolean(match || matching.length), location: resolved };
}

async function locations() {
  const annexes = await obtenerAnexos();
  return annexes.map((item) => ({ id: item.id, name: item.nombre }));
}

async function allSubdependencias(annexes: Location[]) {
  const groups = await Promise.all(annexes.map(async (annex) => {
    const subs = await obtenerSubdependenciasPorAnexo(annex.id);
    return subs.map((sub) => ({ id: sub.id, name: sub.nombre, annexId: annex.id, annexName: annex.name }));
  }));
  return groups.flat();
}

async function searchAll(params: Parameters<typeof buscarMobiliario>[0]) {
  const first = await buscarMobiliario({ ...params, page: 1, per_page: 200 });
  if (first.meta.pages > 50) throw new Error("La consulta es muy amplia. Agregá un anexo o un tipo de bien.");
  const items = [...first.items];
  for (let page = 2; page <= first.meta.pages; page++) {
    const next = await buscarMobiliario({ ...params, page, per_page: 200 });
    items.push(...next.items);
  }
  return items;
}

function assetTerm(question: string) {
  const text = normalized(question);
  const match = text.match(/(?:cuantos?|cuantas?|cantidad de|total de|hay)\s+(.+?)(?=\s+hay\b|\s+en\b|\s+del?\s+anexo\b|\s+de\s+la\s+subdependencia\b|$)/);
  if (!match) return "";
  const phrase = match[1].replace(/\b(bienes|mobiliarios|registrados|registradas|actualmente|que|con|problema|de|etiqueta|faltantes|para|reparacion|baja)\b/g, " ").replace(/\s+/g, " ").trim();
  if (!phrase) return "";
  const first = phrase.split(" ")[0];
  if (first.endsWith("es") && first.length > 5) return first.slice(0, -2);
  if (first.endsWith("s") && first.length > 4) return first.slice(0, -1);
  return first;
}

function matchesAsset(item: BuscadorItem, term: string) {
  if (!term) return true;
  return normalized(`${item.descripcion ?? ""} ${item.clase_bien ?? ""}`).includes(term);
}

async function answerCount(question: string): Promise<AssistantAnswer> {
  const annexes = await locations();
  const annex = locationFromQuestion(question, annexes, "anexo");
  if (annex.requested && !annex.location) return { text: "No pude identificar ese anexo. Indicá su nombre o ID como figura en el sistema." };
  let sub = { requested: false, location: null as Location | null };
  if (/\bsubdependencia\b/i.test(question)) {
    const subs = await allSubdependencias(annex.location ? [annex.location] : annexes);
    sub = locationFromQuestion(question, subs, "subdependencia");
    if (!sub.location) return { text: "No pude identificar esa subdependencia. Indicá su nombre o ID." };
  }
  const flag = FLAG_TERMS.find((item) => item.pattern.test(normalized(question)));
  const term = assetTerm(question);
  const items = await searchAll({
    q: term || undefined,
    search_field: "todo",
    anexo_id: annex.location?.id,
    subdependencia_id: sub.location?.id,
    flag: flag ? [flag.key] : undefined,
  });
  const matches = items.filter((item) => matchesAsset(item, term));
  const place = sub.location ? `${sub.location.name} (${sub.location.annexName})` : annex.location?.name ?? "todo el sistema";
  const subject = term ? `bienes cuya descripción o clase contiene “${term}”` : "bienes registrados";
  const status = flag ? ` ${flag.label}` : "";
  const details = /\b(cuales|cual|lista|listado|listalos|listalas|detalle|detalles|mostra|mostrame|mostralos|mostrar|ver|ids?|que bienes)\b/.test(normalized(question)) ? matches.slice(0, 8).map((item) => ({
    label: `ID ${item.id_mobiliario} · ${item.descripcion || item.clase_bien || "Sin descripción"}`,
    href: `/patrimonio/guardado/${encodeURIComponent(item.id_mobiliario)}`,
  })) : undefined;
  return { text: `Hay ${matches.length} ${subject}${status} en ${place}. Es un conteo de registros actuales, no una verificación física.`, details };
}

async function answerId(question: string): Promise<AssistantAnswer> {
  const id = normalized(question).match(/\b(?:id|bien|mobiliario)\s+(\d{1,8})\b/)?.[1];
  if (!id) return { text: "Indicá el ID del bien que querés consultar." };
  const result = await buscarMobiliario({ q: id, search_field: "id", per_page: 1 });
  const item = result.items[0];
  if (!item) return { text: `No encontré un bien con ID ${id}.` };
  return {
    text: `ID ${id}: ${item.descripcion || "Sin descripción"}. Ubicación actual: ${item.subdependencia || "Sin subdependencia"}, ${item.anexo || "sin anexo"}. Estado: ${item.estado_conservacion || "sin cargar"}${item.faltante ? ". Marcado faltante" : ""}${item.problema_etiqueta ? ". Con problema de etiqueta" : ""}.`,
    details: [{ label: "Abrir ficha del bien", href: `/patrimonio/guardado/${encodeURIComponent(id)}` }],
  };
}

async function auditEvents(since: string) {
  const all: AuditEvent[] = [];
  for (let offset = 0; offset < 2000; offset += 500) {
    const url = new URL(`${API_BASE}/auditoria`, window.location.origin);
    url.searchParams.set("tabla", "mobiliario");
    url.searchParams.set("desde", since);
    url.searchParams.set("limit", "500");
    url.searchParams.set("offset", String(offset));
    const response = await fetchWithUser(url.toString(), { cache: "no-store" });
    if (!response.ok) throw new Error("No pude consultar la auditoría con tu sesión.");
    const data = await response.json();
    const rows = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : [];
    all.push(...rows);
    if (rows.length < 500) return { events: all, truncated: false };
  }
  return { events: all, truncated: true };
}

async function answerMovements(question: string): Promise<AssistantAnswer> {
  const annexes = await locations();
  const annex = locationFromQuestion(question, annexes, "anexo");
  if (annex.requested && !annex.location) return { text: "No pude identificar ese anexo para filtrar movimientos." };
  const subs = await allSubdependencias(annexes);
  const sub = /\bsubdependencia\b/i.test(question) ? locationFromQuestion(question, subs, "subdependencia") : { requested: false, location: null };
  if (sub.requested && !sub.location) return { text: "No pude identificar esa subdependencia para filtrar movimientos." };
  const cutoff = new Date();
  if (/\bsemana\b/i.test(question)) cutoff.setDate(cutoff.getDate() - 7);
  else if (/\bmes\b/i.test(question)) cutoff.setDate(1);
  else if (!/\bhoy\b/i.test(question)) cutoff.setDate(cutoff.getDate() - 30);
  const since = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  const { events, truncated } = await auditEvents(since);
  const byId = new Map(subs.map((item) => [String(item.id), item]));
  const moves = events.flatMap((event) => {
    const before = objectValue(event.datos_anteriores);
    const after = objectValue(event.datos_nuevos);
    const fromId = String(before.ubicacion_id ?? "");
    const toId = String(after.ubicacion_id ?? "");
    if (!fromId || !toId || fromId === toId) return [];
    const from = byId.get(fromId);
    const to = byId.get(toId);
    if (annex.location && from?.annexId !== annex.location.id && to?.annexId !== annex.location.id) return [];
    if (sub.location && from?.id !== sub.location.id && to?.id !== sub.location.id) return [];
    return [{ event, from, to, description: String(after.descripcion || before.descripcion || "Bien sin descripción") }];
  });
  const place = sub.location?.name || annex.location?.name || "el sistema";
  const showDetails = /\b(cuales|cual|lista|listado|listalos|listalas|detalle|detalles|mostra|mostrame|mostralos|mostrar|ver|ids?|que bienes)\b/.test(normalized(question));
  return {
    text: `${truncated ? "Al menos " : ""}${moves.length} movimientos de ubicación registrados en ${place} desde ${since}.${truncated ? " La auditoría supera 2.000 eventos; agregá un período más corto para obtener el total exacto." : ""}`,
    details: showDetails ? moves.slice(0, 10).map(({ event, from, to, description }) => ({
      label: `ID ${event.id_registro} · ${description} · ${from?.name || "ID anterior"} → ${to?.name || "ID nuevo"} · ${event.fecha}`,
      href: event.id_registro ? `/patrimonio/guardado/${encodeURIComponent(event.id_registro)}` : undefined,
    })) : undefined,
  };
}

export async function askPatrimonio(question: string): Promise<AssistantAnswer> {
  const response = await fetchWithUser(`${API_BASE}/asistente/consulta`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    cache: "no-store",
  });
  if (response.ok) return response.json() as Promise<AssistantAnswer>;
  if (response.status !== 404) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "No se pudo consultar el asistente en este momento.");
  }

  const text = normalized(question);
  if (/\b(movimientos?|traslados?|pases?|cambios? de ubicacion|movieron|trasladaron)\b/.test(text)) return answerMovements(question);
  if (/\b(?:id|bien|mobiliario)\s+\d{1,8}\b/.test(text)) return answerId(question);
  if (/\b(reporte|reportes|compra|compras|proveedor|factura|alta|altas|matafuego|matafuegos|extintor|extintores)\b/.test(text)) return answerReports(question, text);
  if (/\b(cuantos?|cuantas?|cantidad|total|hay|faltantes|etiqueta|reparacion)\b/.test(text)) return answerCount(question);
  return { text: "No puedo verificar esa pregunta con el inventario o la auditoría. Probá preguntar por una cantidad y ubicación, un ID de bien o movimientos recientes." };
}
