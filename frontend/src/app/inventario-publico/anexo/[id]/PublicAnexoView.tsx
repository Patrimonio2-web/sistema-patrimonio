"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CookingPot,
  DoorOpen,
  Fence,
  GalleryVerticalEnd,
  Eye,
  ExternalLink,
  MapPin,
  Package,
  Shield,
  ShieldCheck,
  Trees,
  Users,
  Warehouse,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";
import PublicHelpBot from "@/components/PublicHelpBot";
import { usePublicViewGuard } from "@/hooks/usePublicViewGuard";
import {
  PUBLIC_DIRECTORY_BY_SLUG,
  type PublicDirectoryConfig,
} from "@/lib/publicDirectories";

type PublicSubdependencia = {
  id: number;
  nombre: string;
  total_bienes: number;
};

type PublicAnexoResponse = {
  directorio?: {
    slug: string;
    titulo: string;
    descripcion: string;
  };
  anexo: {
    id: number;
    nombre: string;
    direccion?: string | null;
  };
  total_subdependencias: number;
  total_bienes: number;
  subdependencias: PublicSubdependencia[];
};

type VisualConfig = {
  Icon: LucideIcon;
  iconClass: string;
  accentClass: string;
};

const RESIDENCIA_ID = 1000;
const RESIDENCIA_SLUG = "residencia-oficial-2";
const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE || "/api"
).replace(/\/$/, "");

const visualConfigs: VisualConfig[] = [
  {
    Icon: DoorOpen,
    iconClass: "bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
    accentClass: "bg-cyan-600",
  },
  {
    Icon: Building2,
    iconClass: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    accentClass: "bg-emerald-600",
  },
  {
    Icon: GalleryVerticalEnd,
    iconClass: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    accentClass: "bg-amber-500",
  },
  {
    Icon: Shield,
    iconClass: "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
    accentClass: "bg-rose-600",
  },
];

function visualFor(nombre: string, index: number): VisualConfig {
  const normalized = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("cocina")) {
    return { ...visualConfigs[2], Icon: CookingPot };
  }
  if (normalized.includes("lavadero")) {
    return { ...visualConfigs[0], Icon: WashingMachine };
  }
  if (normalized.includes("deposito")) {
    return { ...visualConfigs[2], Icon: Warehouse };
  }
  if (normalized.includes("jardin")) {
    return { ...visualConfigs[1], Icon: Trees };
  }
  if (normalized.includes("garita")) {
    return { ...visualConfigs[3], Icon: Shield };
  }
  if (normalized.includes("sala")) {
    return { ...visualConfigs[1], Icon: Users };
  }
  if (normalized.includes("galeria") || normalized.includes("pasillo")) {
    return { ...visualConfigs[0], Icon: GalleryVerticalEnd };
  }
  if (normalized.includes("oficina")) {
    return { ...visualConfigs[index % visualConfigs.length], Icon: BriefcaseBusiness };
  }
  if (normalized.includes("ex garita")) {
    return { ...visualConfigs[3], Icon: Fence };
  }
  return visualConfigs[index % visualConfigs.length];
}

