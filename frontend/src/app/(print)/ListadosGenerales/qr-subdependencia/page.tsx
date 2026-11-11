"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast, Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  FileText,
  MapPin,
  Printer,
  QrCode,
} from "lucide-react";
import { Wrapper } from "@/components";
import {
  obtenerAnexos,
  obtenerSubdependenciasPorAnexo,
  type AnexoOption,
  type SubdependenciaOption,
} from "@/services/listadosService";
import {
  PUBLIC_DIRECTORIES,
  publicDirectoryPath,
  type PublicDirectoryConfig,
} from "@/lib/publicDirectories";

type GeneratedQr = {
  targetType: "subdependencia" | "directorio";
  targetId: number;
  targetName: string;
  anexoId: number;
  anexoNombre: string;
  publicUrl: string;
  qrUrl: string;
};

type QrPrintSheetProps = {
  generated: GeneratedQr;
  className?: string;
  onQrReady?: () => void;
};

function createQrImageUrl(publicUrl: string) {
  const params = new URLSearchParams({
    size: "1600x1600",
    format: "png",
    ecc: "H",
    qzone: "4",
    data: publicUrl,
  });
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

function QrPrintSheet({
  generated,
  className = "",
  onQrReady,
}: QrPrintSheetProps) {
  const isDirectory = generated.targetType === "directorio";

  return (
    <div
      className={`qr-print-sheet flex aspect-[210/297] w-full max-w-[720px] flex-col items-center bg-white px-[9%] py-[7%] text-center text-black ${className}`}
    >
      <Image
        src="/logo4.png"
        alt="Logo de Patrimonio"
        width={104}
        height={104}
        className="h-24 w-24 object-contain"
        priority
      />
      <p className="mt-5 text-sm font-bold uppercase text-cyan-800">
        Legislatura de la Provincia de La Rioja
      </p>
      <h2 className="mt-2 text-3xl font-black uppercase leading-tight">
        {"Direcci\u00f3n de Patrimonio"}
      </h2>
      <div className="mt-6 h-1 w-24 bg-cyan-700" />
      <p className="mt-7 text-lg font-bold uppercase text-slate-600">
        {isDirectory ? "Directorio p\u00fablico" : "Inventario por subdependencia"}
      </p>
      <p className="mt-3 text-2xl font-black leading-tight">
        {generated.targetId} - {generated.targetName}
      </p>
      {!isDirectory && (
        <p className="mt-2 text-base font-semibold text-slate-600">
          {generated.anexoId} - {generated.anexoNombre}
        </p>
      )}
      {isDirectory && (
        <p className="mt-2 text-base font-semibold text-slate-600">
          Acceso agrupado a sus subdependencias
        </p>
      )}

      <div className="mt-8 flex w-[68%] max-w-[430px] items-center justify-center border-4 border-black bg-white p-4">
        <Image
          src={generated.qrUrl}
          alt={`QR de ${generated.targetName}`}
          width={900}
          height={900}
          unoptimized
          crossOrigin="anonymous"
          onLoad={onQrReady}
          className="h-auto w-full"
        />
      </div>

      <p className="mt-7 max-w-xl text-lg font-bold">
        {isDirectory
          ? "Escane\u00e1 el c\u00f3digo para consultar sus oficinas y acceder al inventario de cada ubicaci\u00f3n."
          : "Escane\u00e1 el c\u00f3digo para consultar los bienes registrados en esta ubicaci\u00f3n."}
      </p>
      <p className="mt-auto text-xs font-semibold uppercase text-slate-500">
        {"Consulta p\u00fablica de inventario"}
      </p>
    </div>
  );
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("copy_failed");
}

export default function QrSubdependenciaPage() {
  const [anexos, setAnexos] = useState<AnexoOption[]>([]);
  const [subdependencias, setSubdependencias] = useState<SubdependenciaOption[]>([]);
  const [anexoId, setAnexoId] = useState("");
  const [subdependenciaId, setSubdependenciaId] = useState("");
  const [loadingAnexos, setLoadingAnexos] = useState(true);
  const [loadingSubdependencias, setLoadingSubdependencias] = useState(false);
  const [generated, setGenerated] = useState<GeneratedQr | null>(null);
  const [qrReady, setQrReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let mounted = true;

    obtenerAnexos()
      .then((data) => {
        if (mounted) setAnexos(data);
      })
      .catch(() => toast.error("No se pudieron cargar los anexos"))
      .finally(() => {
        if (mounted) setLoadingAnexos(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setSubdependenciaId("");
    setGenerated(null);
    setQrReady(false);

    if (!anexoId) {
      setSubdependencias([]);
      setLoadingSubdependencias(false);
      return () => {
        mounted = false;
      };
    }

    setLoadingSubdependencias(true);
    obtenerSubdependenciasPorAnexo(Number(anexoId))
      .then((data) => {
        if (mounted) setSubdependencias(data);
      })
      .catch(() => toast.error("No se pudieron cargar las subdependencias"))
      .finally(() => {
        if (mounted) setLoadingSubdependencias(false);
      });

    return () => {
      mounted = false;
    };
  }, [anexoId]);

  const selectedAnexo = useMemo(
    () => anexos.find((item) => String(item.id) === anexoId),
    [anexoId, anexos]
  );
  const selectedSubdependencia = useMemo(
    () =>
      subdependencias.find(
        (item) => String(item.id) === subdependenciaId
      ),
    [subdependenciaId, subdependencias]
  );

  const handleGenerate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedAnexo || !selectedSubdependencia) {
      toast.error("Selecciona un anexo y una subdependencia");
      return;
    }

    const publicUrl = new URL(
      `/inventario-publico/subdependencia/${selectedSubdependencia.id}`,
      window.location.origin
    ).href;

    setQrReady(false);
    setGenerated({
      targetType: "subdependencia",
      targetId: selectedSubdependencia.id,
      targetName: selectedSubdependencia.nombre,
      anexoId: selectedAnexo.id,
      anexoNombre: selectedAnexo.nombre,
      publicUrl,
      qrUrl: createQrImageUrl(publicUrl),
    });
  };

  const handleGenerateDirectory = (directory: PublicDirectoryConfig) => {
    const anexo = anexos.find((item) => item.id === directory.anexoId);
    const anexoName = anexo?.nombre || directory.anexoName;
    const publicUrl = new URL(
      publicDirectoryPath(directory.slug),
      window.location.origin
    ).href;

    setQrReady(false);
    setGenerated({
      targetType: "directorio",
      targetId: directory.anexoId,
      targetName: directory.title,
      anexoId: directory.anexoId,
      anexoNombre: anexoName,
      publicUrl,
      qrUrl: createQrImageUrl(publicUrl),
    });
  };

  const handleCopy = async () => {
    if (!generated) return;
    try {
      await copyText(generated.publicUrl);
      toast.success("Enlace p\u00fablico copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const handleOpen = () => {
    if (!generated) return;
    const publicWindow = window.open(
      generated.publicUrl,
      "_blank",
      "noopener,noreferrer"
    );
    if (publicWindow) publicWindow.opener = null;
  };

  const handlePrint = () => {
    if (!generated || !qrReady) {
      toast.error("Espera a que el QR termine de cargar");
      return;
    }
    window.print();
  };

  return (
    <>
      <Wrapper>
      <Toaster />
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 210mm;
            height: 296mm;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }

          body > main {
            display: none !important;
          }

          body > .qr-print-portal {
            display: block !important;
            position: fixed !important;
            inset: 0 !important;
            width: 210mm !important;
            height: 296mm !important;
            margin: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }

          .qr-print-portal .qr-print-sheet {
            width: 210mm !important;
            height: 296mm !important;
            max-width: none !important;
            box-sizing: border-box !important;
            aspect-ratio: auto !important;
            margin: 0 !important;
            padding: 14mm 18mm 10mm !important;
            border: 0 !important;
            box-shadow: none !important;
          }
        }

        .qr-print-portal {
          display: none;
        }
      `}</style>

      <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950 md:px-6 md:py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/ListadosGenerales"
                className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-300"
              >
                <ArrowLeft className="h-4 w-4" />
                {"Volver a impresi\u00f3n"}
              </Link>
              <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-400">
                {"Herramienta privada"}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white md:text-3xl">
                {"QR y enlaces p\u00fablicos"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                {"Gener\u00e1 una consulta individual o uno de los directorios p\u00fablicos autorizados."}
              </p>
            </div>

            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <QrCode className="h-4 w-4" />
              Los faltantes no se publican
            </div>
          </div>

          <section className="mb-7" aria-labelledby="special-access-title">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">
                  Accesos especiales
                </p>
                <h2 id="special-access-title" className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                  {"Directorios p\u00fablicos"}
                </h2>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Anexos completos y grupos seleccionados
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PUBLIC_DIRECTORIES.map((directory) => (
                <button
                  key={directory.slug}
                  type="button"
                  onClick={() => handleGenerateDirectory(directory)}
                  className="group relative min-h-[164px] overflow-hidden rounded-lg border border-slate-200 bg-slate-900 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-slate-700"
                >
                  <Image
                    src={directory.imageSrc}
                    alt=""
                    fill
                    className="object-cover opacity-45 transition duration-300 group-hover:scale-[1.03] group-hover:opacity-55"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <span className="absolute inset-0 bg-slate-950/45" />
                  <span className="relative flex min-h-[164px] flex-col justify-between p-4 text-white">
                    <span className="flex items-start justify-between gap-3">
                      <span className="rounded-md bg-white/95 px-2 py-1 text-[11px] font-black uppercase text-slate-900">
                        {directory.scopeLabel}
                      </span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white">
                        <QrCode className="h-4 w-4" />
                      </span>
                    </span>
                    <span>
                      <span className="block text-base font-black leading-snug">
                        {directory.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-200">
                        {directory.description}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <section className="self-start rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    {"Elegir ubicaci\u00f3n"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Una subdependencia individual
                  </p>
                </div>
              </div>

              <form onSubmit={handleGenerate} className="space-y-5">
                <div>
                  <label
                    htmlFor="qr-anexo"
                    className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Anexo
                  </label>
                  <select
                    id="qr-anexo"
                    value={anexoId}
                    onChange={(event) => setAnexoId(event.target.value)}
                    disabled={loadingAnexos}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:cursor-wait disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-cyan-950"
                  >
                    <option value="">
                      {loadingAnexos ? "Cargando anexos..." : "Seleccionar anexo"}
                    </option>
                    {anexos.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.id} - {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="qr-subdependencia"
                    className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Subdependencia
                  </label>
                  <select
                    id="qr-subdependencia"
                    value={subdependenciaId}
                    onChange={(event) => {
                      setSubdependenciaId(event.target.value);
                      setGenerated(null);
                      setQrReady(false);
                    }}
                    disabled={!anexoId || loadingSubdependencias}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-800"
                  >
                    <option value="">
                      {loadingSubdependencias
                        ? "Cargando subdependencias..."
                        : "Seleccionar subdependencia"}
                    </option>
                    {subdependencias.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.id} - {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!selectedAnexo || !selectedSubdependencia}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-bold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800"
                >
                  <QrCode className="h-4 w-4" />
                  Generar QR y enlace
                </button>
              </form>

              {generated && (
                <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
                  <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                    {"Enlace p\u00fablico"}
                  </label>
                  <div className="mt-2 break-all rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    {generated.publicUrl}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copiar
                    </button>
                    <button
                      type="button"
                      onClick={handleOpen}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <FileText className="h-4 w-4" />
                  Vista previa A4
                </div>
                {generated && (
                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={!qrReady}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-black disabled:cursor-wait disabled:bg-slate-400 dark:bg-cyan-600 dark:hover:bg-cyan-500"
                  >
                    <Printer className="h-4 w-4" />
                    {qrReady ? "Imprimir A4" : "Preparando QR..."}
                  </button>
                )}
              </div>

              {generated ? (
                <QrPrintSheet
                  generated={generated}
                  onQrReady={() => setQrReady(true)}
                  className="mx-auto shadow-xl ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex aspect-[210/297] w-full max-w-[720px] items-center justify-center border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  {"Gener\u00e1 un destino p\u00fablico para preparar la l\u00e1mina A4."}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
      </Wrapper>

      {mounted &&
        generated &&
        createPortal(
          <div className="qr-print-portal" aria-hidden="true">
            <QrPrintSheet
              generated={generated}
              onQrReady={() => setQrReady(true)}
            />
          </div>,
          document.body
        )}
    </>
  );
}
