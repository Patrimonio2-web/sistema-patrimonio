//
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  obtenerUltimosMobiliarios,
  obtenerMobiliariosPorUbicacion,
  eliminarMobiliario,
  actualizarFaltanteMobiliario,
  actualizarProblemaEtiquetaMobiliario,
  actualizarFotoMobiliario,
  duplicarMobiliario,
  actualizarEstadoMobiliario,
  actualizarUbicacionMobiliario,
} from "@/services/mobiliarioService";
import {
  obtenerAnexos,
  obtenerSubdependencias,
  type AnexoResponse,
  type SubdependenciaResponse,
} from "@/services/anexosService";
import type { MobiliarioUltimo } from "@/types/types";
import { toast } from "react-hot-toast";
import {
  ConfirmModal,
  DuplicateMobiliarioModal,
  HistorialModal,
  ReparacionModal,
} from "@/components";
import {
  FaArrowLeft,
  FaCopy,
  FaEdit,
  FaTrash,
  FaTag,
  FaClock,
  FaExclamationTriangle,
  FaHome,
  FaListUl,
  FaSearch,
  FaCamera,
  FaFire,
  FaCheckCircle,
  FaTimes,
  FaUserEdit,
  FaWrench,
  FaExchangeAlt,
  FaCheckSquare,
  FaRegSquare,
} from "react-icons/fa";
import { canDeleteMobiliario, isComisario, isViewer } from "@/services/authRole";
import { formatMobiliarioDate } from "@/lib/dateFormat";
import { buildSubdependenciaPath } from "@/lib/returnPath";
import { isVirtualSubdependenciaName } from "@/lib/subdependenciaVisibility";
import MobiliarioPhotoGallery from "@/components/MobiliarioPhotoGallery";
import { uploadMobiliarioImage } from "@/lib/imageUpload";
import { visibleVehicle } from "@/lib/mobiliarioVehicle";

function normalize(s?: string | null) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // NO borrar prefijos numéricos ("1107 - recepcion")
    .replace(/\s+/g, " ")
    .trim();
}