export default function PublicAnexoView() {
  const params = useParams();
  const rawId = params?.id;
  const rawSlug = params?.slug;
  const anexoId = Array.isArray(rawId) ? rawId[0] : String(rawId || "");
  const directorySlug = Array.isArray(rawSlug)
    ? rawSlug[0]
    : String(rawSlug || "").trim().toLowerCase();
  const isLegacyResidenceRoute = !directorySlug && anexoId === String(RESIDENCIA_ID);
  const directoryConfig = (directorySlug
    ? PUBLIC_DIRECTORY_BY_SLUG.get(directorySlug)
    : PUBLIC_DIRECTORY_BY_SLUG.get(RESIDENCIA_SLUG)) as
    | PublicDirectoryConfig
    | undefined;
  const [data, setData] = useState<PublicAnexoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  usePublicViewGuard("publicDirectoryGuard");

  useEffect(() => {
    const controller = new AbortController();

    if (!directoryConfig || (!directorySlug && !isLegacyResidenceRoute)) {
      setData(null);
      setError("El enlace p\u00fablico del directorio no es v\u00e1lido.");
      setLoading(false);
      return () => controller.abort();
    }

    setLoading(true);
    setError("");
    const endpoint = directorySlug
      ? `${API_BASE}/publico/directorios/${encodeURIComponent(directorySlug)}`
      : `${API_BASE}/publico/anexos/${RESIDENCIA_ID}/subdependencias`;
    fetch(endpoint, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error || "No se pudo cargar el directorio");
        }
        return response.json() as Promise<PublicAnexoResponse>;
      })
      .then((response) => setData(response))
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        setData(null);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo cargar el directorio"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [anexoId, directoryConfig, directorySlug, isLegacyResidenceRoute]);

  const effectiveSlug = directorySlug || RESIDENCIA_SLUG;
  const title =
    directoryConfig?.title ||
    data?.directorio?.titulo ||
    data?.anexo.nombre ||
    "Directorio p\u00fablico";
  const heroImage = directoryConfig?.imageSrc || "/anexos/reci.jpg";
  const returnQuery = new URLSearchParams({ directorio: effectiveSlug });
  if (isLegacyResidenceRoute) returnQuery.set("retorno", "anexo-1000");
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700">
              <Image
                src="/logo4.png"
                alt="Patrimonio - Legislatura de La Rioja"
                fill
                className="object-contain p-1"
                sizes="48px"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase text-cyan-700 dark:text-cyan-400">
                Legislatura de La Rioja
              </p>
              <p className="truncate text-base font-bold sm:text-xl">
                {"Direcci\u00f3n de Patrimonio"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">{"Consulta p\u00fablica"}</span>
          </div>
        </div>
      </header>

      <main>
        <section className="relative min-h-[430px] overflow-hidden bg-slate-950 sm:min-h-[470px]">
          <Image
            src={heroImage}
            alt={title}
            fill
            priority
            quality={95}
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/68 to-slate-950/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-slate-950/10" />

          <div className="relative mx-auto flex min-h-[430px] w-full max-w-7xl flex-col justify-end px-4 pb-6 pt-16 text-white sm:min-h-[470px] sm:px-6 sm:pb-7">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 border-l-2 border-cyan-300 pl-3 text-xs font-black uppercase text-cyan-100">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                <span>
                  {"Directorio institucional"} / Anexo {data?.anexo.id || directoryConfig?.anexoId}
                </span>
              </div>

              <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
                {title}
              </h1>

              {(data?.directorio?.descripcion || directoryConfig?.description) && (
                <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-slate-100 sm:text-base">
                  {data?.directorio?.descripcion || directoryConfig?.description}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-white">
                {data?.anexo.direccion && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.anexo.direccion)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full shrink-0 items-center gap-2 underline decoration-white/40 underline-offset-4 transition hover:decoration-white sm:w-auto"
                  >
                    <MapPin className="h-4 w-4 text-cyan-300" aria-hidden />
                    {data.anexo.direccion}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}
                {data && (
                  <>
                    <span className="inline-flex shrink-0 items-center gap-2">
                      <Building2 className="h-4 w-4 text-emerald-300" aria-hidden />
                      {data.total_subdependencias} ubicaciones
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-2">
                      <Package className="h-4 w-4 text-amber-300" aria-hidden />
                      {data.total_bienes} bienes visibles
                    </span>
                  </>
                )}
              </div>

              <a
                href="#subdependencias"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-white px-4 text-sm font-black text-slate-950 shadow-lg transition hover:bg-cyan-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Ver ubicaciones
                <ArrowDown className="h-4 w-4" aria-hidden />
              </a>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/25 pt-4 text-xs font-bold text-slate-100">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden />
                Consulta institucional
              </span>
              <span className="inline-flex items-center gap-2">
                <Eye className="h-4 w-4 text-cyan-300" aria-hidden />
                Información de solo lectura
              </span>
              <span className="text-slate-300">
                Dirección de Patrimonio - Legislatura de La Rioja
              </span>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
          {loading && (
            <div className="flex min-h-[280px] items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300" role="status">
              <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-700" />
              Cargando subdependencias...
            </div>
          )}

          {!loading && error && (
            <section className="rounded-lg border border-red-200 bg-white p-6 shadow-sm dark:border-red-900 dark:bg-slate-900">
              <div className="flex items-start gap-3 text-red-700 dark:text-red-300">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <h2 className="font-bold">No se pudo abrir el directorio</h2>
                  <p className="mt-1 text-sm">{error}</p>
                </div>
              </div>
            </section>
          )}

          {!loading && data && (
            <section
              id="subdependencias"
              aria-labelledby="subdependencias-title"
              className="scroll-mt-24"
            >
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-cyan-700 dark:text-cyan-400">
                    Ubicaciones
                  </p>
                  <h2 id="subdependencias-title" className="mt-1 text-2xl font-black">
                    Subdependencias
                  </h2>
                </div>
                <p className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                  <Package className="h-4 w-4" />
                  {data.total_bienes} bienes visibles
                </p>
              </div>

              <div className="mb-6 flex items-center gap-3 border-y border-slate-200 py-4 dark:border-slate-800">
                <span className="relative flex h-3 w-3 shrink-0" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-600" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">Directorio institucional actualizado</p>
                  <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Cada ubicación abre su inventario público de consulta.</p>
                </div>
                <span className="ml-auto hidden shrink-0 text-xs font-bold text-slate-500 sm:block">{data.total_subdependencias} ubicaciones</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.subdependencias.map((subdependencia, index) => {
                  const visual = visualFor(subdependencia.nombre, index);
                  const Icon = visual.Icon;
                  return (
                    <Link
                      key={subdependencia.id}
                      href={`/inventario-publico/subdependencia/${subdependencia.id}?${returnQuery.toString()}`}
                      className="group relative min-h-[190px] overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-800"
                    >
                      <span className={`absolute inset-x-0 top-0 h-1 ${visual.accentClass}`} />
                      <div className="flex items-start justify-between gap-4">
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${visual.iconClass}`}>
                          <Icon className="h-6 w-6" aria-hidden />
                        </span>
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                          ID {subdependencia.id}
                        </span>
                      </div>
                      <h3 className="mt-5 break-words text-lg font-black leading-snug text-slate-950 dark:text-white">
                        {subdependencia.nombre}
                      </h3>
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">
                          {subdependencia.total_bienes} {subdependencia.total_bienes === 1 ? "bien" : "bienes"}
                        </span>
                        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-white transition group-hover:bg-cyan-700 dark:bg-cyan-700 dark:group-hover:bg-cyan-600">
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {data.subdependencias.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
                  <Building2 className="mx-auto h-8 w-8 text-slate-400" />
                  <h2 className="mt-3 font-bold">No hay subdependencias disponibles</h2>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-6 text-xs text-slate-500 dark:text-slate-400 sm:px-6">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            {"Direcci\u00f3n de Patrimonio - Legislatura de La Rioja"}
          </p>
          <p>{"Consulta p\u00fablica de inventario institucional"}</p>
        </div>
      </footer>

      <PublicHelpBot
        context={{
          kind: "inventory",
          anexo: data?.anexo.nombre,
          total: data?.total_bienes,
        }}
      />
    </div>
  );
}
