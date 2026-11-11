import type { MobiliarioUltimo } from "@/types/types";

export type SpecificKey =
  | "computadoras"
  | "impresoras"
  | "monitores"
  | "televisores"
  | "telefonia"
  | "climatizacion"
  | "vehiculos"
  | "matafuegos";

export type AlertKey =
  | "no_dado"
  | "faltantes"
  | "para_baja"
  | "para_reparacion"
  | "problema_etiqueta"
  | "sobrantes"
  | "sin_estado"
  | "sin_foto"
  | "sin_rubro"
  | "sin_clase";

type SelectionBase = {
  label: string;
  total: number;
};

export type ReportSelection =
  | (SelectionBase & { kind: "specific"; key: SpecificKey })
  | (SelectionBase & { kind: "alert"; key: AlertKey });

export function matchesReportSelection(item: MobiliarioUltimo, selection: ReportSelection) {
  if (selection.kind === "alert") {
    switch (selection.key) {
      case "no_dado": return Boolean(item.no_dado);
      case "faltantes": return Boolean(item.faltante);
      case "para_baja": return Boolean(item.para_baja);
      case "para_reparacion": return Boolean(item.para_reparacion);
      case "problema_etiqueta": return Boolean(item.problema_etiqueta);
      case "sobrantes": return Boolean(item.sobrante);
      case "sin_estado": return !item.estado_conservacion?.trim();
      case "sin_foto": return !item.foto_url?.trim() && !item.foto_url_2?.trim();
      case "sin_rubro": return item.id_rubro == null && item.rubro_id == null;
      case "sin_clase": return item.id_clase == null && item.clase_bien_id == null;
    }
  }

  const normalize = (value: string) => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR");
  const clase = normalize(item.clase_bien || "");
  const descripcion = normalize(item.descripcion || "");
  const text = `${clase} ${descripcion}`;
  switch (selection.key) {
    case "computadoras": return /^(?:computador(?:a|es|as)?|notebook|netbook|cpu|pc\b|equipo (?:de )?(?:pc|computacion|computadora)|all.in.one\b)/.test(clase)
      || /^(?:computador(?:a|es|as)?|notebook|netbook|cpu|pc\b|equipo (?:de )?(?:pc|computacion|computadora)|all.in.one\b)/.test(descripcion);
    case "impresoras": return text.includes("impresor");
    case "monitores": return text.includes("monitor");
    case "televisores": return text.includes("televisor") || /(^|[^a-z])tv([^a-z]|$)/.test(text);
    case "telefonia": return /^(?:telefono|telefonos|telefonia|celular|smartphone|aparato telefonico)/.test(clase)
      || /^(?:telefono|telefonos|telefonia|celular|smartphone|aparato telefonico)/.test(descripcion);
    case "climatizacion": return ["aire acondicionado", "ventilador", "calefactor"].some((word) => text.includes(word));
    case "vehiculos":
      return Number(item.id_rubro ?? item.rubro_id) === 432
        && (item.clase_bien || "").trim().toLocaleUpperCase("es-AR") === "VEHICULO UTILITARIO";
    case "matafuegos": return ["matafuego", "mata fuego", "mata-fuego", "extintor"].some((word) => text.includes(word));
  }
  return false;
}
