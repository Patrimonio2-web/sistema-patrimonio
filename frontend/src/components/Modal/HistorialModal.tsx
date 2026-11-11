// components/Modal/HistorialModal.tsx
"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  fetchHistorialPorRegistro,
  type AuditoriaRow,
} from "@/services/auditoriaService";

interface HistorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabla: string;
  idRegistro: string | number | null;
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

const FIELD_LABELS: Record<string, string> = {
  historial_movimientos: "Historial de movimientos",
  sobrante: "Sobrante",
  faltante: "Faltante",
  para_baja: "Para baja",
  para_reparacion: "Para reparación",
  problema_etiqueta: "Problema de etiqueta",
  no_dado: "Número dado",
  privado: "Privado",
  ubicacion_id: "Ubicación",
  anexo: "Anexo",
  anexo_nombre: "Anexo",
  subdependencia: "Subdependencia",
  subdependencia_nombre: "Subdependencia",
  descripcion: "Descripción",
  estado_conservacion: "Estado de conservación",
  comentarios: "Comentarios",
  vehiculo: "Vehículo",
  foto_url: "Foto",
  fecha_resolucion: "Fecha de resolución",
  resolucion: "Resolución",
  valor: "Valor",
};

function fieldLabel(field: string) {
  return (
    FIELD_LABELS[field] ||
    field
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function isBooleanLike(value: unknown) {
  if (typeof value === "boolean") return true;
  if (typeof value !== "string") return false;
  return ["true", "false"].includes(value.trim().toLowerCase());
}

function formatBoolean(value: unknown) {
  const normalized =
    typeof value === "boolean" ? value : String(value).trim().toLowerCase() === "true";
  return normalized ? "Sí" : "No";
}

function rawToText(value: unknown) {
  if (value == null) return "";
  if (isBooleanLike(value)) return formatBoolean(value);
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function historyLines(value: unknown) {
  return rawToText(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function addedHistoryLines(before: unknown, after: unknown) {
  const beforeLines = historyLines(before);
  const afterLines = historyLines(after);
  let index = 0;

  while (
    index < beforeLines.length &&
    index < afterLines.length &&
    beforeLines[index] === afterLines[index]
  ) {
    index += 1;
  }

  return afterLines.slice(index);
}

type Movement = {
  date?: string;
  from: string;
  to: string;
  line: string;
};

type LocationEntry = {
  location: string;
  date?: string;
};

function parseMovementLine(line: string): Movement | null {
  const match = line.match(
    /(?:\[([^\]]+)\]\s*)?Cambio de ubicaci[oó]n:\s*de\s*'([^']*)'\s*a\s*'([^']*)'/i
  );

  if (!match) return null;

  return {
    date: match[1]?.trim(),
    from: match[2].trim(),
    to: match[3].trim(),
    line,
  };
}

function findLastMovement(lines: string[]) {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const movement = parseMovementLine(lines[i]);
    if (movement) return movement;
  }

  return null;
}

function addLocation(
  locations: LocationEntry[],
  location?: string,
  date?: string
) {
  const cleanLocation = (location || "").trim();
  if (!cleanLocation) return;

  const lastLocation = locations[locations.length - 1];
  if (lastLocation?.location === cleanLocation) {
    if (!lastLocation.date && date) lastLocation.date = date;
    return;
  }

  locations.push({ location: cleanLocation, date });
}

function movementLocations(lines: string[]) {
  const locations: LocationEntry[] = [];

  for (const line of lines) {
    const movement = parseMovementLine(line);
    if (!movement) continue;

    addLocation(locations, movement.from, movement.date);
    addLocation(locations, movement.to, movement.date);
  }

  return locations;
}

function formatLocationEntry(entry: LocationEntry) {
  return `${entry.location}${entry.date ? `\n   Fecha: ${entry.date}` : ""}`;
}

function formatPreviousLocations(
  lines: string[],
  fallbackLocation?: string,
  fallbackDate?: string
) {
  const locations = movementLocations(lines);
  addLocation(locations, fallbackLocation, fallbackDate);

  if (locations.length === 0) return "Sin movimientos previos";

  return locations
    .map((location, index) => `${index + 1}. ${formatLocationEntry(location)}`)
    .join("\n");
}

function formatCurrentLocation(movement: Movement) {
  return `Última ubicación:\n${movement.to}${
    movement.date ? `\nFecha: ${movement.date}` : ""
  }`;
}

function formatHistoryMovementDiff(before: unknown, after: unknown) {
  const beforeLines = historyLines(before);
  const afterLines = historyLines(after);
  const addedLines = addedHistoryLines(before, after);
  const addedMovement = findLastMovement(addedLines);

  if (addedMovement) {
    return {
      v1: `Lugares anteriores:\n${formatPreviousLocations(
        beforeLines,
        addedMovement.from,
        addedMovement.date
      )}`,
      v2: formatCurrentLocation(addedMovement),
    };
  }

  const currentMovement = findLastMovement(afterLines);
  const addedText = addedLines.join("\n").trim();

  return {
    v1: `Lugares anteriores:\n${formatPreviousLocations(beforeLines)}`,
    v2: currentMovement
      ? formatCurrentLocation(currentMovement)
      : addedText
        ? `Evento agregado:\n${addedText}`
        : "Sin cambios nuevos de movimiento",
  };
}

function computeDiff(before: unknown, after: unknown) {
  const b = safeJSON(before) || {};
  const a = safeJSON(after) || {};
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)])).sort();

  const rows: { field: string; v1: string; v2: string }[] = [];

  for (const k of keys) {
    const s1 = rawToText(b[k]);
    const s2 = rawToText(a[k]);

    if (s1 !== s2) {
      if (k === "historial_movimientos") {
        const formatted = formatHistoryMovementDiff(b[k], a[k]);
        rows.push({
          field: fieldLabel(k),
          v1: formatted.v1,
          v2: formatted.v2,
        });
        continue;
      }

      rows.push({ field: fieldLabel(k), v1: s1, v2: s2 });
    }
  }

  return rows;
}

