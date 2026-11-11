
// app/Perfil-Diputado/[nombre]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "react-hot-toast";
import {
  FaArrowLeft,
  FaBoxes,
  FaCamera,
  FaCheckCircle,
  FaClock,
  FaCopy,
  FaEdit,
  FaExclamationTriangle,
  FaFire,
  FaHome,
  FaLayerGroup,
  FaListUl,
  FaMapMarkerAlt,
  FaSearch,
  FaTag,
  FaTimes,
  FaTrash,
  FaUsers,
  FaWrench,
} from "react-icons/fa";

import {
  ConfirmModal,
  DuplicateMobiliarioModal,
  HistorialModal,
  ReparacionModal,
  Wrapper,
  diputadosData,
} from "@/components";
import MobiliarioPhotoGallery from "@/components/MobiliarioPhotoGallery";
import { formatMobiliarioDate } from "@/lib/dateFormat";
import { parseMandato } from "@/lib/mandato";
import {
  actualizarEstadoMobiliario,
  actualizarFaltanteMobiliario,
  actualizarFotoMobiliario,
  actualizarProblemaEtiquetaMobiliario,
  duplicarMobiliario,
  eliminarMobiliario,
  obtenerUltimosMobiliarios,
  obtenerMobiliariosPorUbicacion,
} from "@/services/mobiliarioService";
import type { MobiliarioUltimo } from "@/types/types";
import type { Diputado } from "@/types/diputados";
import { listarDiputados } from "@/services/diputadosService";
import { canDeleteMobiliario, isViewer } from "@/services/authRole";
import { uploadMobiliarioImage } from "@/lib/imageUpload";

