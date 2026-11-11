
// src/app/GestionAnexos/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  obtenerAnexos,
  agregarAnexo,
  obtenerSubdependencias,
  agregarSubdependencia,
  eliminarAnexo,
  eliminarSubdependencia,
  editarAnexo,
  editarSubdependencia,
} from "@/services/anexosService";
import { toast, Toaster } from "react-hot-toast";
import {
  FaArrowLeft,
  FaBuilding,
  FaCheckCircle,
  FaEdit,
  FaExclamationTriangle,
  FaHome,
  FaLayerGroup,
  FaListUl,
  FaMapMarkerAlt,
  FaPlus,
  FaSave,
  FaSearch,
  FaTimes,
  FaTrash,
} from "react-icons/fa";
import { DeleteModal } from "@/components";
import { isViewer } from "@/services/authRole";

interface Anexo { id: number; nombre: string; direccion: string; }
interface Subdependencia { id: number; nombre: string; id_anexo?: number; }

export default function GestionAnexos() {
  const router = useRouter();
  const viewer = isViewer();

  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [subdependencias, setSubdependencias] = useState<Subdependencia[]>([]);
  const [anexoSeleccionado, setAnexoSeleccionado] = useState("");

  // crear
  const [idAnexo, setIdAnexo] = useState("");
  const [nombreAnexo, setNombreAnexo] = useState("");
  const [direccionAnexo, setDireccionAnexo] = useState("");
  const [idSub, setIdSub] = useState("");
  const [nombreSub, setNombreSub] = useState("");

  // editar anexo seleccionado
  const anexoSelObj = useMemo(
    () => anexos.find(a => String(a.id) === String(anexoSeleccionado)) || null,
    [anexos, anexoSeleccionado]
  );
  const [editNombreAnexo, setEditNombreAnexo] = useState("");
  const [editDireccionAnexo, setEditDireccionAnexo] = useState("");

  // editar subdependencias (inline por id)
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [editSubNombre, setEditSubNombre] = useState("");
  const [editSubAnexo, setEditSubAnexo] = useState<string>("");

  // loaders / modal
  const [loadingAnexos, setLoadingAnexos] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [onConfirmDelete, setOnConfirmDelete] = useState<() => void>(() => () => {});
  const [modalMessage, setModalMessage] = useState("");

  useEffect(() => { cargarAnexos(); }, []);

  const cargarAnexos = async () => {
    try {
      const data = await obtenerAnexos();
      setAnexos(data.sort((a: Anexo, b: Anexo) => a.id - b.id));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al cargar anexos");
    } finally {
      setLoadingAnexos(false);
    }
  };

  useEffect(() => {
    if (anexoSeleccionado) {
      setLoadingSubs(true);
      obtenerSubdependencias(parseInt(anexoSeleccionado))
        .then((subs) => setSubdependencias(subs.sort((a: Subdependencia, b: Subdependencia) => a.id - b.id)))
        .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Error al cargar subdependencias"))
        .finally(() => setLoadingSubs(false));
    } else {
      setSubdependencias([]);
    }
  }, [anexoSeleccionado]);

  // cuando cambia el anexo seleccionado, precarga los inputs de edición
  useEffect(() => {
    if (anexoSelObj) {
      setEditNombreAnexo(anexoSelObj.nombre || "");
      setEditDireccionAnexo(anexoSelObj.direccion || "");
    } else {
      setEditNombreAnexo("");
      setEditDireccionAnexo("");
    }
  }, [anexoSelObj]);

  // crear anexo
  const handleGuardarAnexo = async () => {
    if (viewer) return toast.error("No autorizado: solo lectura.");
    try {
      await agregarAnexo({ id: parseInt(idAnexo), nombre: nombreAnexo, direccion: direccionAnexo });
      toast.success("Anexo guardado correctamente");
      setIdAnexo(""); setNombreAnexo(""); setDireccionAnexo("");
      cargarAnexos();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar anexo");
    }
  };

  // editar anexo
  const handleEditarAnexo = async () => {
    if (viewer) return toast.error("No autorizado: solo lectura.");
    if (!anexoSelObj) return;
    try {
      await editarAnexo(anexoSelObj.id, {
        nombre: editNombreAnexo,
        direccion: editDireccionAnexo,
      });
      toast.success("Anexo actualizado");
      await cargarAnexos();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al actualizar anexo");
    }
  };

  // eliminar anexo
  const confirmarEliminarAnexo = (id: number) => {
    if (viewer) return toast.error("No autorizado: solo lectura.");
    setOnConfirmDelete(() => async () => {
      try {
        await eliminarAnexo(id);
        toast.success("Anexo eliminado");
        await cargarAnexos();
        if (parseInt(anexoSeleccionado) === id) {
          setAnexoSeleccionado("");
          setSubdependencias([]);
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Error al eliminar anexo");
      }
    });
    setModalMessage("¿Estás seguro que deseas eliminar este anexo?");
    setModalOpen(true);
  };

  // crear subdependencia
  const handleGuardarSubdependencia = async () => {
    if (viewer) return toast.error("No autorizado: solo lectura.");
    if (!anexoSeleccionado) return toast.error("Seleccioná un anexo primero");
    try {
      await agregarSubdependencia({
        id: parseInt(idSub),
        id_anexo: parseInt(anexoSeleccionado),
        nombre: nombreSub,
      });
      toast.success("Subdependencia guardada");
      setIdSub(""); setNombreSub("");
      const actualizadas = await obtenerSubdependencias(parseInt(anexoSeleccionado));
      setSubdependencias(actualizadas.sort((a: Subdependencia, b: Subdependencia) => a.id - b.id));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar subdependencia");
    }
  };

  // eliminar subdependencia
  const confirmarEliminarSubdependencia = (id: number) => {
    if (viewer) return toast.error("No autorizado: solo lectura.");
    setOnConfirmDelete(() => async () => {
      try {
        await eliminarSubdependencia(id);
        toast.success("Subdependencia eliminada");
        const actualizadas = await obtenerSubdependencias(parseInt(anexoSeleccionado));
        setSubdependencias(actualizadas.sort((a: Subdependencia, b: Subdependencia) => a.id - b.id));
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Error al eliminar subdependencia");
      }
    });
    setModalMessage("¿Eliminar esta subdependencia?");
    setModalOpen(true);
  };

  // pasar subdependencia a modo edición
  const startEditSub = (sub: Subdependencia) => {
    setEditingSubId(sub.id);
    setEditSubNombre(sub.nombre || "");
    setEditSubAnexo(anexoSeleccionado || "");
  };

  // cancelar edición sub
  const cancelEditSub = () => {
    setEditingSubId(null);
    setEditSubNombre("");
    setEditSubAnexo("");
  };

  // guardar edición sub
  const saveEditSub = async () => {
    if (viewer) return toast.error("No autorizado: solo lectura.");
    if (!editingSubId) return;
    try {
      await editarSubdependencia(editingSubId, {
        nombre: editSubNombre,
        id_anexo: editSubAnexo ? parseInt(editSubAnexo) : undefined,
      });
      toast.success("Subdependencia actualizada");

      // recarga lista del anexo actualmente visible
      const actual = await obtenerSubdependencias(parseInt(anexoSeleccionado));
      setSubdependencias(actual.sort((a: Subdependencia, b: Subdependencia) => a.id - b.id));

      // si cambió de anexo, podrías optar por refrescar anexos/global
      if (editSubAnexo && editSubAnexo !== anexoSeleccionado) {
        await cargarAnexos();
      }

      cancelEditSub();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al actualizar subdependencia");
    }
  };

  const selectedAnexoLabel = anexoSelObj
    ? `${anexoSelObj.id} - ${anexoSelObj.nombre}`
    : "Sin anexo seleccionado";
  const readonlyBadge = viewer ? "Solo lectura" : "Administración activa";
  const readonlyBadgeClass = viewer
    ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200"
    : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-200";
  const cardClass =
    "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80";
  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300";
  const inputClass =
    "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-75 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950 dark:disabled:bg-slate-900/50";
  const selectClass =
    "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-75 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-cyan-400 dark:focus:ring-cyan-950 dark:disabled:bg-slate-900/50";
  const primaryButtonClass =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-white disabled:shadow-none dark:disabled:bg-slate-700";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-[#07111f] dark:text-white">
      <Toaster position="top-right" />
      <DeleteModal
        isOpen={modalOpen}
        onCancel={() => setModalOpen(false)}
        onConfirm={() => {
          onConfirmDelete();
          setModalOpen(false);
        }}
        message={modalMessage}
      />

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <button
            onClick={() => router.push("/Anexos")}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300"
          >
            <FaArrowLeft className="h-3.5 w-3.5" />
            Regresar
          </button>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => router.push("/Home")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300"
            >
              <FaHome className="h-3.5 w-3.5" />
              Inicio
            </button>
            <button
              type="button"
              onClick={() => router.push("/listados")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-3 text-sm font-bold text-white transition hover:bg-cyan-800 hover:shadow-sm dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            >
              <FaListUl className="h-3.5 w-3.5" />
              Listados
            </button>
            <span className={`inline-flex h-10 items-center justify-center gap-2 rounded-full border px-3 text-xs font-bold ${readonlyBadgeClass}`}>
              {viewer ? <FaExclamationTriangle /> : <FaCheckCircle />}
              {readonlyBadge}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">
                Sistema de patrimonio
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
                Gestión de anexos
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Administra anexos y subdependencias desde un solo lugar. Seleccioná un anexo para editarlo y trabajar con sus sectores.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[520px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Anexos</p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{anexos.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Subdependencias visibles</p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{subdependencias.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Anexo activo</p>
                <p className="mt-1 truncate text-sm font-bold text-slate-950 dark:text-white">
                  {selectedAnexoLabel}
                </p>
              </div>
            </div>
          </div>

          {viewer && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100">
              Modo <strong>solo lectura</strong>: no podés agregar, editar ni eliminar.
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className={cardClass}>
            <div className="mb-5 flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
                <FaBuilding />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">Agregar anexo</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Crea una nueva ubicación principal.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>ID</label>
                <input
                  type="text"
                  placeholder="Ej. 1000"
                  value={idAnexo}
                  onChange={(e) => setIdAnexo(e.target.value)}
                  disabled={viewer}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Nombre</label>
                <input
                  type="text"
                  placeholder="Nombre del anexo"
                  value={nombreAnexo}
                  onChange={(e) => setNombreAnexo(e.target.value)}
                  disabled={viewer}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Dirección</label>
                <input
                  type="text"
                  placeholder="Dirección"
                  value={direccionAnexo}
                  onChange={(e) => setDireccionAnexo(e.target.value)}
                  disabled={viewer}
                  className={inputClass}
                />
              </div>
              <button
                className={`${primaryButtonClass} w-full ${viewer ? "" : "bg-cyan-700 hover:bg-cyan-800 focus:ring-cyan-100 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400 dark:focus:ring-cyan-950"}`}
                onClick={handleGuardarAnexo}
                disabled={viewer}
              >
                <FaPlus />
                Guardar anexo
              </button>
            </div>
          </div>

          <div className={cardClass}>
            <div className="mb-5 flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                <FaSearch />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">Seleccionar y editar</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Elegí un anexo para editar sus datos.
                </p>
              </div>
            </div>

            {loadingAnexos ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Cargando anexos...
              </div>
            ) : (
              <div>
                <label className={labelClass}>Anexo</label>
                <select
                  className={selectClass}
                  value={anexoSeleccionado}
                  onChange={(e) => setAnexoSeleccionado(e.target.value)}
                >
                  <option value="">Seleccione un anexo</option>
                  {anexos.map((anexo) => (
                    <option key={anexo.id} value={anexo.id}>
                      {anexo.id} - {anexo.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {anexoSelObj ? (
              <div className="mt-5 space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800">
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={editNombreAnexo}
                    onChange={(e) => setEditNombreAnexo(e.target.value)}
                    disabled={viewer}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Dirección</label>
                  <input
                    type="text"
                    placeholder="Dirección"
                    value={editDireccionAnexo}
                    onChange={(e) => setEditDireccionAnexo(e.target.value)}
                    disabled={viewer}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    onClick={handleEditarAnexo}
                    disabled={viewer}
                    className={`${primaryButtonClass} ${viewer ? "" : "bg-amber-600 hover:bg-amber-700 focus:ring-amber-100 dark:focus:ring-amber-950"}`}
                  >
                    <FaSave />
                    Guardar cambios
                  </button>
                  <button
                    onClick={() => confirmarEliminarAnexo(anexoSelObj.id)}
                    disabled={viewer}
                    className={`${primaryButtonClass} ${viewer ? "" : "bg-red-600 hover:bg-red-700 focus:ring-red-100 dark:focus:ring-red-950"}`}
                  >
                    <FaTrash />
                    Eliminar anexo
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No hay anexo seleccionado para editar.
              </div>
            )}
          </div>

          <div className={cardClass}>
            <div className="mb-5 flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <FaLayerGroup />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">Agregar subdependencia</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Se guarda dentro del anexo activo.
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Destino</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-950 dark:text-white">
                {selectedAnexoLabel}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>ID</label>
                <input
                  type="text"
                  placeholder="Ej. 10"
                  value={idSub}
                  onChange={(e) => setIdSub(e.target.value)}
                  disabled={viewer || !anexoSeleccionado}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Nombre</label>
                <input
                  type="text"
                  placeholder="Nombre de la subdependencia"
                  value={nombreSub}
                  onChange={(e) => setNombreSub(e.target.value)}
                  disabled={viewer || !anexoSeleccionado}
                  className={inputClass}
                />
              </div>
              <button
                className={`${primaryButtonClass} w-full ${viewer || !anexoSeleccionado ? "" : "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-100 dark:focus:ring-emerald-950"}`}
                onClick={handleGuardarSubdependencia}
                disabled={viewer || !anexoSeleccionado}
              >
                <FaPlus />
                Guardar subdependencia
              </button>
            </div>
          </div>
        </section>

        <section className={`${cardClass} mt-6`}>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
                <FaMapMarkerAlt />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                  Subdependencias del anexo seleccionado
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {selectedAnexoLabel}
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              {subdependencias.length} registros
            </span>
          </div>

          {loadingSubs ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Cargando subdependencias...
            </div>
          ) : !anexoSeleccionado ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Elegí un anexo para ver sus subdependencias.
            </div>
          ) : subdependencias.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No hay subdependencias cargadas para este anexo.
            </div>
          ) : (
            <ul className="space-y-3">
              {subdependencias.map((sub) => {
                const isEditing = editingSubId === sub.id;
                return (
                  <li
                    key={sub.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70"
                  >
                    {!isEditing ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-950 dark:text-white">
                            {sub.nombre}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            ID: {sub.id}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (viewer) return toast.error("No autorizado: solo lectura.");
                              startEditSub(sub);
                            }}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-600 transition hover:bg-amber-50 dark:border-amber-800/60 dark:bg-slate-950 dark:text-amber-300 dark:hover:bg-amber-950/30 ${viewer ? "cursor-not-allowed opacity-50" : ""}`}
                            disabled={viewer}
                            title="Editar subdependencia"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => {
                              if (viewer) return toast.error("No autorizado: solo lectura.");
                              confirmarEliminarSubdependencia(sub.id);
                            }}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50 dark:border-red-800/60 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/30 ${viewer ? "cursor-not-allowed opacity-50" : ""}`}
                            disabled={viewer}
                            title="Eliminar subdependencia"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[120px_1fr_1fr_auto] lg:items-end">
                        <div>
                          <span className={labelClass}>ID</span>
                          <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                            {sub.id}
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>Nombre</label>
                          <input
                            type="text"
                            value={editSubNombre}
                            onChange={(e) => setEditSubNombre(e.target.value)}
                            disabled={viewer}
                            className={inputClass}
                            placeholder="Nombre"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Mover a anexo</label>
                          <select
                            value={editSubAnexo}
                            onChange={(e) => setEditSubAnexo(e.target.value)}
                            disabled={viewer}
                            className={selectClass}
                          >
                            <option value="">(Sin cambiar anexo)</option>
                            {anexos.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.id} - {a.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                          <button
                            onClick={saveEditSub}
                            disabled={viewer}
                            className={`${primaryButtonClass} ${viewer ? "" : "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-100 dark:focus:ring-emerald-950"}`}
                            title="Guardar"
                          >
                            <FaSave />
                            Guardar
                          </button>
                          <button
                            onClick={cancelEditSub}
                            className={`${primaryButtonClass} bg-slate-600 hover:bg-slate-700 focus:ring-slate-100 dark:focus:ring-slate-900`}
                            title="Cancelar"
                          >
                            <FaTimes />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {anexos.length > 0 && (
          <section className={`${cardClass} mt-6`}>
            <div className="mb-5 flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
                <FaTrash />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">Eliminar anexos</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Acceso rápido para quitar anexos existentes.
                </p>
              </div>
            </div>

            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {anexos.map((anexo) => (
                <li
                  key={anexo.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                      {anexo.nombre}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      ID: {anexo.id}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (viewer) return toast.error("No autorizado: solo lectura.");
                      confirmarEliminarAnexo(anexo.id);
                    }}
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50 dark:border-red-800/60 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/30 ${viewer ? "cursor-not-allowed opacity-50" : ""}`}
                    title="Eliminar anexo"
                    disabled={viewer}
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
