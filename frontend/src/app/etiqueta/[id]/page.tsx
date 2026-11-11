// src/app/etiqueta/[id]/page.tsx
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import { FaCopy, FaExternalLinkAlt } from "react-icons/fa";

type EtiquetaModelId = "clasica" | "institucional" | "compacta" | "qr";
type EtiquetaTone = "blanca" | "negra";

type EtiquetaModel = {
  label: string;
  description: string;
  widthMm: number;
  heightMm: number;
};

const ETIQUETA_MODELS: Record<EtiquetaModelId, EtiquetaModel> = {
  clasica: {
    label: "Cl\u00e1sica",
    description: "60x24, contraste alto",
    widthMm: 60,
    heightMm: 24,
  },
  institucional: {
    label: "Institucional",
    description: "50x24, fondo claro",
    widthMm: 50,
    heightMm: 24,
  },
  compacta: {
    label: "Compacta",
    description: "50x12, estilo cinta",
    widthMm: 50,
    heightMm: 12,
  },
  qr: {
    label: "QR",
    description: "24x24, QR + ID",
    widthMm: 24,
    heightMm: 24,
  },
};

const MODEL_ORDER: EtiquetaModelId[] = ["clasica", "institucional", "compacta", "qr"];
const ETIQUETA_TONES: EtiquetaTone[] = ["blanca", "negra"];

function getModelId(value: string | null): EtiquetaModelId {
  return MODEL_ORDER.includes(value as EtiquetaModelId)
    ? (value as EtiquetaModelId)
    : "clasica";
}

function getDefaultTone(model: EtiquetaModelId): EtiquetaTone {
  return model === "clasica" || model === "qr" ? "negra" : "blanca";
}

function getEtiquetaTone(value: string | null, model: EtiquetaModelId): EtiquetaTone {
  if (value === "blanca" || value === "negra") return value;
  return getDefaultTone(model);
}

function formatPatrimonioId(id: string) {
  return id.padStart(6, "0");
}

