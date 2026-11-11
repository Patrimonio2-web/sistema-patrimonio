
"use client";

import Link from "next/link";
import { ArrowLeft, Clock3, Construction } from "lucide-react";
import { Wrapper } from "@/components";

export default function Control() {
  return (
    <Wrapper>
      <main className="min-h-[70vh] bg-slate-100 px-4 py-8 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">
            Sistema de Patrimonio
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
            Control
          </h1>
        </div>
      </main>

      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="control-unavailable-title"
      >
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <Construction className="h-8 w-8" aria-hidden="true" />
          </div>

          <p className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase text-amber-700 dark:text-amber-300">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            Próxima versión
          </p>
          <h2
            id="control-unavailable-title"
            className="mt-2 text-2xl font-black text-slate-950 dark:text-white"
          >
            Sección no disponible aún
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Estamos trabajando en esta sección para incorporarla en una próxima
            versión del sistema.
          </p>

          <Link
            href="/Anexos"
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white transition hover:bg-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:bg-cyan-600 dark:hover:bg-cyan-500"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a Anexos
          </Link>
        </section>
      </div>
    </Wrapper>
  );
}
