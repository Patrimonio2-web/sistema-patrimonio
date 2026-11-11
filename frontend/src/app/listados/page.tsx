// src/app/Listados/page.tsx
"use client";

import { useDeferredValue, useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaBoxes,
  FaCheckCircle,
  FaCopy,
  FaEdit,
  FaTrash,
  FaTag,
  FaClock,
  FaUserEdit,
  FaExclamationTriangle,
  FaFilter,
  FaHashtag,
  FaLayerGroup,
  FaSearch,
  FaCamera,
  FaFire,
  FaTimes,
  FaWrench,
} from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import {
  obtenerUltimosMobiliarios,
  eliminarMobiliario,
  actualizarFaltanteMobiliario,
  actualizarProblemaEtiquetaMobiliario,
  duplicarMobiliario,
  actualizarFotoMobiliario,
  actualizarEstadoMobiliario,
  readCachedUltimosMobiliarios,
  patchCachedUltimoMobiliario,
} from "@/services/mobiliarioService";
import type { MobiliarioUltimo } from "@/types/types";
import {
  Wrapper,
  ConfirmModal,
  HistorialModal,
  DuplicateMobiliarioModal,
  ReparacionModal,
} from "@/components";
import { canDeleteMobiliario, isViewer } from "@/services/authRole";
import { formatMobiliarioDate } from "@/lib/dateFormat";
import { uploadMobiliarioImage } from "@/lib/imageUpload";
import MobiliarioPhotoGallery from "@/components/MobiliarioPhotoGallery";
import { visibleVehicle } from "@/lib/mobiliarioVehicle";

function parseResol(res: string | null) {
  if (!res) return { numero: "", tipo: "" };
  const match = res.match(/Resol Nº(\S+)\s*(.*)/);
  return match
    ? { numero: match[1] || "", tipo: match[2] || "" }
    : { numero: "", tipo: "" };
}

function normalizeSearch(value?: string | null) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isMatafuegoMobiliario(item?: MobiliarioUltimo | null) {
  if (!item) return false;
  const text = [item.descripcion, item.clase_bien, item.rubro]
    .map(normalizeSearch)
    .join(" ");
  return (
    text.includes("matafuego") ||
    text.includes("mata fuego") ||
    text.includes("mata-fuego") ||
    text.includes("extintor")
  );
}

function matafuegosHref(item?: MobiliarioUltimo | null) {
  const idAnexo = item?.id_anexo;
  if (idAnexo === undefined || idAnexo === null || idAnexo === "") return null;
  if (item?.id_mobiliario) {
    return `/matafuegos?mobiliario=${encodeURIComponent(String(item.id_mobiliario))}`;
  }
  return `/matafuegos/anexo/${idAnexo}`;
}