function QrCodeImage({
  id,
  qrUrl,
  onReady,
}: {
  id: string;
  qrUrl: string;
  onReady: () => void;
}) {
  return (
    <Image
      src={qrUrl}
      alt={`QR del bien ${id}`}
      width={240}
      height={240}
      crossOrigin="anonymous"
      unoptimized
      priority
      onLoad={onReady}
      className="h-full w-full object-contain"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

function EtiquetaClasica({
  id,
  year,
  qrUrl,
  onQrReady,
  tone = "negra",
}: {
  id: string;
  year: number;
  qrUrl: string;
  onQrReady: () => void;
  tone?: EtiquetaTone;
}) {
  const isDark = tone === "negra";
  const containerClasses = isDark ? "bg-black text-white" : "bg-white text-black";
  const textClasses = isDark ? "text-white" : "text-black";

  return (
    <div
      className={`flex h-full w-full items-center gap-[0.35mm] px-[0.55mm] py-[0.9mm] ${containerClasses}`}
    >
      <div className="flex h-[13mm] w-[13mm] shrink-0 items-center justify-center rounded-[0.45mm] bg-white p-[0.5mm]">
        <QrCodeImage id={id} qrUrl={qrUrl} onReady={onQrReady} />
      </div>

      {!isDark && <div className="mx-[0.65mm] h-[18.6mm] w-[0.35mm] shrink-0 bg-black" />}

      <div className={`flex flex-1 flex-col items-center justify-center text-center leading-none ${textClasses}`}>
        <p
          className="whitespace-nowrap text-[3.5mm] font-black uppercase"
          style={{ fontFamily: "Arial Black, Arial, sans-serif", letterSpacing: "-0.065em" }}
        >
          {"Funci\u00f3n Legislativa"}
        </p>
        <p
          className="mt-[0.04mm] whitespace-nowrap text-[3.72mm] font-black"
          style={{ fontFamily: "Arial Black, Arial, sans-serif", letterSpacing: "-0.065em" }}
        >
          {"Direcci\u00f3n de Patrimonio"}
        </p>
        <p
          className="mt-[0.6mm] text-[5.65mm] font-black tracking-[0.01em]"
          style={{ fontFamily: "Arial Black, Arial, sans-serif" }}
        >
          {formatPatrimonioId(id)}
        </p>
        <p
          className="mt-[0.38mm] text-[2.95mm] font-black tracking-[0.05em]"
          style={{ fontFamily: "Arial Black, Arial, sans-serif" }}
        >
          {year}
        </p>
      </div>
    </div>
  );
}

function EtiquetaInstitucional({
  id,
  year,
  qrUrl,
  onQrReady,
  tone = "blanca",
}: {
  id: string;
  year: number;
  qrUrl: string;
  onQrReady: () => void;
  tone?: EtiquetaTone;
}) {
  const isDark = tone === "negra";
  const containerClasses = isDark
    ? "border-black bg-black text-white"
    : "border-black bg-white text-black";
  const qrPanelClasses = isDark
    ? "border-black bg-white"
    : "border-black bg-slate-50";

  return (
    <div
      className={`grid h-full w-full grid-cols-[15.7mm_1fr] overflow-hidden border-[0.42mm] ${containerClasses}`}
    >
      <div
        className={`flex items-center justify-center border-r-[0.3mm] p-[0.9mm] ${qrPanelClasses}`}
      >
        <div className="h-[13.9mm] w-[13.9mm]">
          <QrCodeImage id={id} qrUrl={qrUrl} onReady={onQrReady} />
        </div>
      </div>

      <div className="flex h-full flex-col items-center justify-start text-center px-[0.65mm] pt-[0.22mm] pb-[0.2mm]">
        <div className="w-full">
          <p
            className="text-[3.25mm] font-black uppercase tracking-[0.05em] leading-[0.84]"
            style={{ fontFamily: "Arial Black, Arial, sans-serif" }}
          >
            <span className="block">{"Funci\u00f3n"}</span>
            <span className="block mt-[0.05mm]">LEGISLATIVA</span>
          </p>
          <p
            className="mt-[0.08mm] text-[3.15mm] font-black"
            style={{ fontFamily: "Arial Black, Arial, sans-serif" }}
          >
            Dir. de Patrimonio
          </p>
        </div>

        <div className="-mt-[0.05mm] -translate-y-[0.3mm] w-full">
          <p
            className="text-[6.1mm] font-black leading-none"
            style={{ fontFamily: "Arial Black, Arial, sans-serif" }}
          >
            {formatPatrimonioId(id)}
          </p>
        </div>

        <p
          className="-mt-[0.08mm] text-[2.55mm] font-black tracking-[0.04em]"
          style={{ fontFamily: "Arial Black, Arial, sans-serif" }}
        >
          {year}
        </p>
      </div>
    </div>
  );
}

function EtiquetaCompacta({
  id,
  qrUrl,
  onQrReady,
  tone = "blanca",
}: {
  id: string;
  qrUrl: string;
  onQrReady: () => void;
  tone?: EtiquetaTone;
}) {
  const isDark = tone === "negra";
  const outerClasses = isDark
    ? "bg-black p-0 text-white"
    : "bg-white pt-[0.06mm] pr-[1mm] pb-[0.06mm] pl-[0.28mm] text-black";
  const frameClasses = isDark
    ? "border-0 bg-black"
    : "border-black bg-white";
  const frameBorderClasses = isDark ? "border-0" : "border-[0.26mm]";
  const separatorClasses = isDark ? "bg-black" : "bg-black";
  const textClasses = isDark ? "text-white" : "text-black";
  const framePaddingClasses = isDark ? "px-[0.18mm] py-0" : "px-[0.18mm] py-0";

  return (
    <div
      className={`h-full w-full ${outerClasses}`}
    >
      <div
        className={`flex h-full w-full items-center overflow-hidden ${frameBorderClasses} ${framePaddingClasses} ${frameClasses}`}
      >
        <div className="flex h-[11.35mm] w-[11.35mm] shrink-0 items-center justify-center bg-white p-0">
          <div className="h-full w-full">
            <QrCodeImage id={id} qrUrl={qrUrl} onReady={onQrReady} />
          </div>
        </div>

        <div className={`ml-[0.95mm] mr-[0.6mm] w-[0.28mm] self-stretch shrink-0 ${separatorClasses}`} />

        <div className={`flex min-w-0 flex-1 flex-col justify-start -translate-y-[0.35mm] pt-0 text-center leading-none ${textClasses}`}>
          <p
            className="-translate-y-[1.2mm] text-[3mm] font-black"
            style={{ fontFamily: "Arial Black, Arial, sans-serif" }}
          >
            {"Funci\u00f3n Legislativa"}
          </p>
          <p
            className="-mt-[0.35mm] text-[2.25mm] font-black"
            style={{ fontFamily: "Arial Black, Arial, sans-serif" }}
          >
            Dir. de Patrimonio
          </p>
          <p
            className="-translate-y-[1.6mm] text-[4.8mm] font-black tracking-[0.01em]"
            style={{ fontFamily: "Arial Black, Arial, sans-serif" }}
          >
            {formatPatrimonioId(id)}
          </p>
        </div>
      </div>
    </div>
  );
}

function EtiquetaQrSolo({
  id,
  qrUrl,
  onQrReady,
  tone = "negra",
}: {
  id: string;
  qrUrl: string;
  onQrReady: () => void;
  tone?: EtiquetaTone;
}) {
  const isDark = tone === "negra";
  const background = isDark ? "#000000" : "#ffffff";
  const textColor = isDark ? "#ffffff" : "#000000";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background,
        color: textColor,
        boxSizing: "border-box",
        border: isDark ? "none" : "0.35mm solid #000000",
      }}
    >
      <div
        className="absolute flex items-center justify-center overflow-hidden"
        style={{
          top: "0.65mm",
          left: "0",
          width: "24mm",
          height: "2.75mm",
          zIndex: 2,
        }}
      >
        <p
          className="whitespace-nowrap font-black"
          style={{
            fontFamily: "Arial Black, Arial, sans-serif",
            fontSize: "1.05mm",
            lineHeight: "1.05mm",
            letterSpacing: "0.02em",
          }}
        >
          Dir. de Patrimonio
        </p>
      </div>

      <div
        className="absolute flex items-center justify-center bg-white"
        style={{
          top: "5.05mm",
          left: "4.85mm",
          width: "14.3mm",
          height: "14.3mm",
          padding: "0.22mm",
          boxSizing: "border-box",
          zIndex: 1,
        }}
      >
        <QrCodeImage id={id} qrUrl={qrUrl} onReady={onQrReady} />
      </div>

      <div
        className="absolute flex items-center justify-center"
        style={{
          top: "18.25mm",
          left: "0",
          width: "24mm",
          height: "4.2mm",
          zIndex: 2,
        }}
      >
        <p
          className="whitespace-nowrap font-black"
          style={{
            fontFamily: "Arial Black, Arial, sans-serif",
            fontSize: "2.35mm",
            lineHeight: "2.35mm",
            letterSpacing: "0.05em",
          }}
        >
          {formatPatrimonioId(id)}
        </p>
      </div>
    </div>
  );
}

