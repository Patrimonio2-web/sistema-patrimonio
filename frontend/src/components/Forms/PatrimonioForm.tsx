"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FiCalendar } from "react-icons/fi";
import {
  FaCheckCircle,
  FaCamera,
  FaCar,
  FaDollarSign,
  FaIdBadge,
  FaImage,
  FaMapMarkerAlt,
  FaRegCommentDots,
  FaSave,
  FaSearch,
  FaTimesCircle,
  FaWrench,
} from "react-icons/fa";
import { toast } from "react-hot-toast";
import ConfirmModal from "@/components/Modal/ConfirmModal";
import { obtenerAnexos, obtenerSubdependencias } from "@/services/anexosService";
import { FormularioPatrimonio, Anexo, Subdependencia } from "@/types/types";
import { Nomenclador } from "@/components";
import { uploadMobiliarioImage } from "@/lib/imageUpload";
import {
  isFireExtinguisherAsset,
  isTransportAsset,
} from "@/lib/mobiliarioVehicle";

interface Props {
  modo: "crear" | "editar";
  initialData?: FormularioPatrimonio;
  onSubmit: (data: FormularioPatrimonio) => Promise<boolean>;
  onCancel?: () => void;
  loading?: boolean;
  resetOnSuccess?: boolean;
}

type PhotoSlot = 1 | 2;