const FLAG_META = {
  faltante: {
    label: "Faltante",
    badge:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  },
  para_baja: {
    label: "Para baja",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  },
  para_reparacion: {
    label: "Reparación",
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  },
  sobrante: {
    label: "Sobrante",
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
  },
  problema_etiqueta: {
    label: "Etiqueta",
    badge:
      "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  },
  privado: {
    label: "Privado",
    badge:
      "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
  },
  no_dado: {
    label: "Numero dado",
    badge: "bg-slate-200 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
  },
} as const;

type FlagKey =
  | "faltante"
  | "para_baja"
  | "para_reparacion"
  | "sobrante"
  | "problema_etiqueta"
  | "privado"
  | "no_dado";

const FLAG_PRIORITY: FlagKey[] = [
  "faltante",
  "para_baja",
  "para_reparacion",
  "sobrante",
  "problema_etiqueta",
  "privado",
  "no_dado",
];

const CONSERVATION_OPTIONS = [
  { value: "Nuevo", classes: "border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100" },
  { value: "Bueno", classes: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100" },
  { value: "Regular", classes: "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100" },
  { value: "Malo", classes: "border-orange-300 bg-orange-50 text-orange-900 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-100" },
  { value: "Inútil", classes: "border-red-300 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100" },
] as const;

function pickPrimaryFlag(i: MobiliarioUltimo & { id: string }): FlagKey | null {
  for (const k of FLAG_PRIORITY) {
    if ((i as Record<FlagKey, boolean | undefined>)[k]) return k;
  }
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
    case "privado":
      return "bg-fuchsia-50 dark:bg-fuchsia-950/30 border-fuchsia-300 dark:border-fuchsia-600 ring-1 ring-fuchsia-200/60 dark:ring-fuchsia-700/40";
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
    case "privado":
      return "border-l-4 border-fuchsia-400";
    case "no_dado":
      return "border-l-4 border-slate-400";
    default:
      return "border-l-4 border-transparent";
  }
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
    case "malo":
      return {
        label: "Malo",
        classes:
          "bg-orange-100 text-orange-800 ring-orange-300/70 dark:bg-orange-500/15 dark:text-orange-200 dark:ring-orange-400/30",
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

function FlagsBadges({ item }: { item: MobiliarioUltimo }) {
  const entries: Array<[FlagKey, boolean]> = [
    ["faltante", !!item.faltante],
    ["para_baja", !!item.para_baja],
    ["para_reparacion", !!item.para_reparacion],
    ["sobrante", !!item.sobrante],
    ["problema_etiqueta", !!item.problema_etiqueta],
    ["privado", !!item.privado],
    ["no_dado", !!item.no_dado],
  ];

  const actives = entries.filter(([, v]) => v);
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

function countFlag(
  items: (MobiliarioUltimo & { id: string })[],
  flag: FlagKey
) {
  return items.filter((item) => Boolean((item as Partial<Record<FlagKey, boolean>>)[flag])).length;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatValor(value: MobiliarioUltimo["valor"]) {
  if (value === undefined || value === null || value === "") return "-";

  const parsed =
    typeof value === "number"
      ? value
      : (() => {
          const raw = String(value).replace(/\s+/g, "");
          const normalized = raw.includes(",")
            ? raw.replace(/\./g, "").replace(/,/g, ".")
            : raw;
          return Number(normalized);
        })();

  if (!Number.isFinite(parsed)) return String(value);

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(parsed);
}

const INITIAL_VISIBLE_ITEMS = 80;
const LOAD_MORE_ITEMS = 80;
const LISTADOS_SELECTED_KEY = "patrimonio:listados:selected";

function normalizarUltimos(data: MobiliarioUltimo[]) {
  return data.map((d) => ({ ...d, id: String(d.id_mobiliario) }));
}

export default function Listings() {
  const router = useRouter();
  const [lista, setLista] = useState<(MobiliarioUltimo & { id: string })[]>([]);
  const [selected, setSelected] = useState<(MobiliarioUltimo & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showReparacion, setShowReparacion] = useState(false);
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [lastEditor, setLastEditor] = useState<string | null>(null);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [updatingFaltante, setUpdatingFaltante] = useState(false);
  const [updatingEtiqueta, setUpdatingEtiqueta] = useState(false);
  const [updatingEstado, setUpdatingEstado] = useState(false);
  const [quickPhotoLoading, setQuickPhotoLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterFlag, setFilterFlag] = useState<FlagKey | "todos">("todos");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ITEMS);
  const deferredBusqueda = useDeferredValue(busqueda);
  const inventoryRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const quickPhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancel = false;
    const cached = readCachedUltimosMobiliarios();
    const selectedId =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(LISTADOS_SELECTED_KEY)
        : null;

    if (cached?.length) {
      const normalizado = normalizarUltimos(cached);
      setLista(normalizado);
      setSelected(
        normalizado.find((item) => item.id === selectedId) ?? normalizado[0] ?? null
      );
      setLoading(false);
      setRefreshing(true);
    }

    obtenerUltimosMobiliarios({ force: true })
      .then((data) => {
        if (cancel) return;
        const normalizado = normalizarUltimos(data);
        setLista(normalizado);
        setSelected((prev) => {
          const preferredId = prev?.id || selectedId;
          return (
            normalizado.find((item) => item.id === preferredId) ??
            normalizado[0] ??
            null
          );
        });
      })
      .catch(() => {
        if (!cached?.length) toast.error("Error al cargar datos");
      })
      .finally(() => {
        if (!cancel) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!selected?.id) {
      setLastEditor(null);
      return;
    }

    let cancel = false;
    setLoadingEditor(true);

    const base = process.env.NEXT_PUBLIC_API_BASE;
    const url = `${base}/mobiliario/${encodeURIComponent(selected.id)}/ultimo-editor`;

    fetch(url, { cache: "no-store", credentials: "include" })
      .then((r) => (r.ok ? r.json() : { usuario: null }))
      .then((data) => {
        if (cancel) return;
        setLastEditor(data?.usuario?.trim() || null);
      })
      .catch(() => {
        if (!cancel) setLastEditor(null);
      })
      .finally(() => {
        if (!cancel) setLoadingEditor(false);
      });

    return () => {
      cancel = true;
    };
  }, [selected?.id, selected?.fecha_actualizacion]);

  const filtrados = useMemo(() => {
    const raw = deferredBusqueda ?? "";
    const term = normalizeText(raw);

    const isNumeric = /^\d+$/.test(term);
    const termNum = isNumeric ? parseInt(term, 10) : null;

    return lista.filter((i) => {
      const idRaw = String(i.id ?? "").trim();
      const matchesFlag =
        filterFlag === "todos" ||
        Boolean((i as Partial<Record<FlagKey, boolean>>)[filterFlag]);

      if (!matchesFlag) return false;
      if (!term) return true;

      if (isNumeric) {
        const idNum = /^\d+$/.test(idRaw) ? parseInt(idRaw, 10) : null;
        return idNum !== null ? idNum === termNum : idRaw.toLowerCase() === term;
      }

      return normalizeText(
        [
          i.descripcion,
          i.anexo,
          i.subdependencia,
          i.vehiculo,
          i.rubro,
          i.clase_bien,
          i.estado_conservacion,
          i.comentarios,
        ].join(" ")
      ).includes(term);
    });
  }, [lista, deferredBusqueda, filterFlag]);

  const displayedFiltrados = useMemo(
    () => filtrados.slice(0, visibleCount),
    [filtrados, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_ITEMS);
  }, [deferredBusqueda, filterFlag]);

  const isMobileLayout = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 1023px)").matches;

  const handleSelect = (item: MobiliarioUltimo & { id: string }) => {
    setSelected(item);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(LISTADOS_SELECTED_KEY, item.id);
    }

    if (isMobileLayout()) {
      window.requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const handleInventoryScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const nearBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 360;

    if (!nearBottom || visibleCount >= filtrados.length) return;

    setVisibleCount((current) =>
      Math.min(current + LOAD_MORE_ITEMS, filtrados.length)
    );
  };

  const scrollToInventory = () => {
    if (!isMobileLayout()) return;
    inventoryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const applyFaltanteState = (id: string, faltante: boolean) => {
    setLista((prev) =>
      prev.map((item) => (item.id === id ? { ...item, faltante } : item))
    );
    setSelected((prev) =>
      prev?.id === id ? { ...prev, faltante } : prev
    );
    patchCachedUltimoMobiliario(id, { faltante });
  };

  const applyProblemaEtiquetaState = (id: string, problema_etiqueta: boolean) => {
    setLista((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, problema_etiqueta } : item
      )
    );
    setSelected((prev) =>
      prev?.id === id ? { ...prev, problema_etiqueta } : prev
    );
    patchCachedUltimoMobiliario(id, { problema_etiqueta });
  };

  const applyReparacionState = (id: string, para_reparacion: boolean) => {
    setLista((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, para_reparacion } : item
      )
    );
    setSelected((prev) =>
      prev?.id === id ? { ...prev, para_reparacion } : prev
    );
    patchCachedUltimoMobiliario(id, { para_reparacion });
  };

  const applyFotoState = (
    id: string,
    patch: Pick<MobiliarioUltimo, "foto_url" | "foto_url_2"> &
      Partial<Pick<MobiliarioUltimo, "fecha_actualizacion">>
  ) => {
    setLista((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
    setSelected((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
    patchCachedUltimoMobiliario(id, patch);
  };

  const applyEstadoState = (
    id: string,
    estado_conservacion: string,
    fecha_actualizacion?: string | null
  ) => {
    const patch = fecha_actualizacion
      ? { estado_conservacion, fecha_actualizacion }
      : { estado_conservacion };
    setLista((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
    setSelected((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
    patchCachedUltimoMobiliario(id, patch);
  };

  const handleChangeEstado = async (estado: string) => {
    if (!selected || viewer) return;
    try {
      setUpdatingEstado(true);
      const result = await actualizarEstadoMobiliario(selected.id, estado);
      applyEstadoState(
        selected.id,
        result.estado_conservacion,
        result.fecha_actualizacion
      );
      setShowEstadoModal(false);
      toast.success(`Estado actualizado a ${result.estado_conservacion}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo actualizar el estado"
      );
    } finally {
      setUpdatingEstado(false);
    }
  };

  const handleQuickPhotoChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!selected || !file) return;

    if (viewer) {
      toast.error("No autorizado: tu usuario es de solo lectura.");
      event.target.value = "";
      return;
    }

    try {
      setQuickPhotoLoading(true);
      const slot: 1 | 2 = selected.foto_url && !selected.foto_url_2 ? 2 : 1;
      const fotoField = slot === 1 ? "foto_url" : "foto_url_2";
      const fotoUrl = await uploadMobiliarioImage(file);
      const data = await actualizarFotoMobiliario(selected.id, fotoUrl, slot);
      const patch: Pick<MobiliarioUltimo, "foto_url" | "foto_url_2"> &
        Partial<Pick<MobiliarioUltimo, "fecha_actualizacion">> = {
        foto_url: selected.foto_url,
        foto_url_2: selected.foto_url_2,
        [fotoField]: fotoUrl,
      };
      if ("fecha_actualizacion" in data && data.fecha_actualizacion) {
        patch.fecha_actualizacion = data.fecha_actualizacion;
      }
      applyFotoState(selected.id, patch);
      toast.success(slot === 1 ? "Foto actualizada correctamente" : "Segunda foto agregada");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar la foto"
      );
    } finally {
      setQuickPhotoLoading(false);
      event.target.value = "";
    }
  };

  const handleToggleFaltante = async () => {
    if (!selected) return;

    if (isViewer()) {
      toast.error("No autorizado: tu usuario es de solo lectura.");
      return;
    }

    const nextFaltante = !selected.faltante;

    try {
      setUpdatingFaltante(true);
      await actualizarFaltanteMobiliario(selected.id, nextFaltante);
      applyFaltanteState(selected.id, nextFaltante);
      toast.success(
        nextFaltante ? "Marcado como faltante" : "Faltante quitado"
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al actualizar faltante"
      );
    } finally {
      setUpdatingFaltante(false);
    }
  };

  const handleToggleProblemaEtiqueta = async () => {
    if (!selected) return;

    if (isViewer()) {
      toast.error("No autorizado: tu usuario es de solo lectura.");
      return;
    }

    const nextEtiqueta = !selected.problema_etiqueta;

    try {
      setUpdatingEtiqueta(true);
      await actualizarProblemaEtiquetaMobiliario(selected.id, nextEtiqueta);
      applyProblemaEtiquetaState(selected.id, nextEtiqueta);
      toast.success(
        nextEtiqueta ? "Etiqueta marcada con problema" : "Problema de etiqueta quitado"
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al actualizar etiqueta"
      );
    } finally {
      setUpdatingEtiqueta(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;

    if (!canDeleteMobiliario()) {
      toast.error("No autorizado: solo Hernan puede eliminar mobiliario.");
      setShowConfirm(false);
      return;
    }

    try {
      setDeleting(true);
      await eliminarMobiliario(selected.id);
      setLista((prev) => prev.filter((m) => m.id !== selected.id));
      setSelected(null);
      toast.success("Eliminado correctamente");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(`Error al eliminar: ${error.message}`);
      } else {
        toast.error("Error al eliminar: Intente nuevamente");
      }
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleDuplicate = async (cantidad: number) => {
    if (!selected) return;

    if (isViewer()) {
      toast.error("No autorizado: tu usuario es de solo lectura.");
      setShowDuplicateModal(false);
      return;
    }

    try {
      setDuplicating(true);
      const result = await duplicarMobiliario(selected.id, cantidad);
      const data = await obtenerUltimosMobiliarios({ force: true });
      const normalizado = normalizarUltimos(data);
      setLista(normalizado);
      setSelected(normalizado.find((item) => item.id === selected.id) ?? normalizado[0] ?? null);
      setShowDuplicateModal(false);
      toast.success(
        `Duplicado: ${result.ids_generados.length} nuevo${result.ids_generados.length === 1 ? "" : "s"}`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al duplicar mobiliario"
      );
    } finally {
      setDuplicating(false);
    }
  };

  const viewer = isViewer();
  const canDelete = canDeleteMobiliario();
  const primaryFlag = selected ? pickPrimaryFlag(selected) : null;
  const alertas =
    countFlag(lista, "faltante") +
    countFlag(lista, "para_baja") +
    countFlag(lista, "para_reparacion") +
    countFlag(lista, "problema_etiqueta");
  const numerosDados = countFlag(lista, "no_dado");
  const bienesSinAlertas = lista.filter(
    (item) =>
      !item.faltante &&
      !item.para_baja &&
      !item.para_reparacion &&
      !item.problema_etiqueta
  ).length;
  const filterOptions: Array<{ key: FlagKey | "todos"; label: string; count: number }> = [
    { key: "todos", label: "Todos", count: lista.length },
    { key: "faltante", label: "Faltantes", count: countFlag(lista, "faltante") },
    { key: "para_baja", label: "Para baja", count: countFlag(lista, "para_baja") },
    { key: "para_reparacion", label: "Reparación", count: countFlag(lista, "para_reparacion") },
    { key: "problema_etiqueta", label: "Etiqueta", count: countFlag(lista, "problema_etiqueta") },
    { key: "sobrante", label: "Sobrantes", count: countFlag(lista, "sobrante") },
    { key: "no_dado", label: "Numeros dados", count: numerosDados },
  ];

  return (
    <Wrapper>
      <section className="mx-auto w-full max-w-7xl overflow-x-hidden space-y-4 pb-24 sm:space-y-5 sm:pb-10">
        <Toaster />

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-[1.35fr_1fr] lg:p-6">
            <div className="flex min-w-0 flex-col justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                  Sistema de patrimonio
                </p>
                <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white md:text-3xl">
                  Listados
                </h1>
                <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-slate-600 sm:block dark:text-slate-300">
                  Inventario actualizado con detalle, imagen, historial y
                  acciones rapidas para el relevamiento diario.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 sm:text-xs">
                <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-cyan-800 ring-1 ring-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-200 dark:ring-cyan-400/20">
                  <FaLayerGroup className="shrink-0" />
                  {filterFlag === "todos" ? "Vista completa" : "Filtro activo"}
                </span>
                <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-amber-800 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/20">
                  <FaExclamationTriangle className="shrink-0" />
                  <span className="sm:hidden">Alertas: {alertas}</span>
                  <span className="hidden sm:inline">
                    Alertas: faltante, baja, reparacion o etiqueta
                  </span>
                </span>
                <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700">
                  <FaHashtag className="shrink-0" />
                  Numeros dados: {numerosDados}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <FaBoxes className="text-cyan-700 dark:text-cyan-300" />
                <p className="mt-2 text-xl font-black text-slate-950 sm:mt-3 sm:text-2xl dark:text-white">
                  {lista.length}
                </p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Bienes
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <FaSearch className="text-indigo-700 dark:text-indigo-300" />
                <p className="mt-2 text-xl font-black text-slate-950 sm:mt-3 sm:text-2xl dark:text-white">
                  {filtrados.length}
                </p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Visibles
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <FaExclamationTriangle className="text-amber-700 dark:text-amber-300" />
                <p className="mt-2 text-xl font-black text-slate-950 sm:mt-3 sm:text-2xl dark:text-white">
                  {alertas}
                </p>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                  Alertas
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <FaCheckCircle className="text-emerald-700 dark:text-emerald-300" />
                <p className="mt-2 text-xl font-black text-slate-950 sm:mt-3 sm:text-2xl dark:text-white">
                  {bienesSinAlertas}
                </p>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                  Sin alertas
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Cargando inventario...
          </div>
        ) : !lista.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            No hay registros.
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="relative">
                  <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 sm:left-4" />
                  <input
                    type="text"
                    placeholder="Buscar ID o descripcion"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100 sm:pl-11 sm:pr-4 sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/10"
                  />
                </div>

                <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  <FaFilter className="text-cyan-700 dark:text-cyan-300" />
                  {filtrados.length} visibles
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {filterOptions.map((option) => {
                  const isActive = filterFlag === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setFilterFlag(option.key)}
                      className={[
                        "inline-flex min-w-0 items-center justify-center gap-2 rounded-xl border px-2 py-2 text-[11px] font-bold transition sm:px-3 sm:text-xs",
                        isActive
                          ? "border-cyan-600 bg-cyan-700 text-white shadow-sm shadow-cyan-900/20"
                          : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:text-cyan-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-cyan-500 dark:hover:text-cyan-200",
                      ].join(" ")}
                    >
                      <span className="min-w-0 truncate">{option.label}</span>
                      <span
                        className={[
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px]",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                        ].join(" ")}
                      >
                        {option.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,2fr)]">
            <div
              ref={inventoryRef}
              onScroll={handleInventoryScroll}
              className="max-h-[430px] scroll-mt-28 overflow-y-auto pr-1 lg:sticky lg:top-24 lg:max-h-[calc(100vh-190px)]"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#94a3b8 transparent",
              }}
            >
              <div className="mb-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Inventario
                  </p>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    Bienes recientes
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {filtrados.length}
                </span>
                {refreshing && (
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-bold text-cyan-700 ring-1 ring-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-200 dark:ring-cyan-400/20">
                    Actualizando
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {displayedFiltrados.map((item) => {
                  const isSelected = selected?.id === item.id;
                  const flag = pickPrimaryFlag(item);

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSelect(item);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={[
                        "group cursor-pointer rounded-2xl border bg-white p-3 text-sm shadow-sm outline-none transition hover:-translate-y-0.5 hover:shadow-md focus:ring-4 focus:ring-cyan-100 sm:p-4 dark:bg-slate-900 dark:focus:ring-cyan-400/10",
                        isSelected
                          ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-200 dark:border-cyan-400 dark:bg-cyan-500/10 dark:ring-cyan-400/20"
                          : "border-slate-200 hover:border-cyan-300 dark:border-slate-800 dark:hover:border-cyan-600",
                        listAccentByFlag(flag),
                      ].join(" ")}
                    >
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <p className="line-clamp-3 min-w-0 break-words font-black leading-5 text-slate-950 sm:line-clamp-2 dark:text-white">
                          {item.descripcion || "Sin descripcion"}
                        </p>
                        {flag && (
                          <span className="w-fit shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {FLAG_META[flag].label}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 max-w-full overflow-hidden">
                        <EstadoIdBadge
                          id={item.id}
                          estado={item.estado_conservacion}
                        />
                      </div>

                      <FlagsBadges item={item} />
                      <div className="mt-3 grid grid-cols-1 gap-1 text-xs font-semibold text-slate-500 sm:grid-cols-2 dark:text-slate-400">
                        <span className="min-w-0 truncate">
                          {item.anexo || "Sin anexo"}
                        </span>
                        <span className="min-w-0 truncate">
                          {item.subdependencia || "Sin subdependencia"}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {!filtrados.length && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    Sin resultados.
                  </div>
                )}

                {visibleCount < filtrados.length && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((current) =>
                        Math.min(current + LOAD_MORE_ITEMS, filtrados.length)
                      )
                    }
                    className="w-full rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-800 transition hover:bg-cyan-100 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-100 dark:hover:bg-cyan-500/20"
                  >
                    Mostrar mas ({Math.min(LOAD_MORE_ITEMS, filtrados.length - visibleCount)})
                  </button>
                )}
              </div>
            </div>

            <div
              ref={detailRef}
              className="scroll-mt-28 self-start lg:sticky lg:top-24"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Detalle
                  </p>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    Mobiliario seleccionado
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={scrollToInventory}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 sm:w-auto lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-500 dark:hover:text-cyan-200"
                >
                  Volver al inventario
                </button>
              </div>

              {!selected ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  Selecciona un mobiliario para ver los detalles.
                </div>
              ) : (
                <div
                  className={[
                    "grid grid-cols-1 gap-4 overflow-hidden rounded-2xl border p-3 shadow-sm sm:gap-6 sm:p-5 md:grid-cols-[minmax(0,1fr)_310px]",
                    containerClassesByFlag(primaryFlag),
                  ].join(" ")}
                >
                  {primaryFlag && (
                    <div className="md:col-span-2 -mb-1">
                      <div className="flex items-center gap-2 rounded-xl border border-white/50 bg-white/70 px-3 py-2 text-slate-800 dark:border-white/10 dark:bg-black/20 dark:text-slate-100">
                        <span className="h-2 w-2 rounded-full bg-current" />
                        <p className="min-w-0 break-words text-sm font-bold">
                          {primaryFlag === "no_dado" ? "Dato principal: " : "Estado principal: "}
                          <span>{FLAG_META[primaryFlag].label}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="min-w-0 space-y-4 text-sm text-slate-700 dark:text-slate-300">
                    <div className="space-y-3">
                      <EstadoIdBadge
                        id={selected.id}
                        estado={selected.estado_conservacion}
                      />
                      <h3 className="break-words text-lg font-black leading-tight text-slate-950 sm:text-xl dark:text-white">
                        {selected.descripcion || "Sin descripcion"}
                      </h3>
                      <FlagsBadges item={selected} />
                      <button
                        type="button"
                        disabled={viewer || quickPhotoLoading}
                        onClick={() => quickPhotoInputRef.current?.click()}
                        title={
                          viewer
                            ? "Solo lectura: no podes actualizar fotos."
                            : "Tomar foto"
                        }
                        aria-disabled={viewer || quickPhotoLoading}
                        className={`hidden h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition sm:inline-flex sm:w-auto ${
                          viewer || quickPhotoLoading
                            ? "cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                            : "bg-cyan-700 text-white hover:bg-cyan-800"
                        }`}
                      >
                        <FaCamera />
                        {quickPhotoLoading ? "Subiendo..." : "Tomar foto"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <p className="min-w-0 break-words rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10">
                        <strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Clase</strong>
                        {selected.clase_bien || "-"}
                      </p>
                      <p className="min-w-0 break-words rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10">
                        <strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Rubro</strong>
                        {selected.rubro || "-"}
                      </p>
                      <p className="min-w-0 break-words rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10">
                        <strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Anexo</strong>
                        {selected.anexo || "-"}
                      </p>
                      <p className="min-w-0 break-words rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10">
                        <strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Subdependencia</strong>
                        {selected.subdependencia || "-"}
                      </p>
                      {visibleVehicle(selected) && (
                        <p className="min-w-0 break-words rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10">
                          <strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Vehículo</strong>
                          {visibleVehicle(selected)}
                        </p>
                      )}
                      {(() => {
                        const { numero, tipo } = parseResol(selected.resolucion ?? null);
                        return (
                          <>
                            <p className="min-w-0 break-words rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10">
                              <strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Resol Nro.</strong>
                              {numero || "-"}
                            </p>
                            <p className="min-w-0 break-words rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10">
                              <strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Tipo</strong>
                              {tipo || "-"}
                            </p>
                          </>
                        );
                      })()}

                      <p className="min-w-0 break-words rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10">
                        <strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Fecha resolucion</strong>
                        {formatMobiliarioDate(selected.fecha_resolucion, "date")}
                      </p>
                      <p className="min-w-0 break-words rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10">
                        <strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Valor</strong>
                        {formatValor(selected.valor)}
                      </p>
                      <p className="min-w-0 break-words rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10">
                        <strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Estado</strong>
                        {selected.estado_conservacion || "-"}
                      </p>
                      <p className="min-w-0 break-words rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10">
                        <strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Actualizado</strong>
                        {formatMobiliarioDate(selected.fecha_actualizacion, "datetime")}
                      </p>
                      <p className="min-w-0 break-words rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10 md:col-span-2">
                        <strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Comentarios</strong>
                        {selected.comentarios || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                  <MobiliarioPhotoGallery
                    photos={[selected.foto_url, selected.foto_url_2]}
                    alt={selected.descripcion || "Foto del mobiliario"}
                  />

                  <div className="min-w-0 break-words rounded-2xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-700 sm:p-4 dark:border-white/10 dark:bg-black/15 dark:text-slate-300">
                    <p>
                      <strong>Creado:</strong>{" "}
                      {formatMobiliarioDate(selected.fecha_creacion, "datetime")}
                    </p>
                    <div className="relative mt-3 inline-flex min-h-10 w-full items-center gap-2 overflow-hidden rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 font-bold text-cyan-950 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-100">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-500 opacity-50" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-700 dark:bg-cyan-300" />
                      </span>
                      <FaUserEdit className="shrink-0" />
                      <span className="min-w-0 break-words">
                        {loadingEditor
                          ? "Buscando última edición..."
                          : `Última edición: ${lastEditor || "usuario no registrado"}`}
                      </span>
                    </div>
                  </div>
                  </div>

                  <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white/70 p-3 sm:p-4 dark:border-white/10 dark:bg-black/15">
                    <div className="flex flex-col items-stretch gap-3 xl:flex-row xl:items-center">
                    <input
                      ref={quickPhotoInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleQuickPhotoChange}
                    />

                    <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1800px]:grid-cols-5">
                    <button
                      type="button"
                      disabled={viewer || quickPhotoLoading}
                      onClick={() => quickPhotoInputRef.current?.click()}
                      title={
                        viewer
                          ? "Solo lectura: no podes actualizar fotos."
                          : "Tomar foto"
                      }
                      aria-disabled={viewer || quickPhotoLoading}
                      className={`order-2 col-span-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black shadow-sm transition sm:hidden ${
                        viewer || quickPhotoLoading
                          ? "cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                          : "bg-cyan-700 text-white hover:bg-cyan-800"
                      }`}
                    >
                      <FaCamera />
                      {quickPhotoLoading ? "Subiendo..." : "Tomar foto"}
                    </button>
                    <button
                      type="button"
                      disabled={viewer || updatingEstado}
                      onClick={() => !viewer && setShowEstadoModal(true)}
                      title={viewer ? "Solo lectura: no podes cambiar el estado." : "Cambiar estado"}
                      className={`order-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition xl:order-none ${
                        viewer || updatingEstado
                          ? "cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                          : "bg-teal-700 text-white hover:bg-teal-800"
                      }`}
                    >
                      <FaCheckCircle />
                      {updatingEstado ? "Guardando..." : "Estado"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReparacion(true)}
                      title="Ver historial de reparaciones"
                      className={`order-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-white transition xl:order-none ${
                        selected.para_reparacion
                          ? "bg-amber-700 hover:bg-amber-800"
                          : "bg-amber-500 hover:bg-amber-600"
                      }`}
                    >
                      <FaWrench />
                      {selected.para_reparacion ? "En reparación" : "Reparación"}
                    </button>
                    {isMatafuegoMobiliario(selected) && matafuegosHref(selected) && (
                      <Link
                        href={matafuegosHref(selected) ?? "#"}
                        className="order-4 col-span-2 w-full sm:col-span-1 xl:order-none"
                      >
                        <button
                          type="button"
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-bold text-white transition hover:bg-red-700"
                          title="Abrir control de matafuegos"
                        >
                          <FaFire /> Matafuegos
                        </button>
                      </Link>
                    )}
                    <button
                      disabled={viewer || updatingFaltante}
                      onClick={handleToggleFaltante}
                      title={
                        viewer
                          ? "Solo lectura: no podes cambiar faltante."
                          : selected.faltante
                            ? "Quitar faltante"
                            : "Marcar como faltante"
                      }
                      aria-disabled={viewer || updatingFaltante}
                      className={`order-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition xl:order-none ${
                        viewer || updatingFaltante
                          ? "cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                          : selected.faltante
                            ? "bg-rose-700 text-white hover:bg-rose-800"
                            : "bg-rose-500 text-white hover:bg-rose-600"
                      }`}
                    >
                      <FaExclamationTriangle />
                      {updatingFaltante
                        ? "Guardando..."
                        : selected.faltante
                          ? "Quitar"
                        : "Faltante"}
                    </button>

                    <button
                      disabled={viewer || updatingEtiqueta}
                      onClick={handleToggleProblemaEtiqueta}
                      title={
                        viewer
                          ? "Solo lectura: no podes cambiar etiqueta."
                          : selected.problema_etiqueta
                            ? "Sacar etiqueta"
                            : "Marcar problema de etiqueta"
                      }
                      aria-disabled={viewer || updatingEtiqueta}
                      className={`order-3 col-span-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black shadow-sm transition sm:col-span-1 xl:order-none xl:h-11 ${
                        viewer || updatingEtiqueta
                          ? "cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                          : selected.problema_etiqueta
                            ? "bg-violet-700 text-white hover:bg-violet-800"
                            : "bg-violet-600 text-white hover:bg-violet-700"
                      }`}
                    >
                      <FaTag />
                      {updatingEtiqueta
                        ? "Guardando..."
                        : selected.problema_etiqueta
                          ? "Sacar etiqueta"
                          : "Problema etiqueta"}
                    </button>

                    <button
                      disabled={viewer}
                      onClick={() => {
                        if (!viewer) {
                          router.push(`/Etiquetas?bien=${encodeURIComponent(selected.id)}`);
                        }
                      }}
                      title={
                        viewer
                          ? "Solo lectura: no tenes permiso para generar la etiqueta."
                          : "Ver etiqueta"
                      }
                      aria-disabled={viewer}
                      className={`order-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition xl:order-none ${
                        viewer
                          ? "cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      <FaTag /> Etiqueta
                    </button>

                    <button
                      disabled={viewer}
                      onClick={() => !viewer && setShowDuplicateModal(true)}
                      title={viewer ? "Solo lectura: no podes duplicar." : "Duplicar"}
                      aria-disabled={viewer}
                      className={`order-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition xl:order-none ${
                        viewer
                          ? "cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      <FaCopy /> Duplicar
                    </button>

                    <Link
                      href={viewer ? "#" : `/patrimonio/editar/${selected.id}`}
                      className="order-1 col-span-2 w-full sm:col-span-1 xl:order-none"
                      onClick={(e) => {
                        if (viewer) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                    >
                      <button
                        disabled={viewer}
                        title={viewer ? "Solo lectura: no podes editar." : "Editar"}
                        aria-disabled={viewer}
                        className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black shadow-sm transition xl:h-11 ${
                          viewer
                            ? "cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                            : "bg-amber-500 text-white hover:bg-amber-600"
                        }`}
                      >
                        <FaEdit /> Editar
                      </button>
                    </Link>

                    <button
                      disabled={!canDelete}
                      onClick={() => canDelete && setShowConfirm(true)}
                      title={
                        canDelete
                          ? "Eliminar"
                          : "Solo Hernan puede eliminar mobiliario."
                      }
                      aria-disabled={!canDelete}
                      className={`order-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition xl:order-none ${
                        !canDelete
                          ? "cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                          : "bg-red-600 text-white hover:bg-red-700"
                      }`}
                    >
                      <FaTrash /> Eliminar
                    </button>

                    <button
                      onClick={() => setShowHistorial(true)}
                      className="order-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white transition hover:bg-indigo-700 xl:order-none"
                      title="Ver historial"
                    >
                      <FaClock /> Historial
                    </button>
                    </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          </>
        )}

        {showEstadoModal && selected && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-4 py-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="estado-modal-title"
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
                    ID {selected.id}
                  </p>
                  <h2 id="estado-modal-title" className="mt-1 text-xl font-black text-slate-950 dark:text-white">
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
                  title="Cerrar"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {CONSERVATION_OPTIONS.map((option) => {
                  const selectedOption =
                    normalizeEstado(selected.estado_conservacion) === normalizeEstado(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChangeEstado(option.value)}
                      disabled={updatingEstado || selectedOption}
                      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-black transition ${option.classes} ${
                        selectedOption ? "ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-slate-950" : ""
                      } disabled:cursor-not-allowed disabled:opacity-65`}
                    >
                      <FaCheckCircle className={selectedOption ? "opacity-100" : "opacity-50"} />
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
          title="Eliminar mobiliario?"
          message="Esta accion no se puede deshacer."
        />

        <DuplicateMobiliarioModal
          isOpen={showDuplicateModal}
          itemId={selected?.id}
          loading={duplicating}
          onCancel={() => setShowDuplicateModal(false)}
          onConfirm={handleDuplicate}
        />

        {selected && (
          <HistorialModal
            isOpen={showHistorial}
            onClose={() => setShowHistorial(false)}
            tabla="mobiliario"
            idRegistro={selected.id}
          />
        )}

        {selected && (
          <ReparacionModal
            isOpen={showReparacion}
            onClose={() => setShowReparacion(false)}
            mobiliarioId={selected.id}
            descripcion={selected.descripcion}
            paraReparacion={Boolean(selected.para_reparacion)}
            readOnly={viewer}
            onChanged={(paraReparacion) =>
              applyReparacionState(selected.id, paraReparacion)
            }
          />
        )}

      </section>
    </Wrapper>
  );
}
