"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  ArrowRight,
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  Landmark,
  Layers3,
  MapPin,
  Package,
  Printer,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Wrapper, ToastMessage } from "@/components";
import { GOOGLE_MAPS_EMBED_SRC, GOOGLE_MAPS_LINK } from "@/config/constants";
import {
  fetchDashboard,
  type DashboardResponse,
} from "@/services/dashboardService";
import { isComisario } from "@/services/authRole";
import { Lesgilatura } from "../../../public";

interface DashboardStats {
  bienesRegistrados: number;
  anexosActivos: number;
  subdependencias: number;
  altas: number;
}

interface StatCard {
  label: string;
  value: number;
  Icon: LucideIcon;
  tone: string;
  surface: string;
}

interface QuickAction {
  label: string;
  href: string;
  Icon: LucideIcon;
  className: string;
}

const numberFormatter = new Intl.NumberFormat("es-AR");

const quickActions: QuickAction[] = [
  {
    label: "Buscar un bien",
    href: "/listados",
    Icon: Search,
    className:
      "bg-cyan-600 text-white hover:bg-cyan-500 focus-visible:ring-cyan-300",
  },
  {
    label: "Buscador avanzado",
    href: "/BuscadorAvanzado",
    Icon: ClipboardList,
    className:
      "bg-slate-800 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 focus-visible:ring-slate-300",
  },
  {
    label: "Ver reportes",
    href: "/reportes",
    Icon: BarChart3,
    className:
      "bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-300",
  },
  {
    label: "Imprimir listados",
    href: "/ListadosGenerales",
    Icon: Printer,
    className:
      "bg-amber-500 text-slate-950 hover:bg-amber-400 focus-visible:ring-amber-200",
  },
];

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export default function HomePage() {
  const comisario = isComisario();
  const [showWelcome, setShowWelcome] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    bienesRegistrados: 0,
    anexosActivos: 0,
    subdependencias: 0,
    altas: 0,
  });

  useEffect(() => {
    const shouldShowWelcome = sessionStorage.getItem("showWelcome");
    if (shouldShowWelcome) {
      setShowWelcome(true);
      sessionStorage.removeItem("showWelcome");
    }

    (async () => {
      try {
        const data: DashboardResponse = await fetchDashboard();
        setStats({
          bienesRegistrados: data.kpis?.mobiliario ?? 0,
          anexosActivos: data.kpis?.anexos ?? 0,
          subdependencias: data.kpis?.subdependencias ?? 0,
          altas: data.kpis?.altas ?? 0,
        });
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "No se pudo cargar el dashboard";
        toast.error(msg);
      }
    })();
  }, []);

  const statCards: StatCard[] = [
    {
      label: "Bienes registrados",
      value: stats.bienesRegistrados,
      Icon: Package,
      tone: "text-cyan-600 dark:text-cyan-300",
      surface: "bg-cyan-50 ring-cyan-500/15 dark:bg-cyan-500/10",
    },
    {
      label: "Anexos activos",
      value: stats.anexosActivos,
      Icon: Building2,
      tone: "text-emerald-600 dark:text-emerald-300",
      surface: "bg-emerald-50 ring-emerald-500/15 dark:bg-emerald-500/10",
    },
    {
      label: "Subdependencias",
      value: stats.subdependencias,
      Icon: Layers3,
      tone: "text-amber-600 dark:text-amber-300",
      surface: "bg-amber-50 ring-amber-500/15 dark:bg-amber-500/10",
    },
    {
      label: "Altas registradas",
      value: stats.altas,
      Icon: FileText,
      tone: "text-blue-600 dark:text-blue-300",
      surface: "bg-blue-50 ring-blue-500/15 dark:bg-blue-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {showWelcome && (
        <ToastMessage message="Bienvenido al sistema de Patrimonio" />
      )}

      <Wrapper>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-1 pb-10 pt-1 sm:px-3 lg:px-5">
          <motion.section
            className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-xl shadow-slate-900/10 dark:border-slate-800"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Image
              src={Lesgilatura}
              alt="Frente de la Legislatura de La Rioja"
              fill
              priority
              placeholder="blur"
              sizes="(max-width: 1024px) 100vw, 1200px"
              className="object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-slate-950/70" />

            <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
              <div className="flex flex-col justify-center">
                <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-100">
                  <Landmark className="h-4 w-4" />
                  Dirección de Patrimonio
                </span>

                <h1 className="max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
                  Sistema de Patrimonio
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                  Legislatura de la Provincia de La Rioja
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  {quickActions.slice(0, 2).map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={`inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${action.className}`}
                    >
                      <action.Icon className="h-4 w-4" />
                      {action.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {statCards.slice(0, 2).map((item, idx) => (
                  <motion.div
                    key={item.label}
                    className="rounded-lg border border-white/10 bg-white/10 p-5 backdrop-blur"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                  >
                    <item.Icon className="mb-5 h-7 w-7 text-cyan-200" />
                    <p className="text-sm font-medium text-slate-200">
                      {item.label}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-white">
                      {formatNumber(item.value)}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((item, idx) => (
              <motion.div
                key={item.label}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                      {formatNumber(item.value)}
                    </p>
                  </div>
                  <div className={`rounded-lg p-3 ring-1 ${item.surface}`}>
                    <item.Icon className={`h-5 w-5 ${item.tone}`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {quickActions
              .filter((action) => !comisario || action.href !== "/ListadosGenerales")
              .map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`group flex min-h-24 items-center justify-between rounded-lg px-5 py-4 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950 ${action.className}`}
                >
                  <span className="flex items-center gap-3">
                    <action.Icon className="h-5 w-5" />
                    {action.label}
                  </span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
              ))}
          </section>

          <section className="grid gap-5 lg:grid-cols-[1fr_0.95fr]">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900">
              <div className="relative aspect-[16/9] min-h-72">
                <Image
                  src={Lesgilatura}
                  alt="Frente de la Legislatura de La Rioja"
                  fill
                  placeholder="blur"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col gap-2 border-t border-slate-200 p-5 dark:border-slate-800">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Ubicación institucional
                </h2>
                <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <MapPin className="h-4 w-4 text-rose-500" />
                  Vélez Sársfield 874, F5300 La Rioja
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900">
              <iframe
                title="Ubicación Poder Legislativo"
                src={GOOGLE_MAPS_EMBED_SRC}
                width="100%"
                height="360"
                className="h-80 w-full border-0 lg:h-full lg:min-h-[360px]"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-5 dark:border-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    Legislatura de La Rioja
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Casa central
                  </p>
                </div>
                <a
                  href={GOOGLE_MAPS_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 dark:border-slate-700 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-200"
                >
                  Abrir mapa
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </section>
        </div>
      </Wrapper>
    </div>
  );
}
