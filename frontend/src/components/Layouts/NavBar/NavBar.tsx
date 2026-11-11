"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BsMoon, BsSun } from "react-icons/bs";
import { FaBars, FaTimes } from "react-icons/fa";
import {
  HiBell,
  HiChatAlt2,
  HiStatusOnline,
  HiShoppingCart,
  HiUser,
  HiUserGroup,
} from "react-icons/hi";
import { useTheme } from "@/Context/ThemeContext";
import { canAccessPurchaseReports, canManagePublicConsultations, getAuthUser } from "@/services/authRole";
import { obtenerNotificacionesCompras } from "@/services/comprasBienesService";
import { obtenerNotificacionesRevisionesAltas } from "@/services/altasRevisionService";
import { obtenerNotificacionesConsultasPublicas } from "@/services/consultasPublicasService";
import {
  isMatafuegoConAlerta,
  matafuegoAlertaLabel,
  matafuegoAlertaPriority,
  obtenerMatafuegosTodos,
  type Matafuego,
} from "@/services/matafuegosService";
import { listarUsuariosOnline, type UsuarioOnline } from "@/services/presenciaService";

interface NavbarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const pageTitles: Record<string, string> = {
  "/Home": "Inicio",
  "/Anexos": "Anexos",
  "/gestion": "Gestión de Anexos",
  "/listados": "Listados",
  "/BuscadorAvanzado": "Buscador avanzado",
  "/Etiquetas": "Etiquetas",
  "/reportes": "Reportes",
  "/Bajas": "Bajas Mobiliario",
  "/Control": "Control",
  "/Perfil": "Perfil",
  "/Configuracion": "Usuarios",
  "/altas/revision": "Revision de altas",
  "/altas": "Planillas - Altas",
  "/Diputados": "Diputados",
  "/Auditoria": "Auditoría",
  "/ListadosGenerales": "Imprimir",
  "/matafuegos": "Matafuegos",
  "/ConsultasPublicas": "Consultas publicas",
  "/ComprasBienes": "Compras de bienes de uso",
};

function getPageTitle(pathname: string) {
  const entry = Object.entries(pageTitles).find(
    ([path]) => pathname === path || pathname.startsWith(`${path}/`)
  );

  return entry?.[1] ?? "Sistema de Patrimonio";
}

function roleLabel(role?: string) {
  if (role === "superadmin") return "Super admin";
  if (role === "matafuegos") return "Control matafuegos";
  if (role === "comisario") return "Comisario";
  if (role === "viewer") return "Solo ver";
  if (role === "admin") return "Admin";
  return "Usuario";
}

function matafuegoDueLabel(item: Matafuego) {
  if (item.dias_para_vencer === null || item.dias_para_vencer === undefined) {
    return "Sin fecha de vencimiento";
  }
  if (item.dias_para_vencer < 0) {
    return `Vencido hace ${Math.abs(item.dias_para_vencer)} dias`;
  }
  if (item.dias_para_vencer === 0) return "Vence hoy";
  return `Vence en ${item.dias_para_vencer} dias`;
}

function matafuegoDateLabel(item: Matafuego) {
  const value = item.fecha_recarga || item.fecha_vencimiento;
  if (!value) return "Fecha: sin cargar";
  const [year, month, day] = value.slice(0, 10).split("-");
  const formatted = year && month && day ? `${day}/${month}/${year}` : value;
  return `${item.fecha_recarga ? "Recarga" : "Vencimiento"}: ${formatted}`;
}

function matafuegoAlertBadge(alerta: Matafuego["alerta"]) {
  if (alerta === "vencido") {
    return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-100";
  }
  if (alerta === "vence_10") {
    return "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-100";
  }
  return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-100";
}