function commentWasRemoved(item: AuditoriaRow) {
  const before = safeJSON(item.datos_anteriores);
  const after = safeJSON(item.datos_nuevos);
  return typeof before?.comentarios === "string" && before.comentarios.trim().length > 0 &&
    typeof after?.comentarios === "string" && after.comentarios.trim().length === 0;
}

function actionLabel(item: AuditoriaRow) {
  const a = (item.accion || "").toUpperCase();

  if (a === "UPDATE" && commentWasRemoved(item)) return "Comentario quitado";

  if (a === "INSERT" || a === "CREATE") return "Creado";
  if (a === "UPDATE") return "Editado";
  if (a === "DELETE") return "Eliminado";

  return item.accion || "—";
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

function getChangeKind(item: AuditoriaRow) {
  const before = safeJSON(item.datos_anteriores) || {};
  const after = safeJSON(item.datos_nuevos) || {};

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

function changeContainerClass(kind: "ubicacion" | "movimiento" | "general") {
  if (kind === "ubicacion") {
    return "border-cyan-300/80 dark:border-cyan-700/80 bg-cyan-50/50 dark:bg-cyan-950/15";
  }

  if (kind === "movimiento") {
    return "border-violet-300/80 dark:border-violet-700/80 bg-violet-50/50 dark:bg-violet-950/15";
  }

  return "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/40";
}

function headerClass(kind: "ubicacion" | "movimiento" | "general") {
  if (kind === "ubicacion") {
    return "bg-cyan-50/80 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800";
  }

  if (kind === "movimiento") {
    return "bg-violet-50/80 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800";
  }

  return "bg-gray-50/90 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800";
}

function buildResume(item: AuditoriaRow) {
  const before = safeJSON(item.datos_anteriores) || {};
  const after = safeJSON(item.datos_nuevos) || {};

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

  if (commentWasRemoved(item)) return "Se quitó el comentario del bien";
  if (item.descripcion) return item.descripcion;

  if ((item.accion || "").toUpperCase() === "INSERT") return "Registro creado";
  if ((item.accion || "").toUpperCase() === "CREATE") return "Registro creado";
  if ((item.accion || "").toUpperCase() === "DELETE") return "Registro eliminado";

  return "Registro editado";
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

function LegendDot({
  className,
}: {
  className: string;
}) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${className}`} />;
}

function DetailBox({
  title,
  value,
  tone = "neutral",
}: {
  title: string;
  value: string;
  tone?: "neutral" | "before" | "after";
}) {
  const toneClass =
    tone === "before"
      ? "bg-white dark:bg-gray-950/50 border-gray-200 dark:border-gray-800"
      : tone === "after"
        ? "bg-white dark:bg-gray-950/50 border-gray-200 dark:border-gray-800"
        : "bg-white dark:bg-gray-950/50 border-gray-200 dark:border-gray-800";

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
        {title}
      </p>
      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-gray-800 dark:text-gray-200">
        {value || "—"}
      </p>
    </div>
  );
}

export default function HistorialModal({
  isOpen,
  onClose,
  tabla,
  idRegistro,
}: HistorialModalProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AuditoriaRow[]>([]);

  useEffect(() => {
    const safeIdRegistro = idRegistro;

    if (!isOpen || !tabla || safeIdRegistro == null) return;

    const resolvedIdRegistro: string | number = safeIdRegistro;

    let cancel = false;

    async function load() {
      try {
        setLoading(true);
        const data = await fetchHistorialPorRegistro(
          tabla,
          resolvedIdRegistro,
          100,
          0
        );
        if (!cancel) setItems(data);
      } catch {
        if (!cancel) setItems([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    load();

    return () => {
      cancel = true;
    };
  }, [isOpen, tabla, idRegistro]);

  const title = useMemo(() => {
    if (idRegistro == null) return "Historial del mobiliario";
    return `Historial del mobiliario #${idRegistro}`;
  }, [idRegistro]);

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95"
          >
            <Dialog.Panel className="flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:h-[88vh] sm:max-w-5xl sm:rounded-2xl">
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="h-1.5 w-14 rounded-full bg-gray-300 dark:bg-gray-700" />
              </div>

              <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/85 dark:border-gray-800 dark:bg-gray-900/95 dark:supports-[backdrop-filter]:bg-gray-900/85 sm:px-6">
                <div className="flex items-start justify-between gap-3 sm:items-center">
                  <div className="min-w-0 pr-2">
                    <Dialog.Title
                      as="h3"
                      className="text-[15px] font-semibold leading-tight text-gray-900 dark:text-white sm:text-xl"
                    >
                      {title}
                    </Dialog.Title>
                    <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400 sm:text-sm">
                      Eventos más recientes primero
                    </p>
                  </div>

                  <button
                    onClick={onClose}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    aria-label="Cerrar"
                    title="Cerrar"
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50/70 px-3 py-3 dark:bg-gray-950/30 sm:px-6 sm:py-5">
                {loading ? (
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                    Cargando historial…
                  </div>
                ) : items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                    Este mobiliario no tiene historial registrado.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                      <div className="flex flex-col gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Referencias del historial
                          </h4>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Esta guía ayuda a interpretar rápidamente los cambios registrados.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950/40">
                            <LegendDot className="bg-green-500" />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                              Creado
                            </span>
                          </div>

                          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950/40">
                            <LegendDot className="bg-amber-500" />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                              Editado
                            </span>
                          </div>

                          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950/40">
                            <LegendDot className="bg-red-500" />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                              Eliminado
                            </span>
                          </div>

                          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950/40">
                            <LegendDot className="bg-cyan-500" />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                              Cambio de ubicación
                            </span>
                          </div>

                          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950/40">
                            <LegendDot className="bg-violet-500" />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                              Movimiento entre sectores
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <ul className="space-y-4">
                      {items.map((item) => {
                        const diffs = computeDiff(
                          item.datos_anteriores,
                          item.datos_nuevos
                        );
                        const resume = buildResume(item);
                        const kind = getChangeKind(item);

                        return (
                          <li
                            key={item.id}
                            className={`overflow-hidden rounded-2xl border shadow-sm transition ${changeContainerClass(kind)}`}
                          >
                            <div
                              className={`border-b px-3 py-3 sm:px-5 sm:py-4 ${headerClass(kind)}`}
                            >
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={badge(item.accion)}>
                                        {actionLabel(item)}
                                      </span>

                                      <span className={kindBadgeClass(kind)}>
                                        {kindLabel(kind)}
                                      </span>

                                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {item.usuario || "—"}
                                      </span>
                                    </div>

                                    <div className="mt-2 flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-3">
                                      <span className="text-gray-500 dark:text-gray-400">
                                        {item.fecha}
                                      </span>
                                      <span className="hidden text-gray-300 dark:text-gray-600 sm:inline">
                                        •
                                      </span>
                                      <span className="break-words text-gray-700 dark:text-gray-300">
                                        {resume}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="px-3 py-3 sm:px-5 sm:py-4">
                              <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
                                <table className="min-w-full text-sm">
                                  <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/70">
                                    <tr>
                                      <th className="w-[22%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
                                        Campo
                                      </th>
                                      <th className="w-[39%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
                                        Antes
                                      </th>
                                      <th className="w-[39%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
                                        Después
                                      </th>
                                    </tr>
                                  </thead>

                                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {diffs.length === 0 ? (
                                      <tr>
                                        <td
                                          colSpan={3}
                                          className="px-4 py-5 text-sm text-gray-500 dark:text-gray-400"
                                        >
                                          Sin diferencias para mostrar.
                                        </td>
                                      </tr>
                                    ) : (
                                      diffs.map((d) => (
                                        <tr
                                          key={d.field}
                                          className="align-top hover:bg-gray-50/80 dark:hover:bg-gray-800/30"
                                        >
                                          <td className="px-4 py-4">
                                            <div className="rounded-lg bg-gray-50 px-3 py-2 font-medium text-gray-900 dark:bg-gray-950/50 dark:text-gray-100 break-words">
                                              {d.field}
                                            </div>
                                          </td>

                                          <td className="px-4 py-4">
                                            <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-3 text-gray-700 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-300 whitespace-pre-wrap break-words leading-6">
                                              {d.v1 || "—"}
                                            </div>
                                          </td>

                                          <td className="px-4 py-4">
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

                              <div className="space-y-3 md:hidden">
                                {diffs.length === 0 ? (
                                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                                    Sin diferencias para mostrar.
                                  </div>
                                ) : (
                                  diffs.map((d) => (
                                    <div
                                      key={d.field}
                                      className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                                    >
                                      <div className="mb-3 flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">
                                          {d.field}
                                        </p>
                                      </div>

                                      <div className="grid grid-cols-1 gap-3">
                                        <DetailBox title="Antes" value={d.v1 || "—"} tone="before" />
                                        <DetailBox title="Después" value={d.v2 || "—"} tone="after" />
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>

                              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-3 dark:border-gray-800 dark:bg-gray-950/40">
                                <div className="flex flex-col gap-1.5 text-[11px] sm:text-xs">
                                  <p className="text-gray-500 dark:text-gray-400">
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                                      IP:
                                    </span>{" "}
                                    <span className="break-words">{item.ip_origen || "—"}</span>
                                  </p>
                                  <p className="text-gray-500 dark:text-gray-400">
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                                      Agente:
                                    </span>{" "}
                                    <span className="break-words">{item.user_agent || "—"}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 z-20 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/85 dark:border-gray-800 dark:bg-gray-900/95 dark:supports-[backdrop-filter]:bg-gray-900/85 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">
                    Se muestran los cambios más recientes primero.
                  </p>

                  <button
                    onClick={onClose}
                    type="button"
                    className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 hover:shadow-sm sm:w-auto sm:min-w-[120px]"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
