type VehicleAwareAsset = {
  id_rubro?: number | string | null;
  rubro_id?: number | string | null;
  rubro?: string | null;
  clase?: string | null;
  clase_bien?: string | null;
  descripcion?: string | null;
  descripcion_mobiliario?: string | null;
  vehiculo?: string | null;
};

export const TRANSPORT_RUBRO_ID = 432;

function normalize(value?: string | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isTransportAsset(asset?: VehicleAwareAsset | null) {
  if (!asset) return false;
  const rubroId = asset.id_rubro ?? asset.rubro_id;
  if (Number(rubroId) === TRANSPORT_RUBRO_ID) return true;

  const rubro = normalize(asset.rubro);
  return (
    rubro.includes("equipos de transporte") &&
    rubro.includes("traccion") &&
    rubro.includes("elevacion")
  );
}

export function isFireExtinguisherAsset(asset?: VehicleAwareAsset | null) {
  if (!asset) return false;
  const text = [
    asset.rubro,
    asset.clase,
    asset.clase_bien,
    asset.descripcion,
    asset.descripcion_mobiliario,
  ]
    .map(normalize)
    .join(" ");

  return (
    text.includes("matafuego") ||
    text.includes("mata fuego") ||
    text.includes("mata-fuego") ||
    text.includes("extintor")
  );
}

export function canAssignVehicle(asset?: VehicleAwareAsset | null) {
  return isTransportAsset(asset) || isFireExtinguisherAsset(asset);
}

export function visibleVehicle(asset?: VehicleAwareAsset | null) {
  if (!asset || !canAssignVehicle(asset)) return null;
  return asset.vehiculo?.trim() || null;
}