function formatValor(value: MobiliarioUltimo["valor"]) {
  if (value === undefined || value === null || value === "") return "—";

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

function isMatafuegoMobiliario(item?: MobiliarioUltimo | null) {
  if (!item) return false;
  const text = [item.descripcion, item.clase_bien, item.rubro]
    .map(normalize)
    .join(" ");
  return (
    text.includes("matafuego") ||
    text.includes("mata fuego") ||
    text.includes("mata-fuego") ||
    text.includes("extintor")
  );
}

function matafuegosAnexoId(item?: MobiliarioUltimo | null) {
  const idAnexo = item?.id_anexo;
  return idAnexo === undefined || idAnexo === null || idAnexo === "" ? null : idAnexo;
}

function matafuegosHref(item?: MobiliarioUltimo | null) {
  const idAnexo = matafuegosAnexoId(item);
  if (!idAnexo) return null;
  if (item?.id_mobiliario) {
    return `/matafuegos?mobiliario=${encodeURIComponent(String(item.id_mobiliario))}`;
  }
  return `/matafuegos/anexo/${idAnexo}`;
}

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

function pickPrimaryFlag(i: MobiliarioUltimo): FlagKey | null {
  const ref = i as Partial<Record<FlagKey, boolean>>;
  for (const k of FLAG_PRIORITY) if (ref[k]) return k;
  return null;
}

function containerClassesByFlag(flag: FlagKey | null) {
  if (!flag) return "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600";
  switch (flag) {
    case "faltante": return "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-600 ring-1 ring-rose-200/60 dark:ring-rose-700/40";
    case "para_baja": return "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-600 ring-1 ring-red-200/60 dark:ring-red-700/40";
    case "para_reparacion": return "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-600 ring-1 ring-amber-200/60 dark:ring-amber-700/40";
    case "sobrante": return "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-600 ring-1 ring-cyan-200/60 dark:ring-cyan-700/40";
    case "problema_etiqueta": return "bg-violet-50 dark:bg-violet-950/30 border-violet-300 dark:border-violet-600 ring-1 ring-violet-200/60 dark:ring-violet-700/40";
    case "no_dado": return "bg-slate-50 dark:bg-slate-900/40 border-slate-300 dark:border-slate-600 ring-1 ring-slate-200/60 dark:ring-slate-700/40";
  }
}

function listAccentByFlag(flag: FlagKey | null) {
  switch (flag) {
    case "faltante": return "border-l-4 border-rose-400";
    case "para_baja": return "border-l-4 border-red-400";
    case "para_reparacion": return "border-l-4 border-amber-400";
    case "sobrante": return "border-l-4 border-cyan-400";
    case "problema_etiqueta": return "border-l-4 border-violet-400";
    case "no_dado": return "border-l-4 border-slate-400";
    default: return "border-l-4 border-transparent";
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
  const ref = item as Partial<Record<FlagKey, boolean>>;
  const actives = (Object.keys(FLAG_META) as FlagKey[]).filter(k => !!ref[k]);
  if (!actives.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {actives.map(k => (
        <span key={k} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${FLAG_META[k].badge}`}>
          {FLAG_META[k].label}
        </span>
      ))}
    </div>
  );
}

export default function MobiliarioPorSubdependencia() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const nombre = decodeURIComponent(params.nombre as string);

  // Extrae el número inicial si viene "905 - RECEPCION"
  const rawId = searchParams.get("id");
  const match = rawId?.match(/^\s*(\d+)/);
  const ubicacionId = match ? Number(match[1]) : null;

  const [mobiliarios, setMobiliarios] = useState<MobiliarioUltimo[]>([]);
  const [filtered, setFiltered] = useState<MobiliarioUltimo[]>([]);
  const [selected, setSelected] = useState<MobiliarioUltimo | null>(null);
  const [search, setSearch] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showReparacion, setShowReparacion] = useState(false);
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [updatingEstado, setUpdatingEstado] = useState(false);
  const [lastEditor, setLastEditor] = useState<string | null>(null);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [updatingFaltante, setUpdatingFaltante] = useState(false);
  const [updatingEtiqueta, setUpdatingEtiqueta] = useState(false);
  const [quickPhotoLoading, setQuickPhotoLoading] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [transferMode, setTransferMode] = useState(false);
  const [selectedForTransfer, setSelectedForTransfer] = useState<Set<string>>(
    () => new Set()
  );
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAnexos, setTransferAnexos] = useState<AnexoResponse[]>([]);
  const [transferSubdependencias, setTransferSubdependencias] = useState<
    SubdependenciaResponse[]
  >([]);
  const [targetAnexoId, setTargetAnexoId] = useState("");
  const [targetSubdependenciaId, setTargetSubdependenciaId] = useState("");
  const [loadingTransferAnexos, setLoadingTransferAnexos] = useState(false);
  const [loadingTransferSubdependencias, setLoadingTransferSubdependencias] = useState(false);
  const [movingItems, setMovingItems] = useState(false);
  const [transferProgress, setTransferProgress] = useState({ done: 0, total: 0 });
  const inventoryRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const quickPhotoInputRef = useRef<HTMLInputElement>(null);

  const viewer = isViewer();
  const restrictedVirtualSubdependencia =
    isComisario() && isVirtualSubdependenciaName(nombre);

  useEffect(() => {
    if (restrictedVirtualSubdependencia) {
      router.replace("/Anexos");
    }
  }, [restrictedVirtualSubdependencia, router]);

  useEffect(() => {
    if (restrictedVirtualSubdependencia) return;

    (async () => {
      try {
        let data: MobiliarioUltimo[] = [];
        if (ubicacionId) {
          // Server-side filter + re-filtro defensivo
          const server = await obtenerMobiliariosPorUbicacion(ubicacionId);
          data = server.filter(i => Number(i.ubicacion_id) === ubicacionId);
        } else {
          // Fallback por nombre
          const all = await obtenerUltimosMobiliarios();
          data = all.filter(
            (i) => normalize(i.subdependencia) === normalize(nombre) && i.para_baja !== true
          );
        }

        setMobiliarios(data);
        setFiltered(data);
        setSelected(data[0] ?? null);
      } catch (e) {
        console.error("Error al obtener mobiliario", e);
      }
    })();
  }, [nombre, rawId, restrictedVirtualSubdependencia, ubicacionId]); // incluye ubicacionId para cumplir el lint

  useEffect(() => {
    if (!selected?.id_mobiliario) {
      setLastEditor(null);
      return;
    }
    let cancelled = false;
    setLoadingEditor(true);
    const base = process.env.NEXT_PUBLIC_API_BASE;
    fetch(`${base}/mobiliario/${encodeURIComponent(selected.id_mobiliario)}/ultimo-editor`, {
      cache: "no-store",
      credentials: "include",
    })
      .then((response) => (response.ok ? response.json() : { usuario: null }))
      .then((data) => {
        if (!cancelled) setLastEditor(data?.usuario?.trim() || null);
      })
      .catch(() => {
        if (!cancelled) setLastEditor(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingEditor(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id_mobiliario, selected?.fecha_actualizacion]);

  useEffect(() => {
    const term = normalize(search);
    setFiltered(
      mobiliarios.filter(
        (item) =>
          item.id_mobiliario.toLowerCase().includes(term) ||
          normalize(item.descripcion).includes(term)
      )
    );
  }, [search, mobiliarios]);

  useEffect(() => {
    if (!targetAnexoId) {
      setTransferSubdependencias([]);
      setTargetSubdependenciaId("");
      return;
    }

    let cancelled = false;
    setLoadingTransferSubdependencias(true);
    setTargetSubdependenciaId("");
    obtenerSubdependencias(Number(targetAnexoId))
      .then((data) => {
        if (!cancelled) setTransferSubdependencias(data);
      })
      .catch(() => {
        if (!cancelled) {
          setTransferSubdependencias([]);
          toast.error("No se pudieron cargar las subdependencias del anexo.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTransferSubdependencias(false);
      });

    return () => {
      cancelled = true;
    };
  }, [targetAnexoId]);

  const isMobileLayout = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 1023px)").matches;

  const handleSelect = (item: MobiliarioUltimo) => {
    setSelected(item);

    if (isMobileLayout()) {
      window.requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const startTransferMode = async () => {
    if (viewer) {
      toast.error("No autorizado: tu usuario es de solo lectura.");
      return;
    }

    setTransferMode(true);
    setSelectedForTransfer(new Set());

    const currentAnexoId = Number(mobiliarios[0]?.id_anexo);
    if (Number.isFinite(currentAnexoId) && currentAnexoId > 0) {
      setTargetAnexoId(String(currentAnexoId));
    }

    if (transferAnexos.length) return;
    try {
      setLoadingTransferAnexos(true);
      setTransferAnexos(await obtenerAnexos());
    } catch {
      toast.error("No se pudieron cargar los anexos.");
    } finally {
      setLoadingTransferAnexos(false);
    }
  };

  const cancelTransferMode = () => {
    if (movingItems) return;
    setTransferMode(false);
    setSelectedForTransfer(new Set());
    setShowTransferModal(false);
    setTargetSubdependenciaId("");
  };

  const toggleTransferItem = (id: string) => {
    setSelectedForTransfer((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleInventoryItemClick = (item: MobiliarioUltimo) => {
    if (transferMode) {
      toggleTransferItem(item.id_mobiliario);
      return;
    }
    handleSelect(item);
  };

  const allVisibleSelected =
    filtered.length > 0 &&
    filtered.every((item) => selectedForTransfer.has(item.id_mobiliario));

  const toggleVisibleTransferItems = () => {
    setSelectedForTransfer((current) => {
      const next = new Set(current);
      filtered.forEach((item) => {
        if (allVisibleSelected) next.delete(item.id_mobiliario);
        else next.add(item.id_mobiliario);
      });
      return next;
    });
  };

  const handleTransfer = async () => {
    const targetId = Number(targetSubdependenciaId);
    const ids = Array.from(selectedForTransfer);

    if (!ids.length || !Number.isFinite(targetId) || targetId <= 0) {
      toast.error("Seleccioná bienes y una subdependencia de destino.");
      return;
    }
    if (ubicacionId && targetId === ubicacionId) {
      toast.error("La subdependencia de destino es la misma que la actual.");
      return;
    }

    setMovingItems(true);
    setTransferProgress({ done: 0, total: ids.length });
    const movedIds: string[] = [];
    const failedIds: string[] = [];

    try {
      const concurrency = 4;
      for (let start = 0; start < ids.length; start += concurrency) {
        const chunk = ids.slice(start, start + concurrency);
        const results = await Promise.allSettled(
          chunk.map((id) => actualizarUbicacionMobiliario(id, targetId))
        );

        results.forEach((result, index) => {
          const id = chunk[index];
          if (result.status === "fulfilled") movedIds.push(id);
          else failedIds.push(id);
        });
        setTransferProgress({
          done: Math.min(start + chunk.length, ids.length),
          total: ids.length,
        });
      }

      const movedSet = new Set(movedIds);
      const remainingItems = mobiliarios.filter(
        (item) => !movedSet.has(item.id_mobiliario)
      );
      setMobiliarios(remainingItems);
      setSelected((current) =>
        current && movedSet.has(current.id_mobiliario)
          ? remainingItems[0] ?? null
          : current
      );

      if (failedIds.length) {
        setSelectedForTransfer(new Set(failedIds));
        toast.error(
          `Se trasladaron ${movedIds.length} bienes. No se pudieron trasladar ${failedIds.length}.`
        );
      } else {
        toast.success(
          `${movedIds.length} ${movedIds.length === 1 ? "bien trasladado" : "bienes trasladados"} correctamente.`
        );
        setShowTransferModal(false);
        setTransferMode(false);
        setSelectedForTransfer(new Set());
        setTargetSubdependenciaId("");
      }
    } finally {
      setMovingItems(false);
    }
  };

  const scrollToInventory = () => {
    if (!isMobileLayout()) return;
    inventoryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const applyFaltanteState = (id: string, faltante: boolean) => {
    const updateItem = (item: MobiliarioUltimo) =>
      item.id_mobiliario === id ? { ...item, faltante } : item;

    setMobiliarios((prev) => prev.map(updateItem));
    setFiltered((prev) => prev.map(updateItem));
    setSelected((prev) =>
      prev?.id_mobiliario === id ? { ...prev, faltante } : prev
    );
  };

  const applyProblemaEtiquetaState = (id: string, problema_etiqueta: boolean) => {
    const updateItem = (item: MobiliarioUltimo) =>
      item.id_mobiliario === id ? { ...item, problema_etiqueta } : item;

    setMobiliarios((prev) => prev.map(updateItem));
    setFiltered((prev) => prev.map(updateItem));
    setSelected((prev) =>
      prev?.id_mobiliario === id ? { ...prev, problema_etiqueta } : prev
    );
  };

  const applyReparacionState = (id: string, para_reparacion: boolean) => {
    const updateItem = (item: MobiliarioUltimo) =>
      item.id_mobiliario === id ? { ...item, para_reparacion } : item;

    setMobiliarios((prev) => prev.map(updateItem));
    setFiltered((prev) => prev.map(updateItem));
    setSelected((prev) =>
      prev?.id_mobiliario === id ? { ...prev, para_reparacion } : prev
    );
  };

  const applyFotoState = (
    id: string,
    patch: Pick<MobiliarioUltimo, "foto_url" | "foto_url_2"> &
      Partial<Pick<MobiliarioUltimo, "fecha_actualizacion">>
  ) => {
    const updateItem = (item: MobiliarioUltimo) =>
      item.id_mobiliario === id ? { ...item, ...patch } : item;

    setMobiliarios((prev) => prev.map(updateItem));
    setFiltered((prev) => prev.map(updateItem));
    setSelected((prev) =>
      prev?.id_mobiliario === id ? { ...prev, ...patch } : prev
    );
  };

  const handleChangeEstado = async (estado: string) => {
    if (!selected || viewer) return;
    try {
      setUpdatingEstado(true);
      const result = await actualizarEstadoMobiliario(selected.id_mobiliario, estado);
      const updateItem = (item: MobiliarioUltimo) =>
        item.id_mobiliario === selected.id_mobiliario
          ? {
              ...item,
              estado_conservacion: result.estado_conservacion,
              ...(result.fecha_actualizacion
                ? { fecha_actualizacion: result.fecha_actualizacion }
                : {}),
            }
          : item;
      setMobiliarios((prev) => prev.map(updateItem));
      setFiltered((prev) => prev.map(updateItem));
      setSelected((prev) => (prev ? updateItem(prev) : prev));
      setShowEstadoModal(false);
      toast.success(`Estado actualizado a ${result.estado_conservacion}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el estado");
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
      const data = await actualizarFotoMobiliario(
        selected.id_mobiliario,
        fotoUrl,
        slot
      );
      const patch: Pick<MobiliarioUltimo, "foto_url" | "foto_url_2"> &
        Partial<Pick<MobiliarioUltimo, "fecha_actualizacion">> = {
        foto_url: selected.foto_url,
        foto_url_2: selected.foto_url_2,
        [fotoField]: fotoUrl,
      };
      if ("fecha_actualizacion" in data && data.fecha_actualizacion) {
        patch.fecha_actualizacion = data.fecha_actualizacion;
      }
      applyFotoState(selected.id_mobiliario, patch);
      toast.success(
        slot === 1 ? "Foto actualizada correctamente" : "Segunda foto agregada"
      );
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
      await actualizarFaltanteMobiliario(selected.id_mobiliario, nextFaltante);
      applyFaltanteState(selected.id_mobiliario, nextFaltante);
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
      await actualizarProblemaEtiquetaMobiliario(selected.id_mobiliario, nextEtiqueta);
      applyProblemaEtiquetaState(selected.id_mobiliario, nextEtiqueta);
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

  const handleDuplicar = () => {
    if (!selected || viewer) return;
    setShowDuplicateModal(true);
  };

  const handleConfirmarDuplicado = async (cantidad: number) => {
    if (!selected) return;
    if (viewer) {
      toast.error("No autorizado: tu usuario es de solo lectura.");
      setShowDuplicateModal(false);
      return;
    }

    try {
      setDuplicating(true);
      const result = await duplicarMobiliario(selected.id_mobiliario, cantidad);
      let data: MobiliarioUltimo[] = [];
      if (ubicacionId) {
        const server = await obtenerMobiliariosPorUbicacion(ubicacionId);
        data = server.filter((item) => Number(item.ubicacion_id) === ubicacionId);
      } else {
        const all = await obtenerUltimosMobiliarios({ force: true });
        data = all.filter(
          (item) => normalize(item.subdependencia) === normalize(nombre) && item.para_baja !== true
        );
      }

      setMobiliarios(data);
      setFiltered(data);
      setSelected(data.find((item) => item.id_mobiliario === selected.id_mobiliario) ?? data[0] ?? null);
      setShowDuplicateModal(false);
      toast.success(
        `Duplicado: ${result.ids_generados.length} nuevo${result.ids_generados.length === 1 ? "" : "s"}`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al duplicar mobiliario");
    } finally {
      setDuplicating(false);
    }
  };

  const handleEliminar = async () => {
    if (!selected) return;
    if (!canDeleteMobiliario()) {
      toast.error("No autorizado: solo Hernan puede eliminar mobiliario.");
      setShowConfirm(false);
      return;
    }
    try {
      await eliminarMobiliario(selected.id_mobiliario);
      toast.success("Mobiliario eliminado correctamente");
      const actualizados = mobiliarios.filter((m) => m.id_mobiliario !== selected.id_mobiliario);
      setMobiliarios(actualizados);
      setFiltered(actualizados);
      setSelected(null);
      setShowConfirm(false);
    } catch {
      toast.error("Error al eliminar el mobiliario");
    }
  };

  const primaryFlag = selected ? pickPrimaryFlag(selected) : null;
  const canDelete = canDeleteMobiliario();

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 transition-colors duration-300 dark:bg-[#07111f] dark:text-white">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <button
            onClick={() => router.back()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300"
          >
            <FaArrowLeft className="h-3.5 w-3.5" />
            Volver
          </button>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
              onClick={() => router.push("/listados")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-3 text-sm font-bold text-white transition hover:bg-cyan-800 hover:shadow-sm dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            >
              <FaListUl className="h-3.5 w-3.5" />
              Listados
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">
                Inventario por subdependencia
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
                {ubicacionId ? `${ubicacionId} - ${nombre}` : nombre}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Revisá bienes, abrí detalles y saltá directo a listados sin perder el contexto.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[360px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Bienes</p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{mobiliarios.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Resultados</p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{filtered.length}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por ID o descripción"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
              />
            </div>
            <button
              type="button"
              onClick={transferMode ? cancelTransferMode : startTransferMode}
              disabled={viewer || movingItems}
              className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                transferMode
                  ? "border border-slate-300 bg-white text-slate-700 hover:border-rose-400 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  : "bg-cyan-700 text-white hover:bg-cyan-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
              }`}
              title={viewer ? "Solo lectura: no podés trasladar bienes." : undefined}
            >
              {transferMode ? <FaTimes /> : <FaExchangeAlt />}
              {transferMode ? "Cancelar pase" : "Marcar para pase"}
            </button>
          </div>

          {transferMode && (
            <div className="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white">
                  {selectedForTransfer.size} seleccionados
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Origen: {ubicacionId ? `${ubicacionId} - ` : ""}{nombre}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={toggleVisibleTransferItems}
                  disabled={!filtered.length}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                >
                  {allVisibleSelected ? <FaRegSquare /> : <FaCheckSquare />}
                  {allVisibleSelected ? "Quitar visibles" : "Marcar visibles"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedForTransfer(new Set())}
                  disabled={!selectedForTransfer.size}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 transition hover:border-rose-400 hover:text-rose-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(true)}
                  disabled={!selectedForTransfer.size}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaExchangeAlt />
                  Elegir destino
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          {/* Lista */}
          <div
            ref={inventoryRef}
            className="max-h-[calc(100vh-190px)] scroll-mt-28 overflow-y-auto pr-1 lg:sticky lg:top-24"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Inventario</h2>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                {filtered.length}
              </span>
            </div>
            <div className="space-y-3">
              {filtered.map((item) => {
                const isSel = selected?.id_mobiliario === item.id_mobiliario;
                const isMarked = selectedForTransfer.has(item.id_mobiliario);
                const flag = pickPrimaryFlag(item);
                return (
                  <button
                    type="button"
                    key={item.id_mobiliario}
                    onClick={() => handleInventoryItemClick(item)}
                    aria-pressed={transferMode ? isMarked : undefined}
                    className={[
                      "relative w-full cursor-pointer rounded-xl border p-4 text-left text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                      transferMode && isMarked
                        ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200 dark:border-emerald-500 dark:bg-emerald-950/35 dark:ring-emerald-800"
                        : isSel
                          ? "border-cyan-400 bg-cyan-50 dark:border-cyan-600 dark:bg-cyan-950/35"
                          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/80",
                      listAccentByFlag(flag),
                    ].join(" ")}
                  >
                    {transferMode && (
                      <span
                        className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md border text-sm ${
                          isMarked
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900"
                        }`}
                        aria-hidden="true"
                      >
                        {isMarked ? <FaCheckSquare /> : <FaRegSquare />}
                      </span>
                    )}
                    <p className={`font-bold text-slate-950 dark:text-white ${transferMode ? "pr-10" : ""}`}>{item.descripcion || "Sin descripción"}</p>
                    <div className="mt-2">
                      <EstadoIdBadge
                        id={item.id_mobiliario}
                        estado={item.estado_conservacion}
                      />
                    </div>
                    <FlagsBadges item={item} />
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-400">
                  No hay resultados.
                </div>
              )}
            </div>
          </div>

          {/* Detalle */}
          <div
            ref={detailRef}
            className="scroll-mt-28 self-start lg:sticky lg:top-[100px]"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Detalle</h2>

              <button
                type="button"
                onClick={scrollToInventory}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-200"
              >
                Volver al inventario
              </button>
            </div>
            {selected ? (
              <div className={["grid grid-cols-1 gap-4 overflow-hidden rounded-2xl border p-3 shadow-sm sm:gap-6 sm:p-5 md:grid-cols-[minmax(0,1fr)_310px]", containerClassesByFlag(primaryFlag)].join(" ")}>
                {primaryFlag && (
                  <div className="md:col-span-2 -mt-2 -mb-1">
                    <div className="flex items-center gap-2 rounded-xl border border-white/40 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-black/20">
                      <span className="inline-block w-2 h-2 rounded-full bg-current" />
                      <p className="text-sm font-semibold">Estado principal: <span className="underline">{FLAG_META[primaryFlag].label}</span></p>
                    </div>
                  </div>
                )}

                <div className="min-w-0 space-y-4 text-sm text-slate-700 dark:text-slate-300">
                  <div className="space-y-3">
                    <EstadoIdBadge
                      id={selected.id_mobiliario}
                      estado={selected.estado_conservacion}
                    />
                    <h3 className="break-words text-lg font-black leading-tight text-slate-950 sm:text-xl dark:text-white">
                      {selected.descripcion || "Sin descripcion"}
                    </h3>
                    <FlagsBadges item={selected} />
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <p className="rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10"><strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Clase</strong>{selected.clase_bien || "-"}</p>
                  <p className="rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10"><strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Rubro</strong>{selected.rubro || "-"}</p>
                  <p className="rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10"><strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Anexo</strong>{selected.anexo || "-"}</p>
                  <p className="rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10"><strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Subdependencia</strong>{selected.subdependencia || "-"}</p>
                  {visibleVehicle(selected) && (
                    <p className="rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10"><strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Vehiculo</strong>{visibleVehicle(selected)}</p>
                  )}
                  <p className="rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10"><strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Resolucion</strong>{selected.resolucion || "-"}</p>
                  <p className="rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10"><strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Fecha resolucion</strong>{formatMobiliarioDate(selected.fecha_resolucion, "date")}</p>
                  <p className="rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10"><strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Valor</strong>{formatValor(selected.valor)}</p>
                  <p className="rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10"><strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Estado</strong>{selected.estado_conservacion || "-"}</p>
                  <p className="rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 dark:bg-black/15 dark:ring-white/10"><strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Actualizado</strong>{formatMobiliarioDate(selected.fecha_actualizacion, "datetime")}</p>
                  <p className="rounded-xl bg-white/65 p-3 ring-1 ring-slate-200/80 md:col-span-2 dark:bg-black/15 dark:ring-white/10"><strong className="block text-xs uppercase text-slate-500 dark:text-slate-400">Comentarios</strong>{selected.comentarios || "-"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <MobiliarioPhotoGallery photos={[selected.foto_url, selected.foto_url_2]} alt={selected.descripcion || "Foto del mobiliario"} />
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-700 dark:border-white/10 dark:bg-black/15 dark:text-slate-300">
                    <p><strong>Creado:</strong> {formatMobiliarioDate(selected.fecha_creacion, "datetime")}</p>
                    <div className="mt-3 inline-flex min-h-10 w-full items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 font-bold text-cyan-950 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-100">
                      <span className="relative flex h-2.5 w-2.5 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-500 opacity-50" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-700 dark:bg-cyan-300" /></span>
                      <FaUserEdit className="shrink-0" />
                      <span className="min-w-0 break-words">{loadingEditor ? "Buscando ultima edicion..." : `Ultima edicion: ${lastEditor || "usuario no registrado"}`}</span>
                    </div>
                  </div>
                </div>

                <input
                  ref={quickPhotoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleQuickPhotoChange}
                />

                <div className="md:col-span-2 grid w-full grid-cols-2 gap-2 pt-4 lg:flex lg:flex-wrap lg:justify-end">
                  <button
                    type="button"
                    disabled={viewer || updatingEstado}
                    onClick={() => !viewer && setShowEstadoModal(true)}
                    title={viewer ? "Solo lectura: no podes cambiar el estado." : "Cambiar estado"}
                    className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition lg:w-auto ${
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
                    className={`order-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-white transition lg:order-none lg:w-auto ${
                      selected.para_reparacion
                        ? "bg-amber-700 hover:bg-amber-800"
                        : "bg-amber-500 hover:bg-amber-600"
                    }`}
                  >
                    <FaWrench />
                    {selected.para_reparacion ? "En reparación" : "Reparación"}
                  </button>
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
                    className={`order-2 col-span-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black shadow-sm transition sm:col-span-1 lg:order-none lg:h-11 lg:w-auto ${
                      viewer || quickPhotoLoading
                        ? "cursor-not-allowed bg-gray-400 text-gray-200"
                        : "bg-cyan-700 text-white hover:bg-cyan-800"
                    }`}
                  >
                    <FaCamera />
                    {quickPhotoLoading ? "Subiendo..." : "Tomar foto"}
                  </button>
                  {isMatafuegoMobiliario(selected) && matafuegosHref(selected) && (
                    <button
                      type="button"
                      onClick={() => router.push(matafuegosHref(selected) ?? "/matafuegos")}
                      className="order-2 col-span-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-bold text-white transition hover:bg-red-700 sm:col-span-1 lg:order-none lg:w-auto"
                      title="Abrir control de matafuegos"
                    >
                      <FaFire /> Matafuegos
                    </button>
                  )}
                  <button
                    type="button"
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
                    className={`order-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition lg:order-none lg:w-auto ${
                      viewer || updatingFaltante
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : selected.faltante
                          ? "bg-rose-700 hover:bg-rose-800 text-white"
                          : "bg-rose-500 hover:bg-rose-600 text-white"
                    }`}
                  >
                    <FaExclamationTriangle />
                    {updatingFaltante
                      ? "Guardando..."
                      : selected.faltante
                        ? "Quitar faltante"
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
                    className={`order-3 col-span-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black shadow-sm transition sm:col-span-1 lg:order-none lg:h-11 lg:w-auto ${
                      viewer || updatingEtiqueta
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : selected.problema_etiqueta
                          ? "bg-violet-700 hover:bg-violet-800 text-white"
                          : "bg-violet-600 hover:bg-violet-700 text-white"
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
                    onClick={() => { if (!viewer) router.push(`/Etiquetas?bien=${encodeURIComponent(selected.id_mobiliario)}`); }}
                    title={viewer ? "Solo lectura: no tenés permiso para generar la etiqueta." : "Ver etiqueta"}
                    aria-disabled={viewer}
                    className={`order-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition lg:order-none lg:w-auto ${viewer ? "bg-gray-400 text-gray-200 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                  >
                    <FaTag /> Etiqueta
                  </button>

                  <button
                    disabled={viewer}
                    onClick={handleDuplicar}
                    title={viewer ? "Solo lectura: no podés duplicar." : "Duplicar"}
                    aria-disabled={viewer}
                    className={`order-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition lg:order-none lg:w-auto ${viewer ? "bg-gray-400 text-gray-200 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
                  >
                    <FaCopy /> Duplicar
                  </button>

                  <button
                    disabled={viewer}
                    onClick={() => {
                      if (!viewer) {
                        const redirect = buildSubdependenciaPath(nombre, ubicacionId);
                        router.push(
                          `/patrimonio/editar/${selected.id_mobiliario}?redirect=${encodeURIComponent(redirect)}`
                        );
                      }
                    }}
                    title={viewer ? "Solo lectura: no podés editar." : "Editar"}
                    aria-disabled={viewer}
                    className={`order-1 col-span-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black shadow-sm transition sm:col-span-1 lg:order-none lg:h-11 lg:w-auto ${viewer ? "bg-gray-400 text-gray-200 cursor-not-allowed" : "bg-yellow-500 hover:bg-yellow-600 text-white"}`}
                  >
                    <FaEdit /> Editar
                  </button>

                  <button
                    disabled={!canDelete}
                    onClick={() => { if (canDelete) setShowConfirm(true); }}
                    title={canDelete ? "Eliminar" : "Solo Hernan puede eliminar mobiliario."}
                    aria-disabled={!canDelete}
                    className={`order-7 flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition lg:order-none lg:w-auto ${!canDelete ? "bg-gray-400 text-gray-200 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 text-white"}`}
                  >
                    <FaTrash /> Eliminar
                  </button>

                  <button
                    onClick={() => setShowHistorial(true)}
                    className="order-8 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white transition hover:bg-indigo-700 lg:order-none lg:w-auto"
                  >
                    <FaClock /> Historial
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-400">
                Selecciona un mobiliario para ver los detalles.
              </div>
            )}
          </div>
        </div>
      </div>

      {showTransferModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfer-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !movingItems) {
              setShowTransferModal(false);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">
                  Pase de bienes
                </p>
                <h2 id="transfer-modal-title" className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                  Trasladar {selectedForTransfer.size} {selectedForTransfer.size === 1 ? "bien" : "bienes"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Origen: {ubicacionId ? `${ubicacionId} - ` : ""}{nombre}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                disabled={movingItems}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-900"
                aria-label="Cerrar pase"
                title="Cerrar"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                Anexo de destino
                <select
                  value={targetAnexoId}
                  onChange={(event) => setTargetAnexoId(event.target.value)}
                  disabled={movingItems || loadingTransferAnexos}
                  className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Seleccionar anexo</option>
                  {transferAnexos.map((anexo) => (
                    <option key={anexo.id} value={anexo.id}>
                      {anexo.id} - {anexo.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                Subdependencia de destino
                <select
                  value={targetSubdependenciaId}
                  onChange={(event) => setTargetSubdependenciaId(event.target.value)}
                  disabled={!targetAnexoId || movingItems || loadingTransferSubdependencias}
                  className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-cyan-600 disabled:cursor-not-allowed disabled:opacity-55 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">
                    {loadingTransferSubdependencias ? "Cargando..." : "Seleccionar subdependencia"}
                  </option>
                  {transferSubdependencias.map((subdependencia) => (
                    <option
                      key={subdependencia.id}
                      value={subdependencia.id}
                      disabled={ubicacionId === subdependencia.id}
                    >
                      {subdependencia.id} - {subdependencia.nombre}
                      {ubicacionId === subdependencia.id ? " (actual)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-100">
              Solo cambiará la ubicación. La descripción, estado, fotos, opciones y demás datos de cada bien se conservarán.
            </div>

            {movingItems && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span>Realizando pase</span>
                  <span>{transferProgress.done} / {transferProgress.total}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full bg-cyan-600 transition-all"
                    style={{
                      width: `${transferProgress.total ? (transferProgress.done / transferProgress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                disabled={movingItems}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleTransfer}
                disabled={!targetSubdependenciaId || movingItems || loadingTransferSubdependencias}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaExchangeAlt />
                {movingItems ? "Trasladando..." : "Confirmar pase"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEstadoModal && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="estado-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !updatingEstado) setShowEstadoModal(false);
          }}
        >
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-teal-700 dark:text-teal-300">ID {selected.id_mobiliario}</p>
                <h2 id="estado-modal-title" className="mt-1 text-xl font-black text-slate-950 dark:text-white">Cambiar estado</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Estado actual: <strong>{selected.estado_conservacion || "Sin estado"}</strong></p>
              </div>
              <button type="button" onClick={() => setShowEstadoModal(false)} disabled={updatingEstado} aria-label="Cerrar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <FaTimes />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {CONSERVATION_OPTIONS.map((option) => {
                const active = normalizeEstado(selected.estado_conservacion) === normalizeEstado(option.value);
                return (
                  <button key={option.value} type="button" onClick={() => handleChangeEstado(option.value)} disabled={updatingEstado || active} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-black transition ${option.classes} ${active ? "ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-slate-950" : ""} disabled:cursor-not-allowed disabled:opacity-65`}>
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
        onConfirm={handleEliminar}
        title="¿Estás seguro que deseas eliminar este mobiliario?"
      />

      <DuplicateMobiliarioModal
        isOpen={showDuplicateModal}
        itemId={selected?.id_mobiliario}
        loading={duplicating}
        onCancel={() => setShowDuplicateModal(false)}
        onConfirm={handleConfirmarDuplicado}
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
          onChanged={(paraReparacion) =>
            applyReparacionState(selected.id_mobiliario, paraReparacion)
          }
        />
      )}

    </main>
  );
}
