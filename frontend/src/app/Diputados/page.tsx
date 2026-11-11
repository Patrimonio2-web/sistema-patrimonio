"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FaClock,
  FaCog,
  FaFilter,
  FaSearch,
  FaUsers,
  FaUserTie,
} from "react-icons/fa";
import { Wrapper, DiputadoCard, diputadosData } from "@/components";
import { parseMandato } from "@/lib/mandato";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Diputado } from "@/types/diputados";
import { listarDiputados, importarDiputadosIniciales } from "@/services/diputadosService";
import { isAdmin } from "@/services/authRole";

type DiputadoEnriched = Diputado & {
  _daysLeft: number;
  _status: "ok" | "warning" | "danger" | "expired";
};

type FilterKey = "todos" | "por-vencer" | "vencidos" | "2023-2027" | "2025-2029";
type SortKey = "vencimiento" | "nombre" | "departamento" | "anexo";

function normalize(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function statusLabel(status: DiputadoEnriched["_status"], daysLeft: number) {
  if (status === "expired") return "Vencido";
  if (status === "danger") return `${daysLeft} días`;
  if (status === "warning") return `${daysLeft} días`;
  return "Vigente";
}

export default function Diputados() {
  const [busqueda, setBusqueda] = useState("");
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [sortBy, setSortBy] = useState<SortKey>("vencimiento");
  const [diputados, setDiputados] = useState<Diputado[]>(diputadosData);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const allowed = isAdmin();
    setCanManage(allowed);
    (async () => {
      try {
        let remote = await listarDiputados();
        if (remote.length === 0 && allowed) {
          remote = await importarDiputadosIniciales(diputadosData);
        }
        if (!cancelled && remote.length > 0) setDiputados(remote);
      } catch (error) {
        console.error("No se pudo sincronizar el padrón de diputados:", error);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const diputadosEnriched = useMemo<DiputadoEnriched[]>(
    () =>
      diputados.map((d: Diputado) => {
        const info = parseMandato(d.mandato);
        return { ...d, _daysLeft: info.daysLeft, _status: info.status };
      }),
    [diputados]
  );

  const stats = useMemo(() => {
    const warning = diputadosEnriched.filter((d) =>
      ["warning", "danger"].includes(d._status)
    ).length;
    const expired = diputadosEnriched.filter((d) => d._status === "expired").length;
    const active = diputadosEnriched.length - expired;
    const blocks = new Set(
      diputadosEnriched.map((d) => normalize(d.bloque || "Sin bloque"))
    ).size;

    return { warning, expired, active, blocks };
  }, [diputadosEnriched]);

  const diputadosFiltrados = useMemo(() => {
    const term = normalize(busqueda);

    const filtered = diputadosEnriched.filter((d) => {
      const searchable = normalize(
        [
          d.nombre,
          d.departamento,
          d.partido,
          d.bloque,
          d.anexo,
          d.direccion,
          d.mandato,
        ].join(" ")
      );

      const matchesSearch = !term || searchable.includes(term);
      const matchesFilter =
        filter === "todos"
          ? true
          : filter === "por-vencer"
            ? ["warning", "danger"].includes(d._status)
            : filter === "vencidos"
              ? d._status === "expired"
              : d.mandato.includes(filter);

      return matchesSearch && matchesFilter;
    });

    filtered.sort((a, b) => {
      if (sortBy === "nombre") return a.nombre.localeCompare(b.nombre, "es");
      if (sortBy === "departamento") {
        return a.departamento.localeCompare(b.departamento, "es");
      }
      if (sortBy === "anexo") {
        return (a.anexo || "").localeCompare(b.anexo || "", "es");
      }
      return a._daysLeft - b._daysLeft;
    });

    return filtered;
  }, [busqueda, diputadosEnriched, filter, sortBy]);

  const filterOptions: Array<{ key: FilterKey; label: string }> = [
    { key: "todos", label: "Todos" },
    { key: "por-vencer", label: "Por vencer" },
    { key: "vencidos", label: "Vencidos" },
    { key: "2023-2027", label: "2023-2027" },
    { key: "2025-2029", label: "2025-2029" },
  ];

  return (
    <Wrapper>
      <section className="mx-auto w-full max-w-7xl px-1 pb-10 pt-1 sm:px-3 lg:px-5">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">
                Cámara de Diputados
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
                Diputados
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Buscá por nombre, departamento, partido, bloque, anexo o mandato y abrí el perfil con su inventario asociado.
              </p>
              {canManage && (
                <Link href="/Diputados/gestion" className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-cyan-500 dark:hover:text-cyan-300">
                  <FaCog className="h-3.5 w-3.5" />
                  Administrar diputados
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[620px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <FaUsers className="mb-2 text-cyan-700 dark:text-cyan-300" />
                <p className="text-2xl font-bold text-slate-950 dark:text-white">
                  {diputadosEnriched.length}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Total
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <FaUserTie className="mb-2 text-emerald-700 dark:text-emerald-300" />
                <p className="text-2xl font-bold text-slate-950 dark:text-white">
                  {stats.active}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Vigentes
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <FaClock className="mb-2 text-amber-700 dark:text-amber-300" />
                <p className="text-2xl font-bold text-slate-950 dark:text-white">
                  {stats.warning}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Por vencer
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <FaFilter className="mb-2 text-violet-700 dark:text-violet-300" />
                <p className="text-2xl font-bold text-slate-950 dark:text-white">
                  {stats.blocks}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Bloques
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
            <div className="relative">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar diputado, departamento, partido, bloque o anexo"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="h-11 rounded-xl pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilter(option.key)}
                  className={`h-10 rounded-xl px-3 text-sm font-bold transition ${
                    filter === option.key
                      ? "bg-cyan-700 text-white dark:bg-cyan-500 dark:text-slate-950"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
            >
              <option value="vencimiento">Orden: vencimiento</option>
              <option value="nombre">Orden: nombre</option>
              <option value="departamento">Orden: departamento</option>
              <option value="anexo">Orden: anexo</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200">
              Vigente
            </Badge>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200">
              90 días o menos
            </Badge>
            <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-200">
              30 días o menos
            </Badge>
            <span className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400">
              {diputadosFiltrados.length} resultados · {filter === "todos" ? "sin filtro" : filter}
            </span>
          </div>
        </div>

        {diputadosFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {diputadosFiltrados.map((diputado) => (
              <Link
                key={diputado.nombre}
                href={`/Perfil-Diputado/${encodeURIComponent(diputado.nombre)}`}
                className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                title={`${diputado.nombre} - ${statusLabel(diputado._status, diputado._daysLeft)}`}
              >
                <DiputadoCard {...diputado} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-14 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-400">
            No se encontraron diputados con ese criterio.
          </div>
        )}
      </section>
    </Wrapper>
  );
}