export default function EtiquetaPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stageRef = useRef<HTMLDivElement | null>(null);

  const id = String(params?.id ?? "");
  const embedded = searchParams.get("embedded") === "1";
  const batchRequest = searchParams.get("batch");
  const selectedModel = getModelId(searchParams.get("modelo"));
  const selectedTone = getEtiquetaTone(searchParams.get("tono"), selectedModel);
  const activeModel = ETIQUETA_MODELS[selectedModel];

  const backendBase = (
    process.env.NEXT_PUBLIC_API_BASE || "/api"
  )
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

  const qrTargetUrl = `${backendBase}/ver?id=${encodeURIComponent(id)}`;
  const qrUrl = useMemo(() => {
    const isCompacta = selectedModel === "compacta";
    const isQrSolo = selectedModel === "qr";
    const size = isCompacta || isQrSolo ? "2200x2200" : "720x720";
    const margin = isCompacta ? "72" : "0";

    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}&margin=${margin}&data=${encodeURIComponent(
      qrTargetUrl
    )}`;
  }, [qrTargetUrl, selectedModel]);

  const [qrReady, setQrReady] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);

  useEffect(() => {
    setQrReady(false);
  }, [selectedModel, qrUrl]);

  const createPngDataUrl = useCallback(async (forChain = false) => {
    if (!stageRef.current) throw new Error("label_not_ready");
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(stageRef.current, {
      backgroundColor: "#ffffff",
      scale: forChain ? 10 : 8,
      useCORS: true,
    });
    return canvas.toDataURL("image/png");
  }, []);

  useEffect(() => {
    if (!batchRequest || !qrReady) return;
    let cancelled = false;

    const exportForBatch = async () => {
      try {
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() =>
            window.requestAnimationFrame(() => resolve())
          );
        });
        const dataUrl = await createPngDataUrl(true);
        if (cancelled) return;
        window.parent.postMessage(
          {
            type: "patrimonio:etiqueta-png",
            requestId: batchRequest,
            id,
            dataUrl,
          },
          window.location.origin
        );
      } catch {
        if (cancelled) return;
        window.parent.postMessage(
          {
            type: "patrimonio:etiqueta-png-error",
            requestId: batchRequest,
            id,
          },
          window.location.origin
        );
      }
    };

    void exportForBatch();
    return () => {
      cancelled = true;
    };
  }, [batchRequest, createPngDataUrl, id, qrReady]);

  const handleModelChange = (model: EtiquetaModelId) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("modelo", model);
    nextParams.delete("autoprint");
    nextParams.set("tono", getDefaultTone(model));
    router.replace(`/etiqueta/${id}?${nextParams.toString()}`);
  };

  const handleToneChange = (tone: EtiquetaTone) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("modelo", selectedModel);
    nextParams.set("tono", tone);
    nextParams.delete("autoprint");
    router.replace(`/etiqueta/${id}?${nextParams.toString()}`);
  };

  const handleCopyPublicLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(qrTargetUrl);
      } else {
        const input = document.createElement("textarea");
        input.value = qrTargetUrl;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("copy_failed");
      }
      toast.success("Enlace p\u00fablico copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const handleDownloadPng = async () => {
    if (!stageRef.current) return;

    try {
      setDownloadingPng(true);
      const link = document.createElement("a");
      const fileModel =
        `${selectedModel}-${selectedTone}`;
      link.href = await createPngDataUrl();
      link.download = `etiqueta-${formatPatrimonioId(id)}-${fileModel}.png`;
      link.click();

      toast.success("Etiqueta descargada en PNG");
    } catch {
      toast.error("No se pudo descargar la etiqueta");
    } finally {
      setDownloadingPng(false);
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <p className="text-sm text-gray-600">
          {"No se encontr\u00f3 el ID de la etiqueta."}
        </p>
      </div>
    );
  }

  const year = new Date().getFullYear();

  return (
    <>
      <Toaster />

      <style jsx global>{`
        @page {
          size: ${activeModel.widthMm}mm ${activeModel.heightMm}mm;
          margin: 0;
        }

        html,
        body {
          margin: 0;
          padding: 0;
        }

        @media print {
          html,
          body {
            width: ${activeModel.widthMm}mm;
            height: ${activeModel.heightMm}mm;
            background: white !important;
          }

          .etiqueta-toolbar {
            display: none !important;
          }

          .etiqueta-page {
            min-height: auto !important;
            padding: 0 !important;
            background: white !important;
          }

          .etiqueta-stage {
            margin: 0 !important;
          }

          .etiqueta-preview {
            box-shadow: none !important;
          }
        }
      `}</style>

      <main className="etiqueta-page min-h-screen bg-slate-100 px-4 py-6 text-black">
        {!batchRequest && <div className="etiqueta-toolbar mx-auto mb-6 flex w-full max-w-4xl flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Etiqueta {formatPatrimonioId(id)}
            </p>
            <p className="text-xs text-slate-500">
              {activeModel.widthMm}mm x {activeModel.heightMm}mm -{" "}
              {activeModel.description}
              {`, fondo ${selectedTone}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {!embedded && (
              <>
                {MODEL_ORDER.map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => handleModelChange(model)}
                    className={`rounded-full px-3 py-2 text-sm transition ${
                      selectedModel === model
                        ? "bg-cyan-700 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {ETIQUETA_MODELS[model].label}
                  </button>
                ))}

                <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
                  {ETIQUETA_TONES.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => handleToneChange(tone)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        selectedTone === tone
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-white"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={handleCopyPublicLink}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-700 bg-white px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              title={"Copiar el enlace p\u00fablico incluido en el QR"}
            >
              <FaCopy aria-hidden="true" />
              Copiar enlace
            </button>

            <a
              href={qrTargetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              aria-label={"Abrir ficha p\u00fablica"}
              title={"Abrir ficha p\u00fablica"}
            >
              <FaExternalLinkAlt aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={!qrReady || downloadingPng}
              className="rounded-full bg-black px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {downloadingPng ? "Generando PNG..." : "Descargar PNG"}
            </button>
          </div>
        </div>}

        <div className="flex justify-center">
          <div className="etiqueta-preview overflow-hidden bg-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
            <div
              ref={stageRef}
              className="etiqueta-stage overflow-hidden bg-white"
              style={{
                width: `${activeModel.widthMm}mm`,
                height: `${activeModel.heightMm}mm`,
              }}
            >
              {selectedModel === "clasica" && (
                <EtiquetaClasica
                  id={id}
                  year={year}
                  qrUrl={qrUrl}
                  onQrReady={() => setQrReady(true)}
                  tone={selectedTone}
                />
              )}

              {selectedModel === "institucional" && (
                <EtiquetaInstitucional
                  id={id}
                  year={year}
                  qrUrl={qrUrl}
                  onQrReady={() => setQrReady(true)}
                  tone={selectedTone}
                />
              )}

              {selectedModel === "compacta" && (
                <EtiquetaCompacta
                  id={id}
                  qrUrl={qrUrl}
                  onQrReady={() => setQrReady(true)}
                  tone={selectedTone}
                />
              )}

              {selectedModel === "qr" && (
                <EtiquetaQrSolo
                  id={id}
                  qrUrl={qrUrl}
                  onQrReady={() => setQrReady(true)}
                  tone={selectedTone}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
