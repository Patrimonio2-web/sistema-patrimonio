
"use client";

import Link from "next/link";
import { FaPlus } from "react-icons/fa";
import { Toaster } from "react-hot-toast";
import { isComisario, isMatafuegosManager, isViewer } from "@/services/authRole";

export default function PatrimonioBotonNuevo() {
  const viewer = isViewer();
  const restrictedRole = isMatafuegosManager() || isComisario();

  if (restrictedRole) return null;

  return (
    <>
      <Toaster position="top-right" />
      {viewer ? (
        // Botón deshabilitado para viewer
        <button
          disabled
          title="Solo lectura: no tenés permisos para crear un mobiliario."
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 
                     bg-gray-400 text-gray-200 cursor-not-allowed 
                     text-sm font-medium py-3 px-5 rounded-full shadow-lg"
        >
          <FaPlus className="w-4 h-4" />
          Nuevo
        </button>
      ) : (
        // Link habilitado para admin
        <Link
          href="/patrimonio/nuevo"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 
           bg-emerald-600 text-white text-sm font-medium py-3 px-5 
           rounded-full shadow-lg hover:bg-emerald-700 
           dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          <FaPlus className="w-4 h-4" />
          Nuevo
        </Link>
      )}
    </>
  );
}
