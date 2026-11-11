"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaMapMarkedAlt,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaTag,
} from "react-icons/fa";
import MobiliarioPhotoGallery from "@/components/MobiliarioPhotoGallery";
import PublicHelpBot from "@/components/PublicHelpBot";
import { usePublicViewGuard } from "@/hooks/usePublicViewGuard";

type PublicMobiliario = {
  id_mobiliario: number | string;
  foto_url?: string | null;
  foto_url_2?: string | null;
  descripcion?: string | null;
  rubro?: string | null;
  clase_bien?: string | null;
  subdependencia?: string | null;
  anexo?: string | null;
  direccion_anexo?: string | null;
  advertencia?: string | null;
};

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE || "/api"
).replace(/\/$/, "");

function displayValue(value: string | number | null | undefined) {
  const text = String(value ?? "").trim();
  return text || "No informado";
}

function getRegisteredAddress(item: PublicMobiliario) {
  const anexo = String(item.anexo || "").trim();
  const addressInName = anexo.includes(":")
    ? anexo.split(":").slice(1).join(":").trim()
    : "";

  return addressInName || String(item.direccion_anexo || "").trim() || anexo;
}

export default function PublicMobiliarioView() {
  const searchParams = useSearchParams();
  const mobiliarioId = (searchParams.get("id") || "").trim();
  const [item, setItem] = useState<PublicMobiliario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const registeredAddress = item ? getRegisteredAddress(item) : "";
  const mapQuery = registeredAddress
    ? `${registeredAddress}, La Rioja Capital, Argentina`
    : "La Rioja Capital, Argentina";
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    mapQuery
  )}`;
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    mapQuery
  )}&output=embed`;

  usePublicViewGuard("publicMobiliarioGuard");

  useEffect(() => {
    const controller = new AbortController();

    if (!mobiliarioId) {
      setItem(null);
      setError("No se especific\u00f3 un ID de mobiliario.");
      setLoading(false);
      return () => controller.abort();
    }

    setLoading(true);
    setError("");

    fetch(
      `${API_BASE}/mobiliario/${encodeURIComponent(mobiliarioId)}/advertencia`,
      { signal: controller.signal, cache: "no-store" }
    )
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error || "Mobiliario no encontrado");
        }
        return response.json() as Promise<PublicMobiliario>;
      })
      .then((data) => setItem(data))
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        setItem(null);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo cargar el mobiliario."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [mobiliarioId]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
              <h1 className="truncate text-base font-bold sm:text-xl">
                {"Direcci\u00f3n de Patrimonio"}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <FaShieldAlt aria-hidden="true" />
            <span className="hidden sm:inline">{"Consulta p\u00fablica"}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {loading && (
          <div
            className="flex min-h-[55vh] items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300"
            role="status"
          >
            <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-700" />
            Cargando mobiliario...
          </div>
        )}

        {!loading && error && (
          <section className="rounded-lg border border-red-200 bg-white p-6 shadow-sm dark:border-red-900 dark:bg-slate-900">
            <div className="flex items-start gap-3 text-red-700 dark:text-red-300">
              <FaExclamationTriangle
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-bold">No se pudo abrir la ficha</h2>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </section>
        )}

        {!loading && item && (
          <div className="flex flex-col gap-5">
            <section className="order-2 grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
              <div className="order-2 p-5 sm:p-7 md:order-1">
                <span className="inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-200">
                  ID: {displayValue(item.id_mobiliario)}
                </span>
                <h2 className="mt-4 text-xl font-bold leading-snug sm:text-2xl">
                  {displayValue(item.descripcion)}
                </h2>

                <dl className="mt-6 divide-y divide-slate-200 border-y border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800">
                  {[
                    ["Anexo", item.anexo],
                    ["Subdependencia", item.subdependencia],
                    ["Rubro", item.rubro],
                    ["Clase", item.clase_bien],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4"
                    >
                      <dt className="font-semibold text-slate-500 dark:text-slate-400">
                        {label}
                      </dt>
                      <dd className="font-medium">{displayValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="order-1 border-b border-slate-200 p-4 dark:border-slate-800 md:order-2 md:border-b-0 md:border-l">
                <MobiliarioPhotoGallery
                  photos={[item.foto_url, item.foto_url_2]}
                  alt={`Mobiliario ${displayValue(item.id_mobiliario)}`}
                  className="aspect-[4/3] h-full min-h-64 w-full rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950"
                  imageClassName="object-contain"
                />
              </div>
            </section>

            <section className="order-1 rounded-lg border border-red-200 bg-red-50 p-5 text-red-950 shadow-sm dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-100 sm:p-6">
              <div className="flex items-start gap-3">
                <FaExclamationTriangle
                  className="mt-1 shrink-0 text-red-600 dark:text-red-400"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase text-red-600 dark:text-red-400">
                    Aviso importante
                  </p>
                  <h2 className="mt-1 text-lg font-bold">Cuidado del bien patrimonial</h2>
                  <p className="mt-1 text-sm leading-relaxed">
                    {displayValue(item.advertencia)}
                  </p>

                  <ul className="mt-5 divide-y divide-red-200 border-y border-red-200 text-sm dark:divide-red-900/70 dark:border-red-900/70">
                    <li className="flex gap-3 py-3">
                      <FaCheckCircle className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                      Verifique que el bien permanezca en el anexo y la subdependencia indicados en esta ficha.
                    </li>
                    <li className="flex gap-3 py-3">
                      <FaShieldAlt className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                      {"No traslade el bien ni modifique su etiqueta sin autorizaci\u00f3n de Patrimonio."}
                    </li>
                    <li className="flex gap-3 py-3">
                      <FaTag className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                      Al informar una novedad, indique el ID {displayValue(item.id_mobiliario)} para identificarlo correctamente.
                    </li>
                  </ul>

                  <p className="mt-4 flex items-start gap-2 text-sm">
                    <FaInfoCircle className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      {"Lugar de aviso: Direcci\u00f3n de Patrimonio, Dalmacio V\u00e9lez 743, La Rioja."}
                    </span>
                  </p>
                </div>
              </div>
            </section>

            <section className="order-3 grid overflow-hidden rounded-lg border border-cyan-200 bg-white shadow-sm dark:border-cyan-900/70 dark:bg-slate-900 md:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]">
              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <FaMapMarkedAlt className="mt-1 shrink-0 text-cyan-700 dark:text-cyan-400" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-400">
                      {"Ubicaci\u00f3n registrada"}
                    </p>
                    <h2 className="mt-1 text-lg font-bold">
                      {displayValue(registeredAddress)}
                    </h2>
                  </div>
                </div>

                <dl className="mt-5 divide-y divide-slate-200 border-y border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800">
                  <div className="py-3">
                    <dt className="font-semibold text-slate-500 dark:text-slate-400">Anexo</dt>
                    <dd className="mt-1 font-medium">{displayValue(item.anexo)}</dd>
                  </div>
                  <div className="py-3">
                    <dt className="font-semibold text-slate-500 dark:text-slate-400">Sector</dt>
                    <dd className="mt-1 font-medium">{displayValue(item.subdependencia)}</dd>
                  </div>
                </dl>

                <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  El mapa corresponde al lugar registrado del bien, no a la oficina donde se reciben los avisos.
                </p>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
                >
                  <FaMapMarkerAlt aria-hidden="true" />
                  {"Abrir ubicaci\u00f3n exacta"}
                </a>
              </div>

              <iframe
                title={"Ubicaci\u00f3n registrada del mobiliario"}
                src={mapEmbedUrl}
                className="h-80 w-full border-0 border-t border-cyan-200 dark:border-cyan-900/70 md:h-full md:min-h-96 md:border-l md:border-t-0"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </section>
          </div>
        )}
      </main>

      <PublicHelpBot
        context={{
          kind: "asset",
          itemId: item?.id_mobiliario,
          anexo: item?.anexo,
          subdependencia: item?.subdependencia,
        }}
      />

    </div>
  );
}
