import type { Metadata } from "next";
import { Suspense } from "react";
import PublicMobiliarioView from "./PublicMobiliarioView";

export const metadata: Metadata = {
  title: "Consulta de mobiliario | Patrimonio",
  description: "Ficha p\u00fablica de un bien de la Direcci\u00f3n de Patrimonio.",
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
  },
};

function PublicMobiliarioLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-700">
      <div className="flex items-center gap-3 text-sm font-semibold" role="status">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-700" />
        Cargando ficha...
      </div>
    </div>
  );
}

export default function PublicMobiliarioPage() {
  return (
    <Suspense fallback={<PublicMobiliarioLoading />}>
      <PublicMobiliarioView />
    </Suspense>
  );
}
