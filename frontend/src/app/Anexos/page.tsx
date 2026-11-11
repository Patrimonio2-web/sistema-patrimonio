"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import {
  ArrowUpRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  History,
  Home,
  Landmark,
  ListChecks,
  MapPin,
  Route,
  Settings2,
  ShieldAlert,
  X,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { Wrapper } from "@/components";
import { obtenerAnexos, type AnexoResponse } from "@/services/anexosService";
import { isMatafuegosManager, isViewer } from "@/services/authRole";
import {
  eliminarRelevamientoAnexo,
  guardarRelevamientoAnexo,
  obtenerHistorialRelevamientosAnexo,
  obtenerRelevamientosAnexos,
  type HistorialRelevamientoAnexo,
  type RelevamientoAnexo,
} from "@/services/relevamientosService";
import {
  obtenerResumenMatafuegos,
  type MatafuegoResumen,
} from "@/services/matafuegosService";
import {
  CasaCentral,
  CentroOperaciones,
  Cochera11,
  Copi,
  Dalma,
  Muni,
  Observatorio11,
  Recidencia,
  Recinto,
  Rivadavia11,
  Sanfe11,
  Urquiza,
} from "../../../public";
import { getAnexoLocation } from "@/lib/anexoLocations";

interface AnnexItem {
  id: number;
  title: string;
  badge: string;
  address: string;
  imageSrc?: StaticImageData;
  href: string;
}

const annexDefaults: AnnexItem[] = [
  {
    id: 100,
    title: "Casa Central",
    badge: "Sede",
    address: "Vélez Sársfield 800-898",
    imageSrc: CasaCentral,
    href: "/Anexos/CasaCentral",
  },
  {
    id: 1200,
    title: "Recinto",
    badge: "Recinto",
    address: "Vélez Sársfield 800-898",
    imageSrc: Recinto,
    href: "/Anexos/Recinto",
  },
  {
    id: 200,
    title: "Anexo 1",
    badge: "Anexo",
    address: "Copiapó N° 110",
    imageSrc: Copi,
    href: "/Anexos/Anexo-1",
  },
  {
    id: 300,
    title: "Anexo 2",
    badge: "Anexo",
    address: "Copiapó N° 266",
    imageSrc: Muni,
    href: "/Anexos/Anexo-2",
  },
  {
    id: 400,
    title: "CENTRO DE OPERACIONES",
    badge: "Anexo",
    address: "Santa Fe N° 890",
    imageSrc: CentroOperaciones,
    href: "/Anexos/Bunker",
  },
  {
    id: 500,
    title: "Anexo 4",
    badge: "Anexo",
    address: "Rivadavia N° 938",
    imageSrc: Rivadavia11,
    href: "/Anexos/Anexo-Rivadavia",
  },
  {
    id: 600,
    title: "Anexo 5",
    badge: "Anexo",
    address: "Urquiza N° 435",
    imageSrc: Urquiza,
    href: "/Anexos/Anexo-Urquiza",
  },
  {
    id: 800,
    title: "Anexo 7",
    badge: "Anexo",
    address: "Santa Fe N° 877",
    imageSrc: Sanfe11,
    href: "/Anexos/Anexo-Santafe",
  },
  {
    id: 900,
    title: "Anexo 8",
    badge: "Anexo",
    address: "Dalmacio Vélez N° 765",
    imageSrc: Dalma,
    href: "/Anexos/Anexo-3",
  },
  {
    id: 1100,
    title: "Anexo 9",
    badge: "Anexo",
    address: "Hipólito Yrigoyen N° 327",
    imageSrc: Cochera11,
    href: "/Anexos/Cochera",
  },
  {
    id: 1101,
    title: "Anexo 10",
    badge: "Anexo",
    address: "Abel Bazán y Bustos y Lamadrid",
    imageSrc: Observatorio11,
    href: "/Anexos/Observatorio",
  },
  {
    id: 1000,
    title: "Residencia Oficial 2",
    badge: "Residencia",
    address: "E. Hunicken y Perito Moreno",
    imageSrc: Recidencia,
    href: "/Anexos/Recidencia",
  },
].map((item) => ({
  ...item,
  address: getAnexoLocation(item.id)?.address || item.address,
}));

const annexDefaultById = new Map(annexDefaults.map((item) => [item.id, item]));
const annexOrderById = new Map(annexDefaults.map((item, index) => [item.id, index]));