export default function Navbar({
  isSidebarOpen,
  setIsSidebarOpen,
}: NavbarProps) {
  const pathname = usePathname();
  const { darkMode, setTheme } = useTheme();
  const { username, role } = getAuthUser();
  const superadmin = role === "superadmin";
  const canManageConsultations = canManagePublicConsultations();
  const canAccessPurchases = canAccessPurchaseReports();
  const pageTitle = getPageTitle(pathname);
  const profileActive = pathname === "/Perfil" || pathname.startsWith("/Perfil/");
  const [onlineUsers, setOnlineUsers] = useState<UsuarioOnline[]>([]);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [revisionPending, setRevisionPending] = useState(0);
  const [consultationsPending, setConsultationsPending] = useState(0);
  const [purchasesPending, setPurchasesPending] = useState(0);
  const [matafuegosItems, setMatafuegosItems] = useState<Matafuego[]>([]);
  const [matafuegosResumen, setMatafuegosResumen] = useState({
    vencidos: 0,
    proximos: 0,
    vigentes: 0,
  });
  const [matafuegosOpen, setMatafuegosOpen] = useState(false);
  const matafuegosAlertas = matafuegosItems.length;

  useEffect(() => {
    let cancelled = false;

    const loadOnline = async () => {
      try {
        const data = await listarUsuariosOnline();
        if (!cancelled) setOnlineUsers(data);
      } catch {
        if (!cancelled) setOnlineUsers([]);
      }
    };

    loadOnline();
    const interval = window.setInterval(loadOnline, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!superadmin) {
      setRevisionPending(0);
      return;
    }

    let cancelled = false;

    const loadPending = async () => {
      try {
        const data = await obtenerNotificacionesRevisionesAltas();
        if (!cancelled) setRevisionPending(data.pendientes);
      } catch {
        if (!cancelled) setRevisionPending(0);
      }
    };

    loadPending();
    const interval = window.setInterval(loadPending, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [superadmin]);

  useEffect(() => {
    if (!canManageConsultations) {
      setConsultationsPending(0);
      return;
    }

    let cancelled = false;

    const loadPending = async () => {
      try {
        const data = await obtenerNotificacionesConsultasPublicas();
        if (!cancelled) setConsultationsPending(data.pendientes);
      } catch {
        if (!cancelled) setConsultationsPending(0);
      }
    };

    loadPending();
    const interval = window.setInterval(loadPending, 60_000);
    window.addEventListener("consultas-publicas:updated", loadPending);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("consultas-publicas:updated", loadPending);
    };
  }, [canManageConsultations]);

  useEffect(() => {
    if (!canAccessPurchases) {
      setPurchasesPending(0);
      return;
    }
    let cancelled = false;
    const loadPending = async () => {
      try {
        const data = await obtenerNotificacionesCompras();
        if (!cancelled) setPurchasesPending(data.pendientes);
      } catch {
        if (!cancelled) setPurchasesPending(0);
      }
    };
    loadPending();
    const interval = window.setInterval(loadPending, 60_000);
    window.addEventListener("compras-bienes:updated", loadPending);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("compras-bienes:updated", loadPending);
    };
  }, [canAccessPurchases]);

  useEffect(() => {
    let cancelled = false;

    const loadMatafuegos = async () => {
      try {
        const data = await obtenerMatafuegosTodos();
        const resumen = data.reduce(
          (acc, item) => {
            if (item.alerta === "vencido") acc.vencidos += 1;
            else if (isMatafuegoConAlerta(item)) acc.proximos += 1;
            else if (item.alerta === "vigente") acc.vigentes += 1;
            return acc;
          },
          { vencidos: 0, proximos: 0, vigentes: 0 }
        );
        const alertas = data
          .filter(isMatafuegoConAlerta)
          .sort((a, b) => {
            const byPriority =
              matafuegoAlertaPriority(a.alerta) - matafuegoAlertaPriority(b.alerta);
            if (byPriority !== 0) return byPriority;
            return (
              (a.dias_para_vencer ?? Number.MAX_SAFE_INTEGER) -
              (b.dias_para_vencer ?? Number.MAX_SAFE_INTEGER)
            );
          });

        if (!cancelled) {
          setMatafuegosItems(alertas);
          setMatafuegosResumen(resumen);
        }
      } catch {
        if (!cancelled) {
          setMatafuegosItems([]);
          setMatafuegosResumen({ vencidos: 0, proximos: 0, vigentes: 0 });
        }
      }
    };

    loadMatafuegos();
    const interval = window.setInterval(loadMatafuegos, 60_000);
    window.addEventListener("matafuegos:updated", loadMatafuegos);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("matafuegos:updated", loadMatafuegos);
    };
  }, []);

  return (
    <nav className="fixed left-0 top-0 z-50 flex h-16 w-full items-center justify-between gap-1 border-b border-slate-200 bg-white/90 px-2 shadow-sm shadow-slate-900/5 backdrop-blur sm:gap-2 sm:px-4 lg:left-64 lg:w-[calc(100%-16rem)] dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex min-w-0 items-center gap-1 sm:flex-1 sm:gap-3 sm:pr-1">
        <button
          type="button"
          onClick={() => {
            setIsSidebarOpen(!isSidebarOpen);
            setOnlineOpen(false);
            setMatafuegosOpen(false);
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 min-[400px]:h-9 min-[400px]:w-9 sm:h-10 sm:w-10 lg:hidden dark:border-slate-800 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-200"
          aria-label={isSidebarOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {isSidebarOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
        </button>

        <div className="hidden min-w-0 2xl:block">
          <p className="hidden text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:block dark:text-slate-400">
            Sistema de Patrimonio
          </p>
          <h1 className="max-w-[7rem] truncate text-sm font-bold text-slate-950 min-[380px]:max-w-[9rem] sm:max-w-none sm:text-lg dark:text-white">
            {pageTitle}
          </h1>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5 min-[400px]:gap-1 sm:shrink-0 sm:flex-none sm:gap-3">
        {matafuegosAlertas > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setMatafuegosOpen((prev) => !prev);
                setOnlineOpen(false);
              }}
              className="relative flex h-8 items-center justify-center gap-0.5 rounded-md border border-red-500/25 bg-red-50 px-1.5 text-[11px] font-semibold text-red-800 transition hover:border-red-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 min-[400px]:h-9 min-[400px]:gap-1 min-[400px]:px-2 sm:h-11 sm:gap-2 sm:px-3 sm:text-sm dark:bg-red-500/10 dark:text-red-100 dark:hover:border-red-500 dark:hover:bg-slate-900"
              title="Matafuegos vencidos o por vencer"
              aria-expanded={matafuegosOpen}
            >
              <HiBell className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
              <span className="hidden xl:inline">Matafuegos</span>
              <span className="rounded bg-white/70 px-1 py-0.5 text-red-900 sm:px-2 dark:bg-red-950/40 dark:text-red-100">
                {matafuegosAlertas}
              </span>
            </button>

            {matafuegosOpen && (
              <div className="fixed left-3 right-3 top-16 z-[80] w-auto rounded-md border border-red-200 bg-white p-2 shadow-xl shadow-slate-900/15 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-96 dark:border-red-900 dark:bg-slate-950">
                <div className="border-b border-slate-200 px-2 pb-2 dark:border-slate-800">
                  <p className="text-sm font-black text-slate-950 dark:text-white">
                    Matafuegos con alerta
                  </p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {matafuegosAlertas} vencidos o por vencer
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[11px] font-bold">
                    <span className="rounded-md bg-red-100 px-1 py-1.5 text-red-800 dark:bg-red-950/50 dark:text-red-100">
                      {matafuegosResumen.vencidos} vencidos
                    </span>
                    <span className="rounded-md bg-amber-100 px-1 py-1.5 text-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
                      {matafuegosResumen.proximos} proximos
                    </span>
                    <span className="rounded-md bg-emerald-100 px-1 py-1.5 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100">
                      {matafuegosResumen.vigentes} vigentes
                    </span>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto py-1">
                  {matafuegosItems.length === 0 && (
                    <p className="px-2 py-5 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                      No hay matafuegos vencidos ni proximos a vencer.
                    </p>
                  )}
                  {matafuegosItems.slice(0, 8).map((item) => (
                    <Link
                      key={item.id}
                      href={`/matafuegos?id=${item.id}`}
                      onClick={() => setMatafuegosOpen(false)}
                      className="block rounded px-2 py-2 text-sm transition hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-black ${matafuegoAlertBadge(item.alerta)}`}>
                        {matafuegoAlertaLabel(item.alerta)}
                      </span>
                      <p className="mt-1 line-clamp-2 font-bold text-slate-950 dark:text-white">
                        {item.descripcion_mobiliario || item.codigo || "Matafuego"}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {[item.anexo, item.subdependencia].filter(Boolean).join(" - ") ||
                          "Sin ubicacion"}
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-red-700 dark:text-red-200">
                        {matafuegoDueLabel(item)}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {matafuegoDateLabel(item)}
                        {item.estado_recarga ? ` - Estado ${item.estado_recarga}` : ""}
                      </p>
                    </Link>
                  ))}
                </div>

                <Link
                  href="/matafuegos"
                  onClick={() => setMatafuegosOpen(false)}
                  className="mt-1 flex h-10 items-center justify-center rounded-md border border-red-200 text-sm font-bold text-red-800 hover:bg-red-50 dark:border-red-900 dark:text-red-100 dark:hover:bg-red-950/30"
                >
                  Ver control general
                </Link>
              </div>
            )}
          </div>
        )}

        {superadmin && (
          <Link
            href="/altas/revision"
            onClick={() => {
              setOnlineOpen(false);
              setMatafuegosOpen(false);
            }}
            className="relative flex h-8 items-center justify-center gap-0.5 rounded-md border border-amber-500/25 bg-amber-50 px-1.5 text-[11px] font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 min-[400px]:h-9 min-[400px]:gap-1 min-[400px]:px-2 sm:h-11 sm:gap-2 sm:px-3 sm:text-sm dark:bg-amber-500/10 dark:text-amber-100 dark:hover:border-amber-500 dark:hover:bg-slate-900"
            title="Revision de planillas de altas"
          >
            <HiBell className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
            <span className="hidden lg:inline">Altas</span>
            <span className="rounded bg-white/70 px-1 py-0.5 text-amber-900 sm:px-2 dark:bg-amber-950/40 dark:text-amber-100">
              {revisionPending}
            </span>
          </Link>
        )}

        {canManageConsultations && (
          <Link
            href="/ConsultasPublicas"
            onClick={() => {
              setOnlineOpen(false);
              setMatafuegosOpen(false);
            }}
            className="relative hidden h-11 items-center justify-center gap-2 rounded-md border border-cyan-500/25 bg-cyan-50 px-3 text-sm font-semibold text-cyan-800 transition hover:border-cyan-400 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:flex dark:bg-cyan-500/10 dark:text-cyan-100 dark:hover:border-cyan-400 dark:hover:bg-slate-900"
            title="Mensajes recibidos desde el asistente publico"
          >
            <span className="relative">
              <HiChatAlt2 className="h-5 w-5" />
              {consultationsPending > 0 && (
                <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-red-500 ring-2 ring-cyan-50 dark:ring-slate-950" />
              )}
            </span>
            <span className="hidden xl:inline">Consultas</span>
            <span className="min-w-6 rounded bg-white/80 px-1.5 py-0.5 text-center text-xs text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-100">
              {consultationsPending}
            </span>
          </Link>
        )}

        {canAccessPurchases && (
          <Link
            href="/ComprasBienes"
            onClick={() => {
              setOnlineOpen(false);
              setMatafuegosOpen(false);
            }}
            className="relative flex h-8 items-center justify-center gap-0.5 rounded-md border border-violet-500/25 bg-violet-50 px-1.5 text-[11px] font-semibold text-violet-800 transition hover:border-violet-400 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 min-[400px]:h-9 min-[400px]:gap-1 min-[400px]:px-2 sm:h-11 sm:gap-2 sm:px-3 sm:text-sm dark:bg-violet-500/10 dark:text-violet-100 dark:hover:bg-slate-900"
            title="Reportes de compras de bienes de uso"
          >
            <span className="relative">
              <HiShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
              {purchasesPending > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-red-500 ring-2 ring-violet-50 dark:ring-slate-950" />}
            </span>
            <span className="hidden 2xl:inline">Compras</span>
            <span className="min-w-5 rounded bg-white/80 px-1 py-0.5 text-center text-xs text-violet-900 dark:bg-violet-950/60 dark:text-violet-100">{purchasesPending}</span>
          </Link>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setOnlineOpen((prev) => !prev);
              setMatafuegosOpen(false);
            }}
            className="flex h-8 items-center justify-center gap-0.5 rounded-md border border-emerald-500/20 bg-emerald-50 px-1.5 text-[11px] font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 min-[400px]:h-9 min-[400px]:gap-1 min-[400px]:px-2 sm:h-11 sm:gap-2 sm:px-3 sm:text-sm dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:border-emerald-500 dark:hover:bg-slate-900"
            title="Usuarios en linea"
            aria-expanded={onlineOpen}
          >
            <HiUserGroup className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">En linea</span>
            <span className="rounded bg-white/70 px-1 py-0.5 text-emerald-800 sm:px-2 dark:bg-emerald-950/40 dark:text-emerald-100">
              {onlineUsers.length}
            </span>
          </button>

          {onlineOpen && (
            <div className="fixed left-3 right-3 top-16 z-[80] w-auto rounded-md border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/15 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-72 dark:border-slate-800 dark:bg-slate-950">
              <div className="max-h-80 overflow-y-auto">
                {onlineUsers.length ? (
                  onlineUsers.map((user) => (
                    <div
                      key={user.username}
                      className="flex items-center justify-between gap-3 rounded px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-900"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-950 dark:text-white">
                          {user.username}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {roleLabel(user.role)}
                        </p>
                      </div>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950" />
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Sin usuarios en linea
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-50 px-0 text-[11px] font-semibold text-emerald-700 min-[400px]:h-9 min-[400px]:w-auto min-[400px]:px-2 sm:h-auto sm:gap-2 sm:px-3 sm:py-2 sm:text-sm dark:bg-emerald-500/10 dark:text-emerald-200" title={`Sesion activa: ${username ?? "Usuario"}`}>
          <HiStatusOnline className="h-4 w-4 shrink-0" />
          <span className="hidden whitespace-nowrap md:inline">Sesión activa</span>
          <span className="hidden max-w-[4.75rem] truncate rounded bg-white/70 px-1.5 py-0.5 text-emerald-800 min-[400px]:inline sm:max-w-32 sm:px-2 dark:bg-emerald-950/40 dark:text-emerald-100">
            {username ?? "Usuario"}
          </span>
        </div>

        <Link
          href="/Perfil"
          className={`flex h-8 w-8 items-center justify-center gap-2 rounded-md border px-0 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 min-[400px]:h-9 min-[400px]:w-9 sm:h-11 sm:w-auto sm:px-3 ${
            profileActive
              ? "border-cyan-400 bg-cyan-50 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-100"
              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-400 hover:bg-white hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:bg-slate-800 dark:hover:text-cyan-200"
          }`}
          aria-label="Abrir perfil"
          title="Perfil"
        >
          <HiUser className="h-5 w-5 shrink-0" />
          <span className="hidden sm:inline">Perfil</span>
        </Link>

        <button
          type="button"
          onClick={() => setTheme(darkMode === "light" ? "dark" : "light")}
          className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 min-[400px]:h-9 min-[400px]:w-9 sm:h-11 sm:w-11 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-200 dark:hover:border-amber-400 dark:hover:bg-slate-800 dark:hover:text-amber-100"
          aria-label={darkMode === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
          title={darkMode === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          {darkMode === "dark" ? (
            <BsSun className="h-[18px] w-[18px] transition-transform group-hover:rotate-12" />
          ) : (
            <BsMoon className="h-[18px] w-[18px] transition-transform group-hover:-rotate-12" />
          )}
        </button>
      </div>
    </nav>
  );
}
