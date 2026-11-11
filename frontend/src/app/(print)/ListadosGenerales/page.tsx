// src/app/ListadosGenerales/page.tsx 
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast, Toaster } from "react-hot-toast";
import {
  obtenerAnexos,
  obtenerSubdependenciasPorAnexo,
  obtenerRubros,
  obtenerClasesPorRubro,
  type AnexoOption,
  type SubdependenciaOption,
  type RubroOption,
  type ClaseOption,
} from "@/services/listadosService";
import { Wrapper } from "@/components";
import {
  Building2,
  FolderTree,
  Filter,
  FileSpreadsheet,
  MapPin,
  Package,
  Wrench,
  FileText,
  QrCode,
} from "lucide-react";

const FLAG_OPTIONS = [
  { key: "no_dado", label: "Numero dado" },
  { key: "para_reparacion", label: "Reparación" },
  { key: "para_baja", label: "Para Baja" },
  { key: "faltante", label: "Faltante" },
  { key: "sobrante", label: "Sobrante" },
  { key: "problema_etiqueta", label: "Problema Etiqueta" },
];

export default function ListadosGeneralesPage() {
  const [anexos, setAnexos] = useState<AnexoOption[]>([]);
  const [subdependencias, setSubdependencias] = useState<SubdependenciaOption[]>([]);
  const [rubros, setRubros] = useState<RubroOption[]>([]);
  const [clases, setClases] = useState<ClaseOption[]>([]);

  const [anexo, setAnexo] = useState("todos");
  const [subdependencia, setSubdependencia] = useState("todas");
  const [rubro, setRubro] = useState("");
  const [clase, setClase] = useState("");
  const [estadoConservacion, setEstadoConservacion] = useState("");
  const [tipoListado, setTipoListado] = useState<"clasico" | "entrega">("clasico");
  const [incluirFaltantes, setIncluirFaltantes] = useState(false);
  const [filtros, setFiltros] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [anexosData, rubrosData] = await Promise.all([
          obtenerAnexos(),
          obtenerRubros(),
        ]);
        setAnexos(anexosData);
        setRubros(rubrosData);
      } catch {
        toast.error("Error al cargar datos iniciales");
      }
    };

    loadInitial();
  }, []);

  useEffect(() => {
    const loadSubs = async () => {
      try {
        if (anexo === "todos") {
          setSubdependencias([]);
          setSubdependencia("todas");
          return;
        }

        const data = await obtenerSubdependenciasPorAnexo(Number(anexo));
        setSubdependencias(data);
        setSubdependencia("todas");
      } catch {
        toast.error("Error al cargar subdependencias");
      }
    };

    loadSubs();
  }, [anexo]);

  useEffect(() => {
    const loadClases = async () => {
      try {
        if (!rubro) {
          setClases([]);
          setClase("");
          return;
        }

        const data = await obtenerClasesPorRubro(Number(rubro));
        setClases(data);
        setClase("");
      } catch {
        toast.error("Error al cargar clases");
      }
    };

    loadClases();
  }, [rubro]);

  const toggleFiltro = (key: string) => {
    setFiltros((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const handleGenerar = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const qs = new URLSearchParams();
      qs.set("anexo", anexo);
      qs.set("subdependencia", subdependencia);
      if (rubro) qs.set("rubro", rubro);
      if (clase) qs.set("clase", clase);
      if (estadoConservacion) qs.set("estado_conservacion", estadoConservacion);
      qs.set("tipo_listado", tipoListado);
      if (incluirFaltantes) qs.set("incluir_faltantes", "true");
      filtros.forEach((f) => qs.append("filtros", f));

      window.open(
        `/ListadosGenerales/preview?${qs.toString()}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch {
      toast.error("No se pudo generar el listado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrapper>
      <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-6 md:py-10 dark:bg-slate-950">
        <Toaster />

        <div className="mx-auto max-w-6xl">
          <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                  <FileSpreadsheet className="h-4 w-4" />
                  Módulo de impresión
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl dark:text-slate-100">
                  Listados Generales
                </h1>

                <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base dark:text-slate-400">
                  Generá listados de mobiliario por ubicación, rubro, clase y estado de
                  conservación, manteniendo la estructura oficial de impresión del sistema.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:min-w-[280px]">
                <Link
                  href="/ListadosGenerales/qr-subdependencia"
                  className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-bold text-white transition hover:bg-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:bg-cyan-600 dark:hover:bg-cyan-500"
                >
                  <QrCode className="h-4 w-4" />
                  {"QR p\u00fablico por subdependencia"}
                </Link>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Tipo actual
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {tipoListado === "clasico" ? "Listado clásico" : "Listado de entrega"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Filtros activos
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {filtros.length + (incluirFaltantes ? 1 : 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleGenerar} className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Ubicación
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Seleccioná el anexo y la subdependencia a incluir en el listado.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    Anexo
                  </label>
                  <select
                    value={anexo}
                    onChange={(e) => setAnexo(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-400 dark:focus:ring-teal-500/20"
                  >
                    <option value="todos">Todos los anexos</option>
                    {anexos.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <Building2 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    Subdependencia
                  </label>
                  <select
                    value={subdependencia}
                    onChange={(e) => setSubdependencia(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-400 dark:focus:ring-teal-500/20"
                  >
                    <option value="todas">Todas las subdependencias</option>
                    {subdependencias.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <FolderTree className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Categorías
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Filtrá por rubro y clase para acotar el resultado del inventario.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <Package className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    Rubro
                  </label>
                  <select
                    value={rubro}
                    onChange={(e) => setRubro(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-400 dark:focus:ring-teal-500/20"
                  >
                    <option value="">Todos los rubros</option>
                    {rubros.map((item) => (
                      <option key={item.id_rubro} value={item.id_rubro}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <FolderTree className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    Clase
                  </label>
                  <select
                    value={clase}
                    onChange={(e) => setClase(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-400 dark:focus:ring-teal-500/20"
                  >
                    <option value="">Todas las clases</option>
                    {clases.map((item) => (
                      <option key={item.id_clase} value={item.id_clase}>
                        {item.descripcion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  <Filter className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Filtros
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Marcá condiciones especiales y elegí el estado de conservación.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_0.9fr]">
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Condiciones del mobiliario
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {FLAG_OPTIONS.map((item) => {
                      const checked = filtros.includes(item.key);

                      return (
                        <label
                          key={item.key}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                            checked
                              ? "border-teal-300 bg-teal-50 shadow-sm dark:border-teal-500/40 dark:bg-teal-500/10"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-600 dark:hover:bg-slate-800/80"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFiltro(item.key)}
                            className="h-4 w-4 accent-teal-600"
                          />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {item.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <Wrench className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      Estado de conservación
                    </label>
                    <select
                      value={estadoConservacion}
                      onChange={(e) => setEstadoConservacion(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-teal-400 dark:focus:ring-teal-500/20"
                    >
                      <option value="">Todos</option>
                      <option value="Bueno">Bueno</option>
                      <option value="Regular">Regular</option>
                      <option value="Malo">Malo</option>
                      <option value="Inútil">Inútil</option>
                    </select>
                  </div>

                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                      incluirFaltantes
                        ? "border-teal-300 bg-teal-50 dark:border-teal-500/40 dark:bg-teal-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={incluirFaltantes}
                      onChange={(e) => setIncluirFaltantes(e.target.checked)}
                      className="h-4 w-4 accent-teal-600"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Incluir faltantes
                    </span>
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Tipo de listado
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Elegí el formato en el que se abrirá la vista previa imprimible.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-5 transition ${
                    tipoListado === "clasico"
                      ? "border-teal-400 bg-teal-50 shadow-sm dark:border-teal-500/50 dark:bg-teal-500/10"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="tipo_listado"
                    value="clasico"
                    checked={tipoListado === "clasico"}
                    onChange={() => setTipoListado("clasico")}
                    className="mt-1 h-4 w-4 accent-teal-600"
                  />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      Clásico
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Inventario general con detalle completo y formato tradicional.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-5 transition ${
                    tipoListado === "entrega"
                      ? "border-teal-400 bg-teal-50 shadow-sm dark:border-teal-500/50 dark:bg-teal-500/10"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="tipo_listado"
                    value="entrega"
                    checked={tipoListado === "entrega"}
                    onChange={() => setTipoListado("entrega")}
                    className="mt-1 h-4 w-4 accent-teal-600"
                  />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      Listado de entrega
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Formato resumido pensado para movimientos y entrega de bienes.
                    </p>
                  </div>
                </label>
              </div>
            </section>

            <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:p-6 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Generar vista previa del listado
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Se abrirá una nueva pestaña lista para imprimir.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`inline-flex min-w-[220px] items-center justify-center rounded-2xl px-6 py-3 text-sm font-bold tracking-wide text-white shadow-sm transition ${
                  loading
                    ? "cursor-not-allowed bg-slate-400 dark:bg-slate-700 dark:text-slate-300"
                    : "bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
                }`}
              >
                {loading ? "Generando..." : "Generar listado"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </Wrapper>
  );
}
