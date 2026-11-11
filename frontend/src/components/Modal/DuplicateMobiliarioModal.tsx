"use client";

import { type FormEvent, useEffect, useState } from "react";
import { FaCopy, FaTimes } from "react-icons/fa";

interface DuplicateMobiliarioModalProps {
  isOpen: boolean;
  itemId?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (cantidad: number) => void;
}

export default function DuplicateMobiliarioModal({
  isOpen,
  itemId,
  loading = false,
  onCancel,
  onConfirm,
}: DuplicateMobiliarioModalProps) {
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    if (isOpen) setCantidad(1);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const safeCantidad = Math.max(1, Math.min(100, Number(cantidad) || 1));
    onConfirm(safeCantidad);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
              <FaCopy className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                Duplicar mobiliario
              </h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {itemId ? `ID ${itemId}` : "Seleccionado"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            aria-label="Cerrar"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
            Cantidad
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={cantidad}
            disabled={loading}
            onChange={(event) => setCantidad(Number(event.target.value))}
            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-emerald-400 dark:focus:ring-emerald-950"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-10 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaCopy className="h-4 w-4" />
            {loading ? "Duplicando..." : "Duplicar"}
          </button>
        </div>
      </form>
    </div>
  );
}