export default function PatrimonioForm({
  modo,
  initialData,
  onSubmit,
  onCancel,
  loading,
  resetOnSuccess,
}: Props) {
  const router = useRouter();
  const normalizeDescripcion = (value?: string) =>
    (value ?? "").toLocaleUpperCase("es-AR");

  const [form, setForm] = useState<FormularioPatrimonio>({
    id: "",
    anexo: "",
    subdependencia: "",
    rubro: "",
    clase: "",
    id_rubro: undefined,
    id_clase: undefined,
    descripcion: "",
    resolucionNumero: "",
    resolucionTipo: "",
    fechaResolucion: "",
    estado: "",
    comentarios: "",
    vehiculo: "",
    foto_url: "",
    foto_url_2: "",
    valor: "",
    opciones: {
      noDado: false,
      reparacion: false,
      paraBaja: false,
      faltante: false,
      sobrante: false,
      etiqueta: false,
      privado: false,
    },
  });

  const [uploadingImageSlot, setUploadingImageSlot] = useState<PhotoSlot | null>(null);
  const [activePhotoSlot, setActivePhotoSlot] = useState<PhotoSlot>(1);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [subdependencias, setSubdependencias] = useState<Subdependencia[]>([]);
  const [nomencladorOpen, setNomencladorOpen] = useState(false);
  const [matafuegoVehiculoOpen, setMatafuegoVehiculoOpen] = useState(false);
  const [clearStateOpen, setClearStateOpen] = useState(false);

  const transporteSeleccionado = isTransportAsset(form);
  const matafuegoSeleccionado = isFireExtinguisherAsset(form);
  const mostrarVehiculo =
    transporteSeleccionado ||
    (matafuegoSeleccionado && matafuegoVehiculoOpen);

  useEffect(() => {
    obtenerAnexos().then(setAnexos);
  }, []);

  useEffect(() => {
    if (form.anexo) {
      obtenerSubdependencias(Number(form.anexo)).then(setSubdependencias);
    } else {
      setSubdependencias([]);
    }
  }, [form.anexo]);

  useEffect(() => {
    if (!initialData) return;
    setForm({
      id: initialData.id ?? "",
      anexo: initialData.anexo ?? "",
      subdependencia: initialData.subdependencia ?? "",
      rubro: initialData.rubro ?? "",
      clase: initialData.clase ?? "",
      id_rubro: initialData.id_rubro,
      id_clase: initialData.id_clase,
      descripcion: normalizeDescripcion(initialData.descripcion ?? ""),
      resolucionNumero: initialData.resolucionNumero ?? "",
      resolucionTipo: initialData.resolucionTipo ?? "",
      fechaResolucion: initialData.fechaResolucion ?? "",
      estado: initialData.estado ?? "",
      comentarios: normalizeDescripcion(initialData.comentarios ?? ""),
      vehiculo: normalizeDescripcion(initialData.vehiculo ?? ""),
      foto_url: initialData.foto_url ?? "",
      foto_url_2: initialData.foto_url_2 ?? "",
      valor: initialData.valor ?? "",
      opciones: {
        noDado: initialData.opciones?.noDado ?? false,
        reparacion: initialData.opciones?.reparacion ?? false,
        paraBaja: initialData.opciones?.paraBaja ?? false,
        faltante: initialData.opciones?.faltante ?? false,
        sobrante: initialData.opciones?.sobrante ?? false,
        etiqueta: initialData.opciones?.etiqueta ?? false,
        privado: initialData.opciones?.privado ?? false,
      },
    });
    setActivePhotoSlot(
      initialData.foto_url || !initialData.foto_url_2 ? 1 : 2
    );
    setMatafuegoVehiculoOpen(
      isFireExtinguisherAsset(initialData) &&
        Boolean(initialData.vehiculo?.trim())
    );
  }, [initialData]);

  const handleInput = <K extends keyof FormularioPatrimonio>(
    key: K,
    value: FormularioPatrimonio[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCheckbox = (key: keyof FormularioPatrimonio["opciones"]) => {
    setForm((prev) => ({
      ...prev,
      opciones: { ...prev.opciones, [key]: !prev.opciones[key] },
    }));
  };

  const setPhotoField = (slot: PhotoSlot, value: string) => {
    const field = slot === 1 ? "foto_url" : "foto_url_2";
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleConservationState = (value: string) => {
    if (form.estado === value) {
      setClearStateOpen(true);
      return;
    }
    handleInput("estado", value);
  };

  const handleImageChange = async (
    slot: PhotoSlot,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImageSlot(slot);
      const imageUrl = await uploadMobiliarioImage(file);
      setPhotoField(slot, imageUrl);
      if (slot === 1) setActivePhotoSlot(2);
      toast.success(slot === 1 ? "Foto principal subida" : "Segunda foto subida");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingImageSlot(null);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (slot: PhotoSlot) => {
    setPhotoField(slot, "");
    setActivePhotoSlot(slot === 2 ? 1 : form.foto_url_2 ? 2 : 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uploadingImage = uploadingImageSlot !== null;
    if (uploadingImage) {
      toast.error("Espera a que termine de subir la imagen antes de guardar.");
      return;
    }

    if (!form.anexo || !form.subdependencia) {
      toast.error("Anexo y Subdependencia son obligatorios.");
      return;
    }

    if (!form.id_rubro || !form.id_clase) {
      toast.error("Selecciona Rubro y Clase desde el Nomenclador.");
      return;
    }

    const descripcion = normalizeDescripcion(form.descripcion).trim();
    if (!descripcion) {
      toast.error("La descripción es obligatoria.");
      return;
    }

    const vehiculoPermitido =
      transporteSeleccionado ||
      (matafuegoSeleccionado && matafuegoVehiculoOpen);
    const dataToSubmit = {
      ...form,
      descripcion,
      comentarios: normalizeDescripcion(form.comentarios),
      vehiculo: vehiculoPermitido
        ? normalizeDescripcion(form.vehiculo).trim()
        : "",
    };
    const ok = await onSubmit(dataToSubmit);
    if (ok && resetOnSuccess) {
      setForm({
        id: "",
        anexo: "",
        subdependencia: "",
        rubro: "",
        clase: "",
        id_rubro: undefined,
        id_clase: undefined,
        descripcion: "",
        resolucionNumero: "",
        resolucionTipo: "",
        fechaResolucion: "",
        estado: "",
        comentarios: "",
        vehiculo: "",
        foto_url: "",
        foto_url_2: "",
        valor: "",
        opciones: {
          noDado: false,
          reparacion: false,
          paraBaja: false,
          faltante: false,
          sobrante: false,
          etiqueta: false,
          privado: false,
        },
      });
      setActivePhotoSlot(1);
      setMatafuegoVehiculoOpen(false);
    }
  };

  const fieldClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-950 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-400 dark:focus:border-cyan-300 dark:focus:ring-cyan-300/25";
  const fieldWithIconClass = `${fieldClass} pl-10`;
  const labelClass =
    "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200";
  const sectionClass =
    "rounded-lg border border-slate-300 bg-white/95 p-4 shadow-sm shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900/90";
  const sectionTitleClass =
    "mb-4 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white";
  const uploadingImage = uploadingImageSlot !== null;

  const renderPhotoManager = () => {
    const photoUrl = activePhotoSlot === 1 ? form.foto_url : form.foto_url_2;
    const isUploading = uploadingImageSlot === activePhotoSlot;
    const canUseSecondPhoto = Boolean(form.foto_url || form.foto_url_2);
    const activeTitle = activePhotoSlot === 1 ? "Foto principal" : "Foto adicional";

    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
        <div className="mb-3 flex flex-col gap-3">
          <div>
            <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-100">
              {activeTitle}
            </p>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              La segunda foto queda disponible despues de cargar la primera.
            </p>
          </div>
          {canUseSecondPhoto && (
            <button
              type="button"
              onClick={() => setActivePhotoSlot(activePhotoSlot === 1 ? 2 : 1)}
              className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded-lg border border-cyan-200 bg-white px-3 text-xs font-black text-cyan-800 shadow-sm transition hover:border-cyan-400 hover:bg-cyan-50 dark:border-cyan-500/40 dark:bg-slate-900 dark:text-cyan-100 dark:hover:bg-cyan-500/10"
            >
              {activePhotoSlot === 1
                ? form.foto_url_2
                  ? "Ver segunda foto"
                  : "Agregar segunda foto"
                : "Ver foto principal"}
            </button>
          )}
        </div>

        <div className="flex min-h-[13rem] w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-950/60">
          {photoUrl ? (
            <div className="relative h-48 w-full overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <Image
                src={photoUrl}
                alt={`${activeTitle} del mobiliario`}
                fill
                unoptimized
                className="object-cover"
              />
              {!isUploading && (
                <button
                  type="button"
                  onClick={() => handleRemoveImage(activePhotoSlot)}
                  className="absolute right-2 top-2 rounded-md border border-rose-200 bg-white/95 px-2 py-1 text-[11px] font-bold text-rose-700 shadow-sm transition hover:bg-rose-50 dark:border-rose-500/40 dark:bg-slate-900/95 dark:text-rose-200 dark:hover:bg-rose-500/10"
                >
                  Quitar
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-slate-700 dark:text-slate-200">
              <FaImage className="mx-auto h-9 w-9 text-cyan-600 dark:text-cyan-300" />
              <p className="text-sm font-semibold">
                {isUploading
                  ? "Optimizando y subiendo..."
                  : activePhotoSlot === 1
                    ? "Sin foto principal"
                    : "Segunda foto opcional"}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className={`inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-bold text-cyan-800 transition focus-within:ring-2 focus-within:ring-cyan-400 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-100 ${
            uploadingImage
              ? "cursor-wait opacity-60"
              : "cursor-pointer hover:border-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-500/20"
          }`}>
            <FaCamera />
            {isUploading ? "Subiendo..." : "Tomar foto"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => handleImageChange(activePhotoSlot, event)}
              disabled={uploadingImage}
              className="sr-only"
            />
          </label>

          <label className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition focus-within:ring-2 focus-within:ring-cyan-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${
            uploadingImage
              ? "cursor-wait opacity-60"
              : "cursor-pointer hover:border-cyan-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}>
            <FaImage />
            {isUploading ? "Subiendo..." : "Seleccionar"}
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleImageChange(activePhotoSlot, event)}
              disabled={uploadingImage}
              className="sr-only"
            />
          </label>
        </div>
      </div>
    );
  };

  const dispositionOptions = ["PSA", "Decreto", "SL", "PSL"];
  const conservationOptions = [
    {
      value: "Nuevo",
      active:
        "border-sky-400 bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-400/30",
    },
    {
      value: "Bueno",
      active:
        "border-emerald-400 bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/30",
    },
    {
      value: "Regular",
      active:
        "border-amber-400 bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/30",
    },
    {
      value: "Inútil",
      active:
        "border-rose-400 bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-400/30",
    },
  ];

  const optionLabels: Record<keyof FormularioPatrimonio["opciones"], string> = {
    noDado: "Numero Dado",
    reparacion: "Reparación",
    paraBaja: "P/ Baja",
    faltante: "Faltante",
    sobrante: "Sobrante",
    etiqueta: "Problema Etiqueta",
    privado: "Privado",
  };

  const optionKeys = [
    "noDado",
    "reparacion",
    "paraBaja",
    "faltante",
    "sobrante",
    "etiqueta",
  ] as const;

  return (
    <>
      <ConfirmModal
        isOpen={clearStateOpen}
        title="Dejar el bien sin estado"
        message={`Vas a quitar el estado "${form.estado}". El bien quedará sin estado de conservación informado.`}
        confirmText="Sí, quitar estado"
        cancelText="Conservar estado"
        onConfirm={() => {
          handleInput("estado", "");
          setClearStateOpen(false);
        }}
        onCancel={() => setClearStateOpen(false)}
      />
      <form className="mx-auto max-w-6xl space-y-5" onSubmit={handleSubmit}>
      <div className="rounded-lg border border-slate-200 bg-white/90 p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950/80 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center rounded-md bg-cyan-50 px-2 py-1 text-xs font-bold uppercase tracking-wide text-cyan-700 ring-1 ring-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-200 dark:ring-cyan-400/30">
              {modo === "editar" ? "Editar registro" : "Nuevo registro"}
            </span>
            <h2 className="mt-2 text-xl font-extrabold text-slate-950 dark:text-white">
              Datos del patrimonio
            </h2>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <FaCheckCircle className="text-cyan-600 dark:text-cyan-300" />
            <span>{form.id ? `ID ${form.id}` : "Sin ID asignado"}</span>
          </div>
        </div>
      </div>

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>
          <FaMapMarkerAlt className="text-cyan-600 dark:text-cyan-300" />
          Identificación y ubicación
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>ID</label>
            <div className="relative">
              <FaIdBadge className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={form.id}
                disabled={modo === "editar"}
                onChange={(e) => handleInput("id", e.target.value)}
                placeholder="ID"
                className={fieldWithIconClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Anexo</label>
            <select
              value={form.anexo}
              onChange={(e) => handleInput("anexo", e.target.value)}
              className={fieldClass}
            >
              <option value="">Seleccionar Anexo</option>
              {anexos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} - {a.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Subdependencia</label>
            <select
              value={form.subdependencia}
              onChange={(e) => handleInput("subdependencia", e.target.value)}
              className={fieldClass}
            >
              <option value="">Seleccionar Subdependencia</option>
              {subdependencias.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} - {s.nombre}
                </option>
              ))}
            </select>
          </div>

        </div>
      </section>

      <section className={sectionClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className={sectionTitleClass}>
              <FaSearch className="text-cyan-600 dark:text-cyan-300" />
              Nomenclador
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/80">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  Rubro
                </p>
                <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                  {form.rubro || "No seleccionado"}
                </p>
                {form.id_rubro && (
                  <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ID: {form.id_rubro}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/80">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  Clase
                </p>
                <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                  {form.clase || "No seleccionada"}
                </p>
                {form.id_clase && (
                  <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ID: {form.id_clase}
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setNomencladorOpen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:w-auto dark:bg-cyan-600 dark:hover:bg-cyan-700"
          >
            <FaSearch />
            Nomenclador
          </button>
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>
          <FaIdBadge className="text-cyan-600 dark:text-cyan-300" />
          Descripción y resolución
        </h3>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Descripción</label>
            <input
              type="text"
              value={form.descripcion}
              onChange={(e) => handleInput("descripcion", e.target.value)}
              placeholder="Descripción"
              className={`${fieldClass} uppercase`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <label className={labelClass}>Nro. resolución</label>
              <input
                type="number"
                value={form.resolucionNumero}
                onChange={(e) => handleInput("resolucionNumero", e.target.value)}
                placeholder="Nro. resolución"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Tipo de disposición</label>
              <div className="grid grid-cols-2 gap-2">
                {dispositionOptions.map((item) => (
                  <label
                    key={item}
                    className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      form.resolucionTipo === item
                        ? "border-cyan-400 bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-200 dark:ring-cyan-400/30"
                        : "border-slate-300 bg-white text-slate-800 hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="resolucionTipo"
                      value={item}
                      checked={form.resolucionTipo === item}
                      onChange={() => handleInput("resolucionTipo", item)}
                      className="sr-only"
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Fecha resolución</label>
              <div className="relative">
                <FiCalendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={form.fechaResolucion}
                  onChange={(e) => handleInput("fechaResolucion", e.target.value)}
                  className={fieldWithIconClass}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {matafuegoSeleccionado && !transporteSeleccionado && (
              <div className="lg:col-span-2">
                <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800 transition hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100">
                  <span className="flex items-center gap-2">
                    <FaCar className="text-cyan-700 dark:text-cyan-300" />
                    Asignado a vehículo
                  </span>
                  <input
                    type="checkbox"
                    checked={matafuegoVehiculoOpen}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setMatafuegoVehiculoOpen(checked);
                      if (!checked) handleInput("vehiculo", "");
                    }}
                    className="h-4 w-4 accent-cyan-700"
                  />
                </label>
              </div>
            )}

            {mostrarVehiculo && (
              <div className="lg:col-span-2">
                <label className={labelClass}>Vehículo (opcional)</label>
                <div className="relative">
                  <FaCar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.vehiculo ?? ""}
                    onChange={(e) => handleInput("vehiculo", e.target.value)}
                    placeholder="Ej. Combi 2 o Toyota Hilux"
                    className={`${fieldWithIconClass} uppercase`}
                  />
                </div>
              </div>
            )}

            <div className={!mostrarVehiculo && !matafuegoSeleccionado ? "lg:col-start-3" : ""}>
              <label className={labelClass}>Valor</label>
              <div className="relative">
                <FaDollarSign className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  value={form.valor ?? ""}
                  onChange={(e) => handleInput("valor", e.target.value)}
                  placeholder="Valor ($)"
                  className={fieldWithIconClass}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>
          <FaWrench className="text-cyan-600 dark:text-cyan-300" />
          Estado y opciones
        </h3>

        <div className="space-y-5">
          <div>
            <label className={labelClass}>Estado de conservación</label>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {conservationOptions.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => handleConservationState(item.value)}
                  aria-pressed={form.estado === item.value}
                  aria-label={form.estado === item.value ? `Quitar estado ${item.value}` : `Seleccionar estado ${item.value}`}
                  title={form.estado === item.value ? "Quitar estado" : `Seleccionar ${item.value}`}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition ${
                    form.estado === item.value
                      ? `${item.active} ring-1`
                      : "border-slate-300 bg-white text-slate-800 hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  }`}
                >
                  {item.value}
                  {form.estado === item.value && <FaTimesCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
              ))}
            </div>
            {!form.estado && (
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Sin estado de conservación seleccionado.
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Marcar opciones</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {optionKeys.map((key) => (
                <label
                  key={key}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    form.opciones[key]
                      ? "border-violet-300 bg-violet-50 text-violet-800 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-400/30"
                      : "border-slate-300 bg-white text-slate-800 hover:border-violet-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  }`}
                >
                  <span>{optionLabels[key]}</span>
                  <input
                    type="checkbox"
                    checked={form.opciones[key]}
                    onChange={() => handleCheckbox(key)}
                    className="h-4 w-4 rounded border-slate-300 accent-violet-600"
                  />
                </label>
              ))}

              <label
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  form.opciones.privado
                    ? "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800 ring-1 ring-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-200 dark:ring-fuchsia-400/30"
                    : "border-slate-300 bg-white text-slate-800 hover:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                }`}
              >
                <span>{optionLabels.privado} (interno)</span>
                <input
                  type="checkbox"
                  checked={!!form.opciones.privado}
                  onChange={() => handleCheckbox("privado")}
                  className="h-4 w-4 rounded border-slate-300 accent-fuchsia-600"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>
          <FaRegCommentDots className="text-cyan-600 dark:text-cyan-300" />
          Comentarios e imagen
        </h3>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_22rem]">
          <div>
            <label className={labelClass}>Comentarios</label>
            <textarea
              rows={7}
              value={form.comentarios}
              onChange={(e) => handleInput("comentarios", e.target.value)}
              placeholder="Comentarios"
              className={`${fieldClass} min-h-[12rem] resize-y uppercase`}
            />
          </div>

          <div>
            <label className={labelClass}>Imagenes</label>
            {renderPhotoManager()}
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 z-20 -mx-2 border-t border-slate-200 bg-white/95 px-2 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:static sm:mx-0 sm:rounded-lg sm:border sm:px-4 sm:shadow-sm">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onCancel ?? (() => router.push("/listados"))}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FaTimesCircle />
            Cancelar
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:bg-cyan-600 dark:hover:bg-cyan-700"
          >
            <FaSave />
            {loading
              ? "Guardando..."
              : modo === "editar"
                ? "Guardar cambios"
                : "Crear registro"}
          </button>
        </div>
      </div>

      {nomencladorOpen && (
        <Nomenclador
          onSave={(sel) => {
            const mismaClase = form.id_clase === sel.clase.id_clase;
            const siguienteEsMatafuego = isFireExtinguisherAsset({
              id_rubro: sel.rubro.id_rubro,
              rubro: sel.rubro.nombre,
              clase: sel.clase.descripcion,
            });
            const siguienteEsTransporte = isTransportAsset({
              id_rubro: sel.rubro.id_rubro,
              rubro: sel.rubro.nombre,
            });
            setForm((prev) => ({
              ...prev,
              rubro: sel.rubro.nombre,
              clase: sel.clase.descripcion,
              descripcion:
                modo === "crear"
                  ? normalizeDescripcion(sel.clase.descripcion)
                  : prev.descripcion,
              id_rubro: sel.rubro.id_rubro,
              id_clase: sel.clase.id_clase,
              vehiculo:
                mismaClase && (siguienteEsTransporte || siguienteEsMatafuego)
                  ? prev.vehiculo
                  : "",
            }));
            setMatafuegoVehiculoOpen(
              siguienteEsMatafuego && mismaClase && Boolean(form.vehiculo?.trim())
            );
            setNomencladorOpen(false);
          }}
          onClose={() => setNomencladorOpen(false)}
        />
      )}
      </form>
    </>
  );
}
