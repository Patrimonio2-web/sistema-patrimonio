"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaChevronLeft,
  FaChevronRight,
  FaCompressAlt,
  FaImage,
  FaSearchPlus,
} from "react-icons/fa";

type MobiliarioPhotoGalleryProps = {
  photos: Array<string | null | undefined>;
  alt?: string;
  className?: string;
  imageClassName?: string;
  emptyLabel?: string;
  thumbnail?: boolean;
};

function optimizedCloudinaryUrl(value: string, width: number) {
  if (!value.includes("res.cloudinary.com") || !value.includes("/image/upload/")) {
    return value;
  }
  if (value.includes("/image/upload/f_auto,")) return value;
  return value.replace(
    "/image/upload/",
    `/image/upload/f_auto,q_auto,c_limit,w_${width}/`
  );
}

export default function MobiliarioPhotoGallery({
  photos,
  alt = "Foto del mobiliario",
  className = "h-56 w-full rounded-2xl border border-slate-200 bg-slate-100 sm:h-72 dark:border-slate-700 dark:bg-slate-950/60",
  imageClassName = "object-contain",
  emptyLabel = "Sin imagen",
  thumbnail = false,
}: MobiliarioPhotoGalleryProps) {
  const validPhotos = useMemo(
    () => photos.map((photo) => String(photo || "").trim()).filter(Boolean),
    [photos]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (validPhotos.length > 0 && currentIndex >= validPhotos.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, validPhotos.length]);

  const hasMultiple = validPhotos.length > 1;
  const currentPhoto = validPhotos[currentIndex];

  useEffect(() => {
    if (!zoomOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setZoomOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomOpen]);

  const goToPrevious = () => {
    if (!hasMultiple) return;
    setCurrentIndex((prev) => (prev === 0 ? validPhotos.length - 1 : prev - 1));
  };

  const goToNext = () => {
    if (!hasMultiple) return;
    setCurrentIndex((prev) => (prev === validPhotos.length - 1 ? 0 : prev + 1));
  };

  return (
    <>
      <div
        className={`relative flex items-center justify-center overflow-hidden ${
          currentPhoto ? "cursor-zoom-in" : ""
        } ${className}`}
        onClick={() => currentPhoto && setZoomOpen(true)}
        role={currentPhoto ? "button" : undefined}
        tabIndex={currentPhoto ? 0 : undefined}
        onKeyDown={(event) => {
          if (!currentPhoto) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setZoomOpen(true);
          }
        }}
        aria-label={currentPhoto ? "Ampliar foto" : undefined}
        title={currentPhoto ? "Ampliar foto" : undefined}
      >
        {currentPhoto ? (
          <>
            <Image
              src={optimizedCloudinaryUrl(currentPhoto, thumbnail ? 240 : 960)}
              alt={alt}
              fill
              unoptimized
              className={imageClassName}
              sizes={thumbnail ? "80px" : "(max-width: 768px) 100vw, 420px"}
            />

            {!thumbnail && <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setZoomOpen(true);
              }}
              className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/70 text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              aria-label="Ampliar foto"
              title="Ampliar foto"
            >
              <FaSearchPlus className="h-4 w-4" />
            </button>}

            {hasMultiple && !thumbnail && (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goToPrevious();
                  }}
                  className="absolute left-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/70 text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  aria-label="Foto anterior"
                  title="Foto anterior"
                >
                  <FaChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goToNext();
                  }}
                  className="absolute right-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/70 text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  aria-label="Foto siguiente"
                  title="Foto siguiente"
                >
                  <FaChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
                  <span>{currentIndex + 1}/{validPhotos.length}</span>
                  <div className="flex gap-1">
                    {validPhotos.map((photo, index) => (
                      <button
                        key={`${photo}-${index}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setCurrentIndex(index);
                        }}
                        className={`h-2 w-2 rounded-full transition ${
                          index === currentIndex ? "bg-white" : "bg-white/40 hover:bg-white/70"
                        }`}
                        aria-label={`Ver foto ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm font-semibold text-slate-400 dark:text-slate-500">
            <FaImage className="text-2xl" />
            <span>{emptyLabel}</span>
          </div>
        )}
      </div>

      {zoomOpen && currentPhoto && createPortal(
        <div
          data-mobiliario-zoom
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada de la fotografía"
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 px-2 pb-3 pt-16 sm:px-6 sm:pb-6 sm:pt-20"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            className="fixed right-3 z-[260] inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/30 bg-white px-4 text-sm font-black text-slate-950 shadow-2xl transition hover:bg-cyan-50 hover:text-cyan-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:right-6"
            style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
            aria-label="Cerrar vista ampliada"
            title="Cerrar vista ampliada"
            autoFocus
          >
            <FaCompressAlt className="h-4 w-4" />
            <span>Cerrar vista</span>
          </button>

          <div
            className="relative h-[calc(100dvh-5rem)] w-full max-w-6xl sm:h-[calc(100dvh-6.5rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={goToPrevious}
                  className="absolute left-2 top-1/2 z-30 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Foto anterior"
                  title="Foto anterior"
                >
                  <FaChevronLeft />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 z-30 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Foto siguiente"
                  title="Foto siguiente"
                >
                  <FaChevronRight />
                </button>
              </>
            )}

            <Image
              src={optimizedCloudinaryUrl(currentPhoto, 1800)}
              alt={`${alt} ampliada`}
              fill
              unoptimized
              className="rounded-xl object-contain shadow-2xl"
              sizes="100vw"
              priority
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
