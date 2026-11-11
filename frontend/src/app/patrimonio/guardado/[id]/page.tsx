"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BadgeCheck, Edit3, Plus } from "lucide-react";
import { Wrapper } from "@/components";
import MobiliarioPhotoGallery from "@/components/MobiliarioPhotoGallery";
import { formatMobiliarioDate } from "@/lib/dateFormat";
import { normalizeReturnPath } from "@/lib/returnPath";
import {
  findCachedUltimoMobiliario,
  mobiliarioUltimoToMobiliario,
  obtenerMobiliarioPorId,
  upsertCachedMobiliario,
} from "@/services/mobiliarioService";
import type { Mobiliario } from "@/types/types";
import { visibleVehicle } from "@/lib/mobiliarioVehicle";

const estadoLabels: Array<[keyof Mobiliario, string, string]> = [
  ["no_dado", "Numero dado", "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-100 dark:border-sky-700"],
  ["faltante", "Faltante", "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-700"],
  ["para_baja", "Para baja", "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"],
  ["para_reparacion", "Reparacion", "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-700"],
  ["problema_etiqueta", "Etiqueta", "bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-100 dark:border-violet-700"],
  ["sobrante", "Sobrante", "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-100 dark:border-orange-700"],
  ["privado", "Privado", "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-600"],
];

function formatValor(value: Mobiliario["valor"]) {
  if (value === undefined || value === null || value === "") return "-";
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return String(value);

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(numberValue);
}

export default function PatrimonioGuardadoPage() {
  const [item, setItem] = useState<Mobiliario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId?.toString() || "";
  }, [params?.id]);

  const accion = searchParams.get("accion") === "editado" ? "editado" : "creado";
  const volver = normalizeReturnPath(searchParams.get("volver"));

  useEffect(() => {
    if (!id) return;

    let ignore = false;
    const cached = findCachedUltimoMobiliario(id);

    if (cached) {
      setItem(mobiliarioUltimoToMobiliario(cached));
      setLoading(false);
    }

    const fetchItem = async () => {
      if (!cached) setLoading(true);
      setError("");
      try {
        const data = await obtenerMobiliarioPorId(id);
        if (!ignore) {
          setItem(data);
          upsertCachedMobiliario(data);
        }
      } catch (e) {
        console.error(e);
        if (!ignore && !cached) setError("No se pudo cargar el detalle guardado.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchItem();

    if (volver.startsWith("/")) {
      router.prefetch(volver);
    }

    return () => {
      ignore = true;
    };
  }, [id, router, volver]);

  const activeFlags = estadoLabels.filter(([key]) => Boolean(item?.[key]));

  return (
    <Wrapper>
      <main className="min-h-screen px-4 py-8 text-slate-950 dark:text-white">
        <div className="mx-auto max-w-6xl space-y-5">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100">
                  <BadgeCheck className="h-4 w-4" />
                  Registro {accion}
                </span>
                <h1 className="mt-3 text-2xl font-black">Detalle guardado</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Revisa el mobiliario tal como quedo registrado en el sistema.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.replace(volver)}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </button>
                {id && (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/patrimonio/editar/${encodeURIComponent(id)}?redirect=${encodeURIComponent(volver)}`
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"
                  >
                    <Edit3 className="h-4 w-4" />
                    Editar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => router.push(`/patrimonio/nuevo?redirect=${encodeURIComponent(volver)}`)}
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo
                </button>
              </div>
            </div>
          </section>

          {loading && (
            <section className="rounded-md border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Cargando detalle...
            </section>
          )}

          {!loading && error && (
            <section className="rounded-md border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-800 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100">
              {error}
            </section>
          )}

          {!loading && item && (
            <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm font-bold text-cyan-800 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-100">
                    ID: {item.id}
                  </span>
                  {activeFlags.length > 0 ? (
                    activeFlags.map(([key, label, className]) => (
                      <span key={key} className={`rounded-full border px-3 py-1 text-xs font-bold ${className}`}>
                        {label}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100">
                      Sin alertas
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-black leading-tight">{item.descripcion || "Sin descripcion"}</h2>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <Detail label="Clase" value={item.clase || item.clase_bien} />
                  <Detail label="Rubro" value={item.rubro} />
                  <Detail label="Anexo" value={item.anexo} />
                  <Detail label="Subdependencia" value={item.subdependencia} />
                  {visibleVehicle(item) && (
                    <Detail label="Vehículo" value={visibleVehicle(item)} />
                  )}
                  <Detail label="Resolucion" value={item.resolucion} />
                  <Detail label="Fecha resolucion" value={formatMobiliarioDate(item.fecha_resolucion, "date")} />
                  <Detail label="Valor" value={formatValor(item.valor)} />
                  <Detail label="Estado" value={item.estado_conservacion} />
                  <Detail label="Creado" value={formatMobiliarioDate(item.fecha_creacion, "datetime")} />
                  <Detail label="Actualizado" value={formatMobiliarioDate(item.fecha_actualizacion, "datetime")} />
                </div>

                <div className="mt-3 rounded-md border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Comentarios</p>
                  <p className="mt-1 text-sm text-slate-800 dark:text-slate-100">{item.comentarios || "-"}</p>
                </div>
              </div>

              <aside className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <MobiliarioPhotoGallery
                  photos={[item.foto_url, item.foto_url_2]}
                  alt={item.descripcion || "Imagen del mobiliario"}
                  className="aspect-[4/5] w-full rounded-md border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950"
                />
              </aside>
            </section>
          )}
        </div>
      </main>
    </Wrapper>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-md border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">
        {value === undefined || value === null || value === "" ? "-" : value}
      </p>
    </div>
  );
}
