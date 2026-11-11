// components/Nomenclador.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  obtenerRubros,
  buscarClases,
  Rubro,
  Clase
} from "@/services/nomencladorService";

interface NomencladorProps {
  onSave: (seleccion: { rubro: Rubro; clase: Clase }) => void;
  onClose: () => void;
}

const norm = (s: string) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export default function Nomenclador({
  onSave,
  onClose
}: NomencladorProps) {
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [claseSearch, setClaseSearch] = useState("");
  const [selectedRubro, setSelectedRubro] = useState<Rubro | null>(null);
  const [selectedClase, setSelectedClase] = useState<Clase | null>(null);
  const [loadingClases, setLoadingClases] = useState(false);

  useEffect(() => {
    obtenerRubros().then(setRubros).catch(console.error);
  }, []);

  useEffect(() => {
    const q = claseSearch.trim();

    setSelectedClase(null);
    setSelectedRubro(null);

    if (!q) {
      setClases([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setLoadingClases(true);
        const resultados = await buscarClases(q);
        setClases(resultados);
      } catch (e) {
        console.error(e);
        setClases([]);
      } finally {
        setLoadingClases(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [claseSearch]);

  const filteredClases = useMemo(() => {
    const q = norm(claseSearch);
    if (!q) return clases;

    return clases.filter((c) => {
      const desc = norm(c.descripcion);
      const id = String(c.id_clase);
      return desc.includes(q) || id.includes(q);
    });
  }, [clases, claseSearch]);

  const handleSelectClase = (c: Clase) => {
    setSelectedClase(c);

    if (Number(c.id_clase) === 9999) {
      setSelectedRubro(null);
      return;
    }

    const rubroLocal =
      rubros.find((r) => r.id_rubro === c.id_rubro) ?? null;

    setSelectedRubro(rubroLocal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
      <div className="relative max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-lg dark:bg-zinc-900">

        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 dark:hover:text-white text-2xl"
          onClick={onClose}
        >
          ×
        </button>

        <div className="p-6 pb-32 md:pb-6">
          <h2 className="text-xl font-semibold mb-6">
            Seleccionar Clase y Rubro
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* BUSCADOR */}
            <div>
              <label className="block mb-2 text-sm font-medium">
                Buscar Clase:
              </label>

              <input
                type="text"
                placeholder="Buscar por descripción o ID..."
                className="w-full mb-4 p-2 border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800"
                value={claseSearch}
                onChange={(e) => setClaseSearch(e.target.value)}
              />

              <div className="max-h-64 overflow-y-auto border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-zinc-800 uppercase text-xs sticky top-0">
                    <tr>
                      <th className="px-4 py-2">ID Clase</th>
                      <th className="px-4 py-2">Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClases.map((c) => (
                      <tr
                        key={`${c.id_rubro}-${c.id_clase}`}
                        onClick={() => handleSelectClase(c)}
                        className={`cursor-pointer ${
                          selectedClase?.id_clase === c.id_clase &&
                          selectedClase?.id_rubro === c.id_rubro
                            ? "bg-cyan-100 dark:bg-cyan-900"
                            : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <td className="px-4 py-2">{c.id_clase}</td>
                        <td className="px-4 py-2">{c.descripcion}</td>
                      </tr>
                    ))}

                    {!filteredClases.length && (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                          {loadingClases
                            ? "Buscando..."
                            : claseSearch.trim()
                            ? "No hay clases"
                            : "Escribí para buscar clases"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RUBRO */}
            <div>
              <label className="block mb-2 text-sm font-medium">
                {Number(selectedClase?.id_clase) === 9999
                  ? "Elegir rubro para OTROS N.C.P.:"
                  : "Rubro:"}
              </label>

              <div className="max-h-72 overflow-y-auto border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-zinc-800 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2">ID</th>
                      <th className="px-4 py-2">Nombre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Number(selectedClase?.id_clase) === 9999 ? (
                      rubros.map((rubro) => (
                        <tr
                          key={rubro.id_rubro}
                          onClick={() => setSelectedRubro(rubro)}
                          aria-selected={selectedRubro?.id_rubro === rubro.id_rubro}
                          className={`cursor-pointer ${
                            selectedRubro?.id_rubro === rubro.id_rubro
                              ? "bg-cyan-100 dark:bg-cyan-900"
                              : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <td className="px-4 py-2 font-semibold">{rubro.id_rubro}</td>
                          <td className="px-4 py-2">{rubro.nombre}</td>
                        </tr>
                      ))
                    ) : selectedRubro ? (
                      <tr className="bg-cyan-100 dark:bg-cyan-900">
                        <td className="px-4 py-2">{selectedRubro.id_rubro}</td>
                        <td className="px-4 py-2">{selectedRubro.nombre}</td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                          Seleccioná una clase para ver su rubro
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-zinc-900 p-4 border-t flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>

          <button
            className="px-4 py-2 bg-cyan-700 text-white rounded hover:bg-cyan-800 disabled:opacity-50"
            onClick={() =>
              selectedRubro &&
              selectedClase &&
              onSave({
                rubro: selectedRubro,
                clase: selectedClase
              })
            }
            disabled={!selectedRubro || !selectedClase}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
