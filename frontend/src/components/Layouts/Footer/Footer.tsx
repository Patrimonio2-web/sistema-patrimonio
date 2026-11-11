
"use client";

import { Code2, Copyright, Mail } from "lucide-react";

interface FooterProps {
  variant?: "light" | "dark";
}

export default function Footer({ variant }: FooterProps) {
  // Detectar fondo automáticamente si no se pasa la prop
  const isDark =
    variant === "dark" ||
    (!variant &&
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const accentText = isDark ? "text-cyan-300" : "text-cyan-700";
  const accentIcon = isDark ? "text-cyan-300" : "text-cyan-600";
  const mutedText = isDark ? "text-slate-300" : "text-slate-600";
  const linkClass = isDark
    ? "text-cyan-300 decoration-cyan-700 hover:text-cyan-200"
    : "text-cyan-700 decoration-cyan-300 hover:text-cyan-800";

  return (
    <footer
      className={`${
        isDark
          ? "border-t border-white/10 bg-slate-950 text-white"
          : "border-t border-slate-200 bg-white/90 text-slate-800"
      } mt-auto px-4 py-5`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <p className="inline-flex items-center justify-center gap-2 font-semibold sm:justify-start">
            <Copyright className={`h-4 w-4 ${accentIcon}`} />
            © 2025 — Derechos de Software
          </p>

          <p className={`inline-flex items-center justify-center gap-2 text-xs font-semibold sm:justify-start ${accentText}`}>
            <Code2 className="h-4 w-4" />
            Developers: Facundo Nuñez · Nahun Menem
          </p>
        </div>

        <p className={`inline-flex flex-wrap items-center justify-center gap-2 text-center text-xs font-medium sm:justify-end ${mutedText}`}>
          <Mail className={`h-4 w-4 ${accentIcon}`} />
          <span>Contacto:</span>
          <a
            href="mailto:patrimonio@legislaturalarioja.gob.ar"
            className={`font-semibold underline underline-offset-4 transition ${linkClass}`}
          >
            patrimoniolegislaturalarioja@gmail.com
          </a>
        </p>
      </div>
    </footer>
  );
}