/* ====== Semáforo de estados ====== */
const FLAG_META = {
  faltante: { label: "Faltante", badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200" },
  para_baja: { label: "Para baja", badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200" },
  para_reparacion: { label: "Reparación", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
  sobrante: { label: "Sobrante", badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200" },
  problema_etiqueta: { label: "Etiqueta", badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200" },
  no_dado: { label: "Numero dado", badge: "bg-slate-200 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200" },
} as const;
type FlagKey = keyof typeof FLAG_META;
const FLAG_PRIORITY: FlagKey[] = ["faltante", "para_baja", "para_reparacion", "sobrante", "problema_etiqueta", "no_dado"];

const CONSERVATION_OPTIONS = [
  { value: "Nuevo", classes: "border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100" },
  { value: "Bueno", classes: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100" },
  { value: "Regular", classes: "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100" },
  { value: "Malo", classes: "border-orange-300 bg-orange-50 text-orange-900 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-100" },
  { value: "Inutil", classes: "border-red-300 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100" },
] as const;

/* ====== Tipos auxiliares sin any ====== */
type WithMaybeExtras = MobiliarioUltimo & {
  anexo_id?: number | string | null;
  direccion_anexo?: string | null;
  direccion?: string | null;
  ubicacion_id?: number | null; // ya existe en MobiliarioUltimo, lo hacemos explícito por si viene opcional
};

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function getAnexoId(i: WithMaybeExtras): number | null {
  return asNumber(i.anexo_id ?? null);
}
function getDireccion(i: WithMaybeExtras): string | null {
  const d = i.direccion_anexo ?? i.direccion ?? null;
  return typeof d === "string" && d.trim().length ? d : null;
}

function pickPrimaryFlag(i: MobiliarioUltimo): FlagKey | null {
  const ref = i as Partial<Record<FlagKey, boolean>>;
  for (const k of FLAG_PRIORITY) if (ref[k]) return k;
  return null;
}
function containerClassesByFlag(flag: FlagKey | null) {
  if (!flag) return "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600";
  switch (flag) {
    case "faltante":
      return "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-600 ring-1 ring-rose-200/60 dark:ring-rose-700/40";
    case "para_baja":
      return "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-600 ring-1 ring-red-200/60 dark:ring-red-700/40";
    case "para_reparacion":
      return "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-600 ring-1 ring-amber-200/60 dark:ring-amber-700/40";
    case "sobrante":
      return "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-600 ring-1 ring-cyan-200/60 dark:ring-cyan-700/40";
    case "problema_etiqueta":
      return "bg-violet-50 dark:bg-violet-950/30 border-violet-300 dark:border-violet-600 ring-1 ring-violet-200/60 dark:ring-violet-700/40";
    case "no_dado":
      return "bg-slate-50 dark:bg-slate-900/40 border-slate-300 dark:border-slate-600 ring-1 ring-slate-200/60 dark:ring-slate-700/40";
  }
}
function listAccentByFlag(flag: FlagKey | null) {
  switch (flag) {
    case "faltante":
      return "border-l-4 border-rose-400";
    case "para_baja":
      return "border-l-4 border-red-400";
    case "para_reparacion":
      return "border-l-4 border-amber-400";
    case "sobrante":
      return "border-l-4 border-cyan-400";
    case "problema_etiqueta":
      return "border-l-4 border-violet-400";
    case "no_dado":
      return "border-l-4 border-slate-400";
    default:
      return "border-l-4 border-transparent";
  }
}
function FlagsBadges({ item }: { item: MobiliarioUltimo }) {
  const pairs: Array<[FlagKey, boolean]> = (Object.keys(FLAG_META) as FlagKey[]).map((k) => [
    k,
    Boolean((item as Partial<Record<FlagKey, boolean>>)[k]),
  ]);
  const actives = pairs.filter(([, v]) => v);
  if (!actives.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {actives.map(([k]) => (
        <span
          key={k}
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${FLAG_META[k].badge}`}
        >
          {FLAG_META[k].label}
        </span>
      ))}
    </div>
  );
}

function normalizeEstado(estado: string | null | undefined) {
  return String(estado ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function estadoIdMeta(estado: string | null | undefined) {
  const value = normalizeEstado(estado);

  switch (value) {
    case "bueno":
      return {
        label: "Bueno",
        classes:
          "bg-emerald-100 text-emerald-800 ring-emerald-300/70 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/30",
      };
    case "nuevo":
      return {
        label: "Nuevo",
        classes:
          "bg-sky-100 text-sky-800 ring-sky-300/70 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-400/30",
      };
    case "regular":
      return {
        label: "Regular",
        classes:
          "bg-amber-100 text-amber-900 ring-amber-300/70 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/30",
      };
    case "inutil":
      return {
        label: "Inutil",
        classes:
          "bg-red-100 text-red-800 ring-red-300/70 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-400/30",
      };
    default:
      return {
        label: estado?.trim() || "Sin estado",
        classes:
          "bg-slate-100 text-slate-700 ring-slate-300/70 dark:bg-slate-800/70 dark:text-slate-200 dark:ring-slate-600/50",
      };
  }
}

function EstadoIdBadge({
  id,
  estado,
}: {
  id: string;
  estado: string | null | undefined;
}) {
  const meta = estadoIdMeta(estado);

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ring-1 ${meta.classes}`}
    >
      <span className="shrink-0">ID: {id}</span>
      <span className="truncate font-bold">({meta.label})</span>
    </span>
  );
}

function countFlag(items: MobiliarioUltimo[], flag: FlagKey) {
  return items.filter((item) => Boolean((item as Partial<Record<FlagKey, boolean>>)[flag])).length;
}

/* ====== helpers ====== */
function normalize(s?: string | null) {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function isMatafuegoMobiliario(item?: MobiliarioUltimo | null) {
  if (!item) return false;
  const value = normalize(`${item.descripcion || ""} ${item.clase_bien || ""} ${item.rubro || ""}`);
  return value.includes("matafuego") || value.includes("mata fuego") || value.includes("extintor");
}

function matafuegosHref(item?: MobiliarioUltimo | null) {
  if (!item?.id_anexo) return null;
  return `/matafuegos?mobiliario=${encodeURIComponent(item.id_mobiliario)}`;
}
const STOP = new Set([
  "de","del","la","las","los","el","y","e","da","do","dos","di","du","von","van","san","santa","jr","sr","ii","iii",
]);

function splitName(fullName: string) {
  const tokens = normalize(fullName).split(" ").filter((t) => t.length > 2 && !STOP.has(t));
  const last = tokens[tokens.length - 1] || "";
  const prev = tokens[tokens.length - 2] || "";
  const surnames = [prev, last].filter(Boolean);
  const firstNames = tokens.slice(0, Math.max(0, tokens.length - surnames.length));
  return { firstNames, surnames, all: tokens };
}

function mostFrequent<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  const map = new Map<T, number>();
  for (const v of arr) map.set(v, (map.get(v) ?? 0) + 1);
  let best = arr[0]; let max = 0;
  for (const [k, n] of map) if (n > max) { best = k; max = n; }
  return best;
}

function scoreSubdepMatch(subdep: string, firstNames: string[], surnames: string[], preferAddr?: string | null) {
  const s = normalize(subdep);
  let score = 0;
  for (const a of surnames) if (a && s.includes(a)) score += 6;
  for (const f of firstNames) if (f && s.includes(f)) score += 1.5;
  if (s.includes("diputad")) score += 1.5;
  if (/^(pb|\d+p)/.test(s)) score += 0.5;
  if (preferAddr) {
    const addr = normalize(preferAddr.replace(/°/g, "").replace(/\./g, ""));
    const firstWord = addr.split(" ")[0] || "";
    if (firstWord && s.includes(firstWord)) score += 0.5;
  }
  return score;
}

/* ====== overrides puntuales ====== */
type OverrideCfg = {
  anexoId?: number;
  preferSubdeps?: string[];
  fixedUbicacionId?: number;
};

const OVERRIDES: Record<string, OverrideCfg> = {
  "mario claudio ruiz": { anexoId: 100, fixedUbicacionId: 105, preferSubdeps: ["VICEPRESIDENCIA PRIMERA"] },
  "mario claudio ruíz": { anexoId: 100, fixedUbicacionId: 105, preferSubdeps: ["VICEPRESIDENCIA PRIMERA"] },

  // 👇 Agregar este override para Cabral
  "raul eduardo cabral": { anexoId: 300, fixedUbicacionId: 303, preferSubdeps: [
    // si algún row viniera con el nombre correcto, ayuda a priorizar
    "DIPUTADO RAUL EDUARDO CABRAL",
    "DIPUTADO RAÚL EDUARDO CABRAL",
    // y si tenés muchos rows “mal etiquetados” bajo otro diputado,
    // igual el fixedUbicacionId=303 fuerza traer el inventario de su oficina correcta
  ]},
  
  // ✅ Sofía Lorena Laso
  // Dirección Anexo: COPIAPÓ N° 266
  // Subdependencia: DESPACHO DIP. LASSO SOFIA
  // Ubicación ID: 310
  "sofia lorena laso": {
    fixedUbicacionId: 310,
    preferSubdeps: [
      "DESPACHO DIP. LASSO SOFIA",
      "DESPACHO DIP. LASO SOFIA",
    ],
  },

  // ✅ Claudia Cecilia López
  // Dirección Anexo: ANEXO URQUIZA N° 453
  // Subdependencia: 2P- DIP. LOPEZ CLAUDIA
  // Ubicación ID: 616
  "claudia cecilia lopez": {
    fixedUbicacionId: 616,
    preferSubdeps: ["2P- DIP. LOPEZ CLAUDIA"],
  },
  "claudia cecilia lópez": {
    fixedUbicacionId: 616,
    preferSubdeps: ["2P- DIP. LOPEZ CLAUDIA"],
  },
  
};

const PAGE_SIZE = 25;

/* ========================= Componente ========================= */
export default function DiputadoDetalle() {
  const params = useParams<{ nombre: string }>();
  const router = useRouter();
  const nombre = decodeURIComponent(params.nombre);

  const fallbackDiputado = diputadosData.find(
    (item) => normalize(item.nombre) === normalize(nombre)
  ) as Diputado | undefined;
  const [diputado, setDiputado] = useState<Diputado | undefined>(fallbackDiputado);
  const [diputadoReady, setDiputadoReady] = useState(false);

  const [items, setItems] = useState<MobiliarioUltimo[]>([]);
  const [filtered, setFiltered] = useState<MobiliarioUltimo[]>([]);
  const [selected, setSelected] = useState<MobiliarioUltimo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [ubicacionId, setUbicacionId] = useState<number | null>(null);
  const [anexoId, setAnexoId] = useState<number | null>(null);
  const [subdependenciaDetectada, setSubdependenciaDetectada] = useState<string | null>(null);

  const [search, setSearch] = useState<string>("");
  const [filterFlag, setFilterFlag] = useState<FlagKey | "todos">("todos");
  const [page, setPage] = useState<number>(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showReparacion, setShowReparacion] = useState(false);
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [updatingEstado, setUpdatingEstado] = useState(false);
  const [updatingFaltante, setUpdatingFaltante] = useState(false);
  const [updatingEtiqueta, setUpdatingEtiqueta] = useState(false);
  const [quickPhotoLoading, setQuickPhotoLoading] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const quickPhotoInputRef = useRef<HTMLInputElement>(null);
  const viewer = isViewer();
  const canDelete = canDeleteMobiliario();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await listarDiputados();
        const match = remote.find((item) => normalize(item.nombre) === normalize(nombre));
        if (!cancelled && match) setDiputado(match);
      } catch (error) {
        console.error("No se pudo cargar el perfil administrable del diputado:", error);
      } finally {
        if (!cancelled) setDiputadoReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [nombre]);

  useEffect(() => {
    if (!diputadoReady) return;
    (async () => {
      try {
        setLoading(true);

        if (diputado?.ubicacion_id) {
          const byLocation = await obtenerMobiliariosPorUbicacion(diputado.ubicacion_id);
          const base = byLocation;
          setUbicacionId(diputado.ubicacion_id);
          setAnexoId(diputado.anexo_id ?? null);
          setSubdependenciaDetectada(diputado.subdependencia || base[0]?.subdependencia || null);
          setItems(base);
          setFiltered(base);
          setSelected(base[0] ?? null);
          if (base.length === 0) toast("No hay bienes recientes para esa oficina.", { icon: "ℹ️" });
          return;
        }

        const allRaw = await obtenerUltimosMobiliarios();
        const all: WithMaybeExtras[] = allRaw as WithMaybeExtras[];

        const { firstNames, surnames } = splitName(nombre);
        const preferAddr = diputado?.direccion ?? null;

        {
          const key = normalize(nombre);
          const ov = OVERRIDES[key];
          if (ov) {
            let base: MobiliarioUltimo[] = [];

            if (ov.preferSubdeps?.length) {
              const wanted = ov.preferSubdeps.map(normalize);
              const enPreferidas = all.filter((i) => {
                const s = normalize(i.subdependencia || "");
                return wanted.some((w) => s.includes(w));
              });
              base = enPreferidas;
            }

            if (base.length === 0 && typeof ov.anexoId === "number") {
              const enAnexo = all.filter((i) => getAnexoId(i) === ov.anexoId);
              const ubicFrecuente = mostFrequent(
                enAnexo
                  .map((i) => asNumber(i.ubicacion_id))
                  .filter((v): v is number => v !== null)
              );

              if (ubicFrecuente) {
                const byId = await obtenerMobiliariosPorUbicacion(ubicFrecuente);
                base = byId;
                setUbicacionId(ubicFrecuente);
              } else {
                base = enAnexo;
                setUbicacionId(null);
              }

              setAnexoId(ov.anexoId);
            }

            if (typeof ov.fixedUbicacionId === "number") {
              const baseTieneFixed = base.some((i) => asNumber((i as WithMaybeExtras).ubicacion_id) === ov.fixedUbicacionId);
              if (base.length === 0 || !baseTieneFixed) {
                const byFixed = await obtenerMobiliariosPorUbicacion(ov.fixedUbicacionId);
                const wanted = (ov.preferSubdeps ?? []).map(normalize);
                base = (wanted.length
                  ? byFixed.filter((i) => wanted.some((w) => normalize(i.subdependencia || "").includes(w)))
                  : byFixed
                );
              }
              setUbicacionId(ov.fixedUbicacionId);
            }

            const subdepPreferida = ov.preferSubdeps?.[0] ?? null;
            setSubdependenciaDetectada(base.length ? (base[0].subdependencia || subdepPreferida) : subdepPreferida);
            setItems(base);
            setFiltered(base);
            setSelected(base[0] ?? null);

            if (base.length === 0) {
              toast("No hay bienes recientes para esa oficina.", { icon: "ℹ️" });
            }
            setLoading(false);
            return;
          }
        }

        const scoreBySub = new Map<string, number>();
        for (const i of all) {
          const sub = i.subdependencia?.trim();
          if (!sub) continue;
          const s = normalize(sub);
          const hasSurname = surnames.some((a) => a && s.includes(a));
          if (!hasSurname) continue;
          const sc = scoreSubdepMatch(sub, firstNames, surnames, preferAddr);
          if (sc > 0) scoreBySub.set(sub, (scoreBySub.get(sub) ?? 0) + sc);
        }

        if (scoreBySub.size === 0) {
          const addr = preferAddr ? normalize(preferAddr.replace(/°/g, "").replace(/\./g, "")) : null;
          const streetToken = addr ? addr.split(" ")[0] || "" : "";
          const enDireccion = all.filter((i) => {
            const d = normalize(getDireccion(i));
            return streetToken ? d.includes(streetToken) : false;
          });

          if (enDireccion.length) {
            const ubic = mostFrequent(
              enDireccion
                .map((i) => asNumber(i.ubicacion_id))
                .filter((v): v is number => v !== null)
            );
            let base: MobiliarioUltimo[] = [];
            if (ubic) {
              const byId = await obtenerMobiliariosPorUbicacion(ubic);
              base = byId;
            } else {
              base = enDireccion;
            }

            const anexoCandidato = enDireccion.find((i) => getAnexoId(i) !== null);
            setSubdependenciaDetectada(null);
            setUbicacionId(ubic ?? null);
            setAnexoId(anexoCandidato ? getAnexoId(anexoCandidato) : null);
            setItems(base);
            setFiltered(base);
            setSelected(base[0] ?? null);

            if (base.length === 0) {
              toast("No hay bienes recientes para esa oficina.", { icon: "ℹ️" });
            }
            setLoading(false);
            return;
          }
        }

        const orderedSubs = [...scoreBySub.entries()].sort((a, b) => b[1] - a[1]).map(([sub]) => sub);

        let finalSub: string | null = null;
        let base: MobiliarioUltimo[] = [];
        let localUbic: number | null = null;
        let localAnexo: number | null = null;

        for (const candidate of orderedSubs) {
          const enSubdep = all.filter((i) => normalize(i.subdependencia) === normalize(candidate));
          const ubicFrecuente = mostFrequent(
            enSubdep
              .map((i) => asNumber(i.ubicacion_id))
              .filter((v): v is number => v !== null)
          );
          const anexoCandidato = enSubdep.find((i) => getAnexoId(i) !== null);

          if (ubicFrecuente) {
            const byId = await obtenerMobiliariosPorUbicacion(ubicFrecuente);
            base = byId.filter(
              (i) => normalize(i.subdependencia) === normalize(candidate)
            );
            if (base.length === 0) base = byId;
          } else {
            base = enSubdep;
          }

          if (base.length > 0) {
            finalSub = candidate;
            localUbic = ubicFrecuente ?? null;
            localAnexo = anexoCandidato ? getAnexoId(anexoCandidato) : null;
            break;
          }
        }

        if (!finalSub) {
          finalSub = orderedSubs[0] ?? null;
          const enSubdep = all.filter((i) => normalize(i.subdependencia) === normalize(finalSub!));
          localUbic =
            mostFrequent(
              enSubdep
                .map((i) => asNumber(i.ubicacion_id))
                .filter((v): v is number => v !== null)
            ) ?? null;
          const anexoCandidato = enSubdep.find((i) => getAnexoId(i) !== null);
          localAnexo = anexoCandidato ? getAnexoId(anexoCandidato) : null;
          base = enSubdep;
        }

        setSubdependenciaDetectada(finalSub);
        setUbicacionId(localUbic);
        setAnexoId(localAnexo);
        setItems(base);
        setFiltered(base);
        setSelected(base[0] ?? null);

        if (base.length === 0 && finalSub) {
          toast("No hay bienes recientes para esa oficina.", { icon: "ℹ️" });
        }
      } catch (e) {
        console.error(e);
        toast.error("No se pudo cargar el inventario.");
      } finally {
        setLoading(false);
      }
    })();
  }, [nombre, diputado?.anexo_id, diputado?.direccion, diputado?.subdependencia, diputado?.ubicacion_id, diputadoReady]);

  useEffect(() => {
    const term = normalize(search);
    const out = items.filter(
      (i) => {
        const matchesSearch =
          !term ||
          normalize(
            [
              i.id_mobiliario,
              i.descripcion,
              i.anexo,
              i.subdependencia,
              i.estado_conservacion,
            ].join(" ")
          ).includes(term);
        const matchesFlag =
          filterFlag === "todos" ||
          Boolean((i as Partial<Record<FlagKey, boolean>>)[filterFlag]);

        return matchesSearch && matchesFlag;
      }
    );
    setFiltered(out);
    setPage(1);
  }, [search, items, filterFlag]);

  const applyItemPatch = (id: string, patch: Partial<MobiliarioUltimo>) => {
    const update = (item: MobiliarioUltimo) =>
      item.id_mobiliario === id ? { ...item, ...patch } : item;
    setItems((current) => current.map(update));
    setFiltered((current) => current.map(update));
    setSelected((current) =>
      current?.id_mobiliario === id ? { ...current, ...patch } : current
    );
  };

  const handleChangeEstado = async (estado: string) => {
    if (!selected || viewer) return;
    try {
      setUpdatingEstado(true);
      const result = await actualizarEstadoMobiliario(selected.id_mobiliario, estado);
      applyItemPatch(selected.id_mobiliario, {
        estado_conservacion: result.estado_conservacion,
        fecha_actualizacion: result.fecha_actualizacion || selected.fecha_actualizacion,
      });
      setShowEstadoModal(false);
      toast.success("Estado actualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el estado.");
    } finally {
      setUpdatingEstado(false);
    }
  };

  const handleToggleFaltante = async () => {
    if (!selected || viewer) return;
    const faltante = !selected.faltante;
    try {
      setUpdatingFaltante(true);
      await actualizarFaltanteMobiliario(selected.id_mobiliario, faltante);
      applyItemPatch(selected.id_mobiliario, { faltante });
      toast.success(faltante ? "Marcado como faltante." : "Faltante quitado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar faltante.");
    } finally {
      setUpdatingFaltante(false);
    }
  };

  const handleToggleProblemaEtiqueta = async () => {
    if (!selected || viewer) return;
    const problema_etiqueta = !selected.problema_etiqueta;
    try {
      setUpdatingEtiqueta(true);
      await actualizarProblemaEtiquetaMobiliario(
        selected.id_mobiliario,
        problema_etiqueta
      );
      applyItemPatch(selected.id_mobiliario, { problema_etiqueta });
      toast.success(
        problema_etiqueta
          ? "Problema de etiqueta marcado."
          : "Problema de etiqueta quitado."
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la etiqueta.");
    } finally {
      setUpdatingEtiqueta(false);
    }
  };

  const handleQuickPhotoChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!selected || !file || viewer) return;

    try {
      setQuickPhotoLoading(true);
      const slot: 1 | 2 = selected.foto_url && !selected.foto_url_2 ? 2 : 1;
      const field = slot === 1 ? "foto_url" : "foto_url_2";
      const fotoUrl = await uploadMobiliarioImage(file);
      await actualizarFotoMobiliario(selected.id_mobiliario, fotoUrl, slot);
      applyItemPatch(selected.id_mobiliario, { [field]: fotoUrl });
      toast.success(slot === 1 ? "Foto actualizada." : "Segunda foto agregada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la foto.");
    } finally {
      setQuickPhotoLoading(false);
      event.target.value = "";
    }
  };

  const handleDuplicate = async (cantidad: number) => {
    if (!selected || viewer) return;
    const selectedId = selected.id_mobiliario;

    try {
      setDuplicating(true);
      const result = await duplicarMobiliario(selectedId, cantidad);
      const refreshed = ubicacionId
        ? await obtenerMobiliariosPorUbicacion(ubicacionId)
        : (await obtenerUltimosMobiliarios({ force: true })).filter(
            (item) =>
              normalize(item.subdependencia) === normalize(subdependenciaDetectada)
          );
      setItems(refreshed);
      setFiltered(refreshed);
      setSelected(
        refreshed.find((item) => item.id_mobiliario === selectedId) ??
          refreshed[0] ??
          null
      );
      setShowDuplicateModal(false);
      toast.success(
        `Se crearon ${result.ids_generados.length} copia${result.ids_generados.length === 1 ? "" : "s"}.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo duplicar el bien.");
    } finally {
      setDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (!selected || !canDelete) return;
    const selectedId = selected.id_mobiliario;
    try {
      setDeleting(true);
      await eliminarMobiliario(selectedId);
      const remaining = items.filter((item) => item.id_mobiliario !== selectedId);
      setItems(remaining);
      setSelected(remaining[0] ?? null);
      setShowConfirm(false);
      toast.success("Bien eliminado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el bien.");
    } finally {
      setDeleting(false);
    }
  };

  const start = (page - 1) * PAGE_SIZE;
  const current = filtered.slice(start, start + PAGE_SIZE);

  const primaryFlag = selected ? pickPrimaryFlag(selected) : null;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const mandatoInfo = diputado?.mandato ? parseMandato(diputado.mandato) : null;
  const oficinaHref =
    subdependenciaDetectada && ubicacionId
      ? `/subdependencia/${encodeURIComponent(subdependenciaDetectada)}?id=${ubicacionId}`
      : null;
  const criticalCount =
    countFlag(items, "faltante") +
    countFlag(items, "para_baja") +
    countFlag(items, "para_reparacion") +
    countFlag(items, "problema_etiqueta");
  const filterOptions: Array<{ key: FlagKey | "todos"; label: string; count: number }> = [
    { key: "todos", label: "Todos", count: items.length },
    { key: "faltante", label: "Faltantes", count: countFlag(items, "faltante") },
    { key: "para_baja", label: "Para baja", count: countFlag(items, "para_baja") },
    { key: "para_reparacion", label: "Reparación", count: countFlag(items, "para_reparacion") },
    { key: "problema_etiqueta", label: "Etiqueta", count: countFlag(items, "problema_etiqueta") },
    { key: "sobrante", label: "Sobrantes", count: countFlag(items, "sobrante") },
    { key: "no_dado", label: "Números dados", count: countFlag(items, "no_dado") },
  ];

  return (
    <Wrapper>
      <section className="mx-auto w-full max-w-7xl px-1 pb-10 pt-1 sm:px-3 lg:px-5">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <button
              onClick={() => router.back()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300"
            >
              <FaArrowLeft className="h-3.5 w-3.5" />
              Volver
            </button>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => router.push("/Home")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300"
              >
                <FaHome className="h-3.5 w-3.5" />
                Inicio
              </button>
              <button
                type="button"
                onClick={() => router.push("/Diputados")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300"
              >
                <FaUsers className="h-3.5 w-3.5" />
                Diputados
              </button>
              <button
                type="button"
                onClick={() => router.push("/listados")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300"
              >
                <FaListUl className="h-3.5 w-3.5" />
                Listados
              </button>
              <button
                type="button"
                onClick={() => oficinaHref && router.push(oficinaHref)}
                disabled={!oficinaHref}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-3 text-sm font-bold text-white transition hover:bg-cyan-800 hover:shadow-sm disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                title="Ver inventario de la oficina"
              >
                <FaLayerGroup className="h-3.5 w-3.5" />
                Oficina
              </button>
            </div>
          </div>
        </div>

        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-slate-200 ring-4 ring-slate-100 dark:bg-slate-800 dark:ring-slate-900">
                {diputado?.foto ? (
                  <Image
                    src={diputado.foto}
                    alt={`Foto de ${nombre}`}
                    width={128}
                    height={128}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-slate-500">
                    {nombre.charAt(0)}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">
                  Perfil de diputado
                </p>
                <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
                  {nombre}
                </h1>

                {diputado && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
                      {diputado.departamento}
                    </span>
                    {diputado.bloque && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {diputado.bloque}
                      </span>
                    )}
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">
                      {diputado.mandato}
                    </span>
                  </div>
                )}

                {diputado?.partido && (
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {diputado.partido}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[420px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <FaBoxes className="mb-2 text-cyan-700 dark:text-cyan-300" />
                <p className="text-2xl font-bold text-slate-950 dark:text-white">
                  {loading ? "..." : items.length}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Bienes asignados
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <FaExclamationTriangle className="mb-2 text-amber-700 dark:text-amber-300" />
                <p className="text-2xl font-bold text-slate-950 dark:text-white">
                  {loading ? "..." : criticalCount}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Alertas
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <FaClock className="mb-2 text-violet-700 dark:text-violet-300" />
                <p className="text-2xl font-bold text-slate-950 dark:text-white">
                  {mandatoInfo ? `${mandatoInfo.progress}%` : "—"}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Mandato
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <FaMapMarkerAlt className="mb-2 text-emerald-700 dark:text-emerald-300" />
                <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                  {ubicacionId ?? "—"}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Ubicación ID
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Subdependencia</p>
              <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{subdependenciaDetectada ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Anexo ID</p>
              <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{anexoId ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Resultados visibles</p>
              <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{filtered.length}</p>
            </div>
          </div>
        </section>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por ID, descripción, anexo, estado o subdependencia"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilterFlag(option.key)}
                  className={`h-10 rounded-xl px-3 text-xs font-bold transition ${
                    filterFlag === option.key
                      ? "bg-cyan-700 text-white dark:bg-cyan-500 dark:text-slate-950"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300"
                  }`}
                >
                  {option.label} · {option.count}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="col-span-1 max-h-[calc(100vh-190px)] overflow-y-auto pr-1 lg:sticky lg:top-24">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Inventario</h2>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                {filtered.length}
              </span>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-400">
                Cargando inventario...
              </div>
            ) : current.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-400">
                No hay resultados.
              </div>
            ) : (
              <div className="space-y-3">
                {current.map((item) => {
                  const isSel = selected?.id_mobiliario === item.id_mobiliario;
                  const flag = pickPrimaryFlag(item);
                  return (
                    <button
                      type="button"
                      key={item.id_mobiliario}
                      onClick={() => setSelected(item)}
                      className={[
                        "w-full cursor-pointer rounded-2xl p-4 text-left text-sm shadow-sm transition-all border hover:-translate-y-0.5 hover:shadow-md",
                        isSel
                          ? "border-cyan-400 bg-cyan-50 dark:border-cyan-600 dark:bg-cyan-950/35"
                          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/80",
                        listAccentByFlag(flag),
                      ].join(" ")}
                    >
                      <p className="line-clamp-2 font-bold text-slate-950 dark:text-white">{item.descripcion || "Sin descripción"}</p>
                      <div className="mt-2">
                        <EstadoIdBadge id={item.id_mobiliario} estado={item.estado_conservacion} />
                      </div>
                      <FlagsBadges item={item} />
                    </button>
                  );
                })}
              </div>
            )}

            {filtered.length > PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  Anterior
                </button>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>

          <div className="col-span-2">
            <h2 className="mb-4 text-lg font-bold text-slate-950 dark:text-white">Detalle</h2>

            {!selected ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-400">
                Seleccioná un mobiliario para ver el detalle.
              </div>
            ) : (
              <div
                className={[
                  "grid grid-cols-1 gap-6 rounded-2xl border p-5 shadow-sm md:grid-cols-2 sm:p-6",
                  containerClassesByFlag(primaryFlag),
                ].join(" ")}
              >
                <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <div className="mb-3">
                    <EstadoIdBadge id={selected.id_mobiliario} estado={selected.estado_conservacion} />
                  </div>
                  <p><strong>Anexo:</strong> {selected.anexo}</p>
                  <p><strong>Subdependencia:</strong> {selected.subdependencia || subdependenciaDetectada || "—"}</p>
                  <p><strong>Ubicación ID:</strong> {selected.ubicacion_id ?? ubicacionId ?? "—"}</p>
                  <p><strong>Descripción:</strong> {selected.descripcion || "—"}</p>
                  <p><strong>Resolución:</strong> {selected.resolucion || "—"}</p>
                  <p><strong>Fecha Resolución:</strong> {formatMobiliarioDate(selected.fecha_resolucion, "date")}</p>
                  <p><strong>Estado:</strong> {selected.estado_conservacion || "—"}</p>
                  <p><strong>Comentarios:</strong> {selected.comentarios || "—"}</p>
                  <FlagsBadges item={selected} />
                </div>

                <MobiliarioPhotoGallery
                  photos={[selected.foto_url, selected.foto_url_2]}
                  alt={selected.descripcion || "Foto del mobiliario"}
                  className="h-72 w-full rounded-2xl border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
                  imageClassName="object-contain"
                />

                <input
                  ref={quickPhotoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleQuickPhotoChange}
                />

                <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-4 dark:border-slate-700 md:col-span-2 sm:grid-cols-3 xl:grid-cols-5">
                  <button
                    type="button"
                    disabled={viewer || updatingEstado}
                    onClick={() => !viewer && setShowEstadoModal(true)}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${viewer ? "cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-700" : "bg-teal-700 text-white hover:bg-teal-800"}`}
                  >
                    <FaCheckCircle /> {updatingEstado ? "Guardando..." : "Estado"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReparacion(true)}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-white transition ${selected.para_reparacion ? "bg-amber-700 hover:bg-amber-800" : "bg-amber-500 hover:bg-amber-600"}`}
                  >
                    <FaWrench /> {selected.para_reparacion ? "En reparación" : "Reparación"}
                  </button>
                  <button
                    type="button"
                    disabled={viewer || quickPhotoLoading}
                    onClick={() => quickPhotoInputRef.current?.click()}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${viewer ? "cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-700" : "bg-cyan-700 text-white hover:bg-cyan-800"}`}
                  >
                    <FaCamera /> {quickPhotoLoading ? "Subiendo..." : "Tomar foto"}
                  </button>
                  {isMatafuegoMobiliario(selected) && matafuegosHref(selected) && (
                    <button
                      type="button"
                      onClick={() => router.push(matafuegosHref(selected) || "/matafuegos")}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-bold text-white transition hover:bg-red-700"
                    >
                      <FaFire /> Matafuegos
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={viewer || updatingFaltante}
                    onClick={handleToggleFaltante}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-white transition ${viewer ? "cursor-not-allowed bg-slate-400" : selected.faltante ? "bg-rose-700 hover:bg-rose-800" : "bg-rose-500 hover:bg-rose-600"}`}
                  >
                    <FaExclamationTriangle /> {selected.faltante ? "Quitar faltante" : "Faltante"}
                  </button>
                  <button
                    type="button"
                    disabled={viewer || updatingEtiqueta}
                    onClick={handleToggleProblemaEtiqueta}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-white transition ${viewer ? "cursor-not-allowed bg-slate-400" : "bg-violet-600 hover:bg-violet-700"}`}
                  >
                    <FaTag /> {selected.problema_etiqueta ? "Sacar etiqueta" : "Problema etiqueta"}
                  </button>
                  <button
                    type="button"
                    disabled={viewer}
                    onClick={() => !viewer && router.push(`/Etiquetas?bien=${encodeURIComponent(selected.id_mobiliario)}`)}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-white transition ${viewer ? "cursor-not-allowed bg-slate-400" : "bg-blue-600 hover:bg-blue-700"}`}
                  >
                    <FaTag /> Etiqueta
                  </button>
                  <button
                    type="button"
                    disabled={viewer}
                    onClick={() => !viewer && setShowDuplicateModal(true)}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-white transition ${viewer ? "cursor-not-allowed bg-slate-400" : "bg-emerald-600 hover:bg-emerald-700"}`}
                  >
                    <FaCopy /> Duplicar
                  </button>
                  <button
                    type="button"
                    disabled={viewer}
                    onClick={() => {
                      if (!viewer) {
                        const redirect = `/Perfil-Diputado/${encodeURIComponent(nombre)}`;
                        router.push(`/patrimonio/editar/${selected.id_mobiliario}?redirect=${encodeURIComponent(redirect)}`);
                      }
                    }}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-white transition ${viewer ? "cursor-not-allowed bg-slate-400" : "bg-amber-500 hover:bg-amber-600"}`}
                  >
                    <FaEdit /> Editar
                  </button>
                  <button
                    type="button"
                    disabled={!canDelete}
                    onClick={() => canDelete && setShowConfirm(true)}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-white transition ${!canDelete ? "cursor-not-allowed bg-slate-400" : "bg-red-600 hover:bg-red-700"}`}
                  >
                    <FaTrash /> Eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHistorial(true)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                  >
                    <FaClock /> Historial
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {showEstadoModal && selected && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-4 py-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="diputado-estado-modal-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !updatingEstado) {
                setShowEstadoModal(false);
              }
            }}
          >
            <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-teal-700 dark:text-teal-300">
                    ID {selected.id_mobiliario}
                  </p>
                  <h2 id="diputado-estado-modal-title" className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                    Cambiar estado
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Estado actual: <strong>{selected.estado_conservacion || "Sin estado"}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEstadoModal(false)}
                  disabled={updatingEstado}
                  aria-label="Cerrar"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {CONSERVATION_OPTIONS.map((option) => {
                  const active =
                    normalizeEstado(selected.estado_conservacion) ===
                    normalizeEstado(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChangeEstado(option.value)}
                      disabled={updatingEstado || active}
                      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-black transition ${option.classes} ${active ? "ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-slate-950" : ""} disabled:cursor-not-allowed disabled:opacity-65`}
                    >
                      <FaCheckCircle className={active ? "opacity-100" : "opacity-50"} />
                      {option.value}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={showConfirm}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleDelete}
          loading={deleting}
          title="¿Eliminar este bien?"
          message="Esta acción no se puede deshacer."
        />

        <DuplicateMobiliarioModal
          isOpen={showDuplicateModal}
          itemId={selected?.id_mobiliario}
          loading={duplicating}
          onCancel={() => setShowDuplicateModal(false)}
          onConfirm={handleDuplicate}
        />

        {selected && (
          <HistorialModal
            isOpen={showHistorial}
            onClose={() => setShowHistorial(false)}
            tabla="mobiliario"
            idRegistro={selected.id_mobiliario}
          />
        )}

        {selected && (
          <ReparacionModal
            isOpen={showReparacion}
            onClose={() => setShowReparacion(false)}
            mobiliarioId={selected.id_mobiliario}
            descripcion={selected.descripcion}
            paraReparacion={Boolean(selected.para_reparacion)}
            readOnly={viewer}
            onChanged={(para_reparacion) =>
              applyItemPatch(selected.id_mobiliario, { para_reparacion })
            }
          />
        )}

      </section>
    </Wrapper>
  );
}