function annexesFromBackend(data: AnexoResponse[]): AnnexItem[] {
  return [...data]
    .sort((a, b) => {
      const orderA = annexOrderById.get(Number(a.id)) ?? Number.MAX_SAFE_INTEGER;
      const orderB = annexOrderById.get(Number(b.id)) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB || Number(a.id) - Number(b.id);
    })
    .map((anexo) => {
      const id = Number(anexo.id);
      const preset = annexDefaultById.get(id);
      return {
        id,
        title: anexo.nombre?.trim() || preset?.title || `Anexo ${id}`,
        address:
          anexo.direccion?.trim() ||
          getAnexoLocation(id)?.address ||
          preset?.address ||
          "Dirección no informada",
        badge: preset?.badge || "Anexo",
        imageSrc: preset?.imageSrc,
        href: preset?.href || `/Anexos/anexo/${id}`,
      };
    });
}

function todayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("es-AR").format(new Date(year, month - 1, day));
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Annexes() {
  const viewer = isViewer();
  const matafuegosManager = isMatafuegosManager();
  const [annexes, setAnnexes] = useState<AnnexItem[]>(annexDefaults);
  const [relevamientos, setRelevamientos] = useState<Record<number, RelevamientoAnexo>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAnexoId, setSelectedAnexoId] = useState(String(annexDefaults[0]?.id ?? ""));
  const [fecha, setFecha] = useState(todayInputValue());
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historial, setHistorial] = useState<HistorialRelevamientoAnexo[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialError, setHistorialError] = useState("");
  const [matafuegosResumen, setMatafuegosResumen] = useState<Record<number, MatafuegoResumen>>({});
  const [sliderRef, slider] = useKeenSlider<HTMLDivElement>({
    loop: true,
    slides: {
      perView: 1,
      spacing: 14,
    },
  });

  const selectedRelevamiento = useMemo(
    () => relevamientos[Number(selectedAnexoId)],
    [relevamientos, selectedAnexoId]
  );
  const selectedAnexo = useMemo(
    () => annexes.find((item) => item.id === Number(selectedAnexoId)),
    [annexes, selectedAnexoId]
  );

  useEffect(() => {
    let cancelled = false;

    obtenerAnexos()
      .then((data) => {
        if (cancelled) return;
        const nextAnnexes = annexesFromBackend(data);
        if (!nextAnnexes.length) return;
        setAnnexes(nextAnnexes);
        setSelectedAnexoId((current) =>
          nextAnnexes.some((item) => String(item.id) === current)
            ? current
            : String(nextAnnexes[0].id)
        );
      })
      .catch((error) => {
        console.error("No se pudieron sincronizar las tarjetas de anexos:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    slider.current?.update();
  }, [annexes.length, slider]);

  useEffect(() => {
    if (matafuegosManager) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await obtenerRelevamientosAnexos();
        if (cancelled) return;
        setRelevamientos(
          Object.fromEntries(data.map((item) => [item.id_anexo, item]))
        );
      } catch (error) {
        console.error(error);
        if (!cancelled) toast.error("No se pudieron cargar los relevamientos.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matafuegosManager]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!document.hidden) slider.current?.next();
    }, 6800);

    return () => window.clearInterval(interval);
  }, [slider]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await obtenerResumenMatafuegos();
        if (cancelled) return;
        setMatafuegosResumen(
          Object.fromEntries(data.map((item) => [item.id_anexo, item]))
        );
      } catch (error) {
        console.error(error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const openModal = (idAnexo?: number) => {
    const currentId = Number(selectedAnexoId);
    const nextId = String(idAnexo ?? (currentId || annexes[0]?.id || ""));
    setSelectedAnexoId(nextId);
    setFecha(relevamientos[Number(nextId)]?.fecha_completado?.slice(0, 10) || todayInputValue());
    setComentario("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    const idAnexo = Number(selectedAnexoId);
    if (!idAnexo || !fecha) {
      toast.error("Elegí un anexo y una fecha.");
      return;
    }

    try {
      setSaving(true);
      const saved = await guardarRelevamientoAnexo(idAnexo, fecha, comentario);
      setRelevamientos((prev) => ({ ...prev, [idAnexo]: saved }));
      toast.success("Relevamiento de anexo guardado.");
      setModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const openHistorial = async () => {
    const idAnexo = Number(selectedAnexoId);
    if (!idAnexo) return;

    try {
      setHistorialOpen(true);
      setLoadingHistorial(true);
      setHistorial([]);
      setHistorialError("");
      setHistorial(await obtenerHistorialRelevamientosAnexo(idAnexo));
    } catch (error) {
      console.error(error);
      setHistorialError("No se pudo consultar el historial en este momento.");
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleClear = async () => {
    const idAnexo = Number(selectedAnexoId);
    if (!idAnexo) return;

    try {
      setSaving(true);
      await eliminarRelevamientoAnexo(idAnexo);
      setRelevamientos((prev) => {
        const next = { ...prev };
        delete next[idAnexo];
        return next;
      });
      toast.success("Marca de relevamiento quitada.");
      setModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo quitar la marca.");
    } finally {
      setSaving(false);
    }
  };

  const renderAnexoCard = (item: AnnexItem, index: number) => {
    const relevamiento = relevamientos[item.id];
    const completed = !!relevamiento;
    const matafuegos = matafuegosResumen[item.id];
    const totalMatafuegos = matafuegos?.total ?? 0;
    const vencidos = matafuegos?.vencidos ?? 0;

    return (
      <article
        key={item.href}
        className={`group relative min-h-[285px] overflow-hidden rounded-2xl border bg-slate-900 shadow-sm shadow-slate-900/10 outline-none transition hover:-translate-y-1 hover:shadow-xl ${
          completed
            ? "border-emerald-400 ring-2 ring-emerald-300/70 dark:border-emerald-500 dark:ring-emerald-500/40"
            : "border-slate-200 dark:border-slate-800"
        }`}
      >
        <Link
          href={matafuegosManager ? `/matafuegos/anexo/${item.id}` : item.href}
          className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <span className="sr-only">Abrir {item.title}</span>
        </Link>

        {item.imageSrc ? (
          <Image
            src={item.imageSrc}
            alt={item.title}
            fill
            priority={index === 0}
            placeholder="blur"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105 group-hover:brightness-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-500 transition duration-500 group-hover:bg-slate-700">
            <Building2 className="h-20 w-20" strokeWidth={1.25} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/5" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <span className="rounded-lg border border-white/20 bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-900 shadow-sm">
            {item.badge}
          </span>
          <div className="relative z-20 flex items-center gap-1.5 sm:gap-2">
            <Link
              href={`/matafuegos/anexo/${item.id}`}
              title={`${totalMatafuegos} matafuego${totalMatafuegos === 1 ? "" : "s"} en total`}
              aria-label={`${totalMatafuegos} matafuego${totalMatafuegos === 1 ? "" : "s"} en total en ${item.title}`}
              className={`flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg px-2 text-xs font-black text-white backdrop-blur transition ${
                totalMatafuegos > 0
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-slate-950/45 hover:bg-slate-700"
              }`}
            >
              <Flame className="h-4 w-4" />
              <span>{totalMatafuegos}</span>
            </Link>
            {vencidos > 0 && (
              <Link
                href={`/matafuegos/anexo/${item.id}`}
                title={`${vencidos} matafuego${vencidos === 1 ? "" : "s"} vencido${vencidos === 1 ? "" : "s"}`}
                aria-label={`${vencidos} matafuego${vencidos === 1 ? "" : "s"} vencido${vencidos === 1 ? "" : "s"} en ${item.title}`}
                className="relative flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg bg-red-600 px-2 text-xs font-black text-white shadow-sm transition hover:bg-red-700"
              >
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full bg-red-300" />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
                <ShieldAlert className="h-4 w-4" />
                <span>{vencidos}</span>
              </Link>
            )}
            {!matafuegosManager && <button
              type="button"
              onClick={() => openModal(item.id)}
              disabled={viewer}
              title={viewer ? "Solo lectura: no podes marcar relevamientos." : "Marcar relevamiento"}
              className={`flex h-9 w-9 items-center justify-center rounded-lg backdrop-blur transition ${
                completed
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-slate-950/45 text-white hover:bg-emerald-500"
              } ${viewer ? "cursor-not-allowed opacity-60" : ""}`}
            >
              {completed ? <CheckCircle2 className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
            </button>}
            <span className="pointer-events-none hidden h-9 w-9 items-center justify-center rounded-lg bg-slate-950/45 text-white backdrop-blur transition group-hover:bg-cyan-500 sm:flex">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <h2 className="text-xl font-bold uppercase text-white">
            {item.title}
          </h2>
          <p className="mt-2 flex min-h-10 items-start gap-2 text-sm font-medium leading-5 text-slate-100">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
            <span>{item.address}</span>
          </p>
          {completed && (
            <p className="pointer-events-none relative z-20 mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-300/50 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-50 backdrop-blur">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Relevado: {formatDate(relevamiento.fecha_completado)}
            </p>
          )}
        </div>
      </article>
    );
  };

  return (
    <Wrapper>
      <Toaster />
      <div className="mx-auto w-full max-w-7xl px-1 pb-10 pt-1 sm:px-3 lg:px-5">
        <section className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950/80">
          <div className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-md bg-cyan-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-700 ring-1 ring-cyan-500/15 dark:bg-cyan-500/10 dark:text-cyan-200">
                <Landmark className="h-4 w-4" />
                Patrimonio institucional
              </span>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Anexos
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {matafuegosManager
                  ? "Seleccioná una ubicación para consultar y actualizar sus matafuegos."
                  : "Legislatura de la Provincia de La Rioja. Abrí un anexo, revisá sus subdependencias o saltá directo a listados sin volver por varias pantallas."}
              </p>

              <div className={`mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 ${matafuegosManager ? "max-w-sm" : "lg:max-w-4xl lg:grid-cols-4"}`}>
                {matafuegosManager ? (
                  <Link
                    href="/matafuegos"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-bold text-white transition hover:bg-red-800 hover:shadow-sm"
                  >
                    <Flame className="h-4 w-4" />
                    Control general
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/Home"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300"
                    >
                      <Home className="h-4 w-4" />
                      Inicio
                    </Link>
                    <Link
                      href="/listados"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 text-sm font-bold text-white transition hover:bg-cyan-800 hover:shadow-sm dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                    >
                      <ListChecks className="h-4 w-4" />
                      Ir a listados
                    </Link>
                    <Link
                      href="/gestion"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300"
                    >
                      <Settings2 className="h-4 w-4" />
                      Gestión
                    </Link>
                    <button
                      type="button"
                      onClick={() => openModal()}
                      disabled={viewer}
                      title={viewer ? "Solo lectura: no podes marcar relevamientos." : "Marcar relevamiento"}
                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition ${
                        viewer
                          ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600"
                          : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-sm dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:border-emerald-700"
                      }`}
                    >
                      <CalendarCheck className="h-4 w-4" />
                      Relevamiento
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[330px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/15 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <Building2 className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-slate-950 dark:text-white">
                  {annexes.length}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Ubicaciones
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-500/15 dark:bg-amber-500/10 dark:text-amber-200">
                  <Route className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-slate-950 dark:text-white">
                  100%
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Enlaces activos
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="md:hidden">
          <div className="relative">
            <div ref={sliderRef} className="keen-slider overflow-hidden rounded-2xl">
              {annexes.map((item, index) => (
                <div key={item.href} className="keen-slider__slide">
                  {renderAnexoCard(item, index)}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => slider.current?.prev()}
              className="absolute left-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-slate-950/65 text-white shadow-lg backdrop-blur transition hover:bg-cyan-600"
              aria-label="Anexo anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => slider.current?.next()}
              className="absolute right-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-slate-950/65 text-white shadow-lg backdrop-blur transition hover:bg-cyan-600"
              aria-label="Anexo siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        <section className="hidden grid-cols-1 gap-5 md:grid md:grid-cols-2 xl:grid-cols-3">
          {annexes.map(renderAnexoCard)}
        </section>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
                    Relevamiento completo
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                    Marcar anexo
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                    Anexo
                  </label>
                  <select
                    value={selectedAnexoId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      setSelectedAnexoId(nextId);
                      setFecha(relevamientos[Number(nextId)]?.fecha_completado?.slice(0, 10) || todayInputValue());
                      setComentario("");
                    }}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-emerald-400 dark:focus:ring-emerald-950"
                  >
                    {annexes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.id} - {item.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                    Fecha completado
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(event) => setFecha(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-emerald-400 dark:focus:ring-emerald-950"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                    Comentario del historial
                  </label>
                  <textarea
                    rows={3}
                    value={comentario}
                    onChange={(event) => setComentario(event.target.value)}
                    placeholder="Motivo del relevamiento"
                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-950"
                  />
                </div>

                {selectedRelevamiento && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                    Fecha actual: {formatDate(selectedRelevamiento.fecha_completado)}
                  </div>
                )}

                <button
                  type="button"
                  onClick={openHistorial}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:border-slate-800 dark:text-slate-200 dark:hover:border-cyan-800 dark:hover:bg-cyan-950/30 dark:hover:text-cyan-100"
                >
                  <History className="h-4 w-4" />
                  Ver historial
                </button>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={saving || !selectedRelevamiento || viewer}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  Quitar marca
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || viewer}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  <CalendarCheck className="h-4 w-4" />
                  {saving ? "Guardando..." : "Guardar fecha"}
                </button>
              </div>
            </div>
          </div>
        )}

        {historialOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-4 py-6">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">
                    Historial de relevamientos
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                    {selectedAnexo ? `${selectedAnexo.id} - ${selectedAnexo.title}` : "Anexo"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setHistorialOpen(false)}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                  aria-label="Cerrar historial"
                  title="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingHistorial ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Cargando historial...
                </div>
              ) : historialError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-center text-sm font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  {historialError}
                </div>
              ) : historial.length > 0 ? (
                <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                  {historial.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-base font-bold text-slate-950 dark:text-white">
                          {formatDate(item.fecha_completado)}
                        </p>
                        {item.fecha_creacion && (
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Registrado: {formatDateTime(item.fecha_creacion)}
                          </p>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
                        {item.comentario || "Sin comentario."}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Todavia no hay relevamientos guardados en el historial.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Wrapper>
  );
}
