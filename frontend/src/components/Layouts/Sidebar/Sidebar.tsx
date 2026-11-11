"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { MouseEvent } from "react";
import { toast } from "react-hot-toast";
import {
  HiBookOpen,
  HiClipboardList,
  HiClipboardCheck,
  HiChatAlt2,
  HiCog,
  HiFire,
  HiHome,
  HiOutlineLogout,
  HiPlusCircle,
  HiPrinter,
  HiSearch,
  HiSearchCircle,
  HiTemplate,
  HiShoppingCart,
  HiTag,
  HiUserGroup,
  HiX,
} from "react-icons/hi";
import { LogoutAlert } from "@/components";
import {
  canAccessPurchaseReports,
  isComisario,
  canManagePublicConsultations,
  isMatafuegosManager,
  isSuperAdmin,
  isViewer,
} from "@/services/authRole";
import { Logo4 } from "../../../../public";

interface SidebarItem {
  href: string;
  label: string;
  icon: JSX.Element;
  section?: string;
  external?: boolean;
  adminOnly?: boolean;
  superadminOnly?: boolean;
  consultationsOnly?: boolean;
  purchasesOnly?: boolean;
}

const sidebarItems: SidebarItem[] = [
  {
    section: "Principal",
    href: "/Anexos",
    label: "Anexos",
    icon: <HiHome className="h-5 w-5" />,
  },
  {
    href: "/gestion",
    label: "Gestión de Anexos",
    icon: <HiPlusCircle className="h-5 w-5" />,
    adminOnly: true,
  },
  {
    href: "/listados",
    label: "Listados",
    icon: <HiClipboardList className="h-5 w-5" />,
  },
  {
    href: "/nomenclador",
    label: "Nomenclador",
    icon: <HiBookOpen className="h-5 w-5" />,
  },
  {
    href: "/matafuegos",
    label: "Matafuegos",
    icon: <HiFire className="h-5 w-5" />,
  },
  {
    href: "/BuscadorAvanzado",
    label: "Buscador avanzado",
    icon: <HiSearch className="h-5 w-5" />,
  },
  {
    href: "/Etiquetas",
    label: "Etiquetas",
    icon: <HiTag className="h-5 w-5" />,
    adminOnly: true,
  },
  {
    href: "/reportes",
    label: "Reportes",
    icon: <HiTemplate className="h-5 w-5" />,
  },
  {
    href: "/ComprasBienes",
    label: "Compras de bienes",
    icon: <HiShoppingCart className="h-5 w-5" />,
    purchasesOnly: true,
  },
  {
    href: "/Bajas",
    label: "Bajas Mobiliario",
    icon: <HiOutlineLogout className="h-5 w-5" />,
  },
  {
    href: "/Configuracion",
    label: "Usuarios",
    icon: <HiCog className="h-5 w-5" />,
    superadminOnly: true,
  },
  {
    href: "/Diputados",
    label: "Diputados",
    icon: <HiUserGroup className="h-5 w-5" />,
  },
  {
    href: "/Auditoria",
    label: "Auditoría",
    icon: <HiSearchCircle className="h-5 w-5" />,
    adminOnly: true,
  },
  {
    href: "/ListadosGenerales",
    label: "Imprimir",
    icon: <HiPrinter className="h-5 w-5" />,
  },
  {
    href: "/altas",
    label: "Planillas - Altas",
    icon: <HiPlusCircle className="h-5 w-5" />,
    adminOnly: true,
  },
  {
    href: "/ConsultasPublicas",
    label: "Consultas publicas",
    icon: <HiChatAlt2 className="h-5 w-5" />,
    consultationsOnly: true,
  },
  {
    href: "/altas/revision",
    label: "Revision Altas",
    icon: <HiClipboardCheck className="h-5 w-5" />,
    superadminOnly: true,
  },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

function isActivePath(pathname: string, href: string, external?: boolean) {
  if (external) return false;

  const current = pathname.toLowerCase();
  const target = href.toLowerCase();

  if (target === "/altas") {
    return current === target || current.startsWith("/altas/imprimir");
  }

  return current === target || current.startsWith(`${target}/`);
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800 bg-slate-950 text-white shadow-2xl shadow-slate-950/25 lg:flex">
        <SidebarContent />
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        >
          <aside
            className="fixed inset-y-0 left-0 flex w-72 max-w-[86vw] translate-x-0 flex-col border-r border-slate-800 bg-slate-950 text-white shadow-2xl transition-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent setIsOpen={setIsOpen} />
          </aside>
        </div>
      )}
    </>
  );
}

function SidebarContent({
  setIsOpen,
}: {
  setIsOpen?: (isOpen: boolean) => void;
}) {
  const pathname = usePathname();
  const [showAlert, setShowAlert] = useState(false);
  const viewer = isViewer();
  const superadmin = isSuperAdmin();
  const matafuegosManager = isMatafuegosManager();
  const comisario = isComisario();
  const canManageConsultations = canManagePublicConsultations();
  const canAccessPurchases = canAccessPurchaseReports();

  const confirmLogout = () => {
    setShowAlert(false);
    window.location.href = "/";
  };

  const handleProtectedClick = (
    e: MouseEvent<HTMLAnchorElement>,
    adminOnly?: boolean,
    superadminOnly?: boolean
  ) => {
    if (superadminOnly && !superadmin) {
      e.preventDefault();
      e.stopPropagation();
      toast.error("Solo super admin puede acceder.");
      return;
    }

    if (viewer && !comisario && adminOnly) {
      e.preventDefault();
      e.stopPropagation();
      toast.error("Solo lectura: no tenés permisos para acceder.");
      return;
    }

    setIsOpen?.(false);
  };

  const closeIfMobile = () => {
    setIsOpen?.(false);
  };

  const baseItemClasses =
    "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-cyan-400";
  const disabledClasses =
    "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-slate-300";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-3 pb-4 pt-4">
        <div className="flex items-start gap-2">
          <Link
            href={matafuegosManager ? "/Anexos" : "/Home"}
            onClick={closeIfMobile}
            className="group block min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.06] p-3 shadow-lg shadow-slate-950/20 transition hover:border-cyan-400/40 hover:bg-white/[0.09]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white p-2 shadow-inner">
                <Image
                  src={Logo4}
                  alt="Logo Legislatura"
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">
                  Patrimonio
                </p>
                <p className="mt-0.5 truncate text-xs leading-4 text-slate-400">
                  Legislatura de La Rioja
                </p>
              </div>
            </div>
          </Link>

          {setIsOpen && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-slate-300 transition hover:border-cyan-400/40 hover:bg-white/[0.09] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 lg:hidden"
              aria-label="Cerrar menu"
            >
              <HiX className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-1">
          {sidebarItems
            .filter((item) => {
              if (item.consultationsOnly && !canManageConsultations) {
                return false;
              }
              if (item.purchasesOnly && !canAccessPurchases) {
                return false;
              }
              if (matafuegosManager) {
                return item.href === "/Anexos" || item.href === "/matafuegos";
              }
              if (
                comisario &&
                (item.href === "/gestion" ||
                  item.href === "/nomenclador" ||
                  item.href === "/ListadosGenerales" ||
                  item.href === "/altas" ||
                  item.href === "/altas/revision" ||
                  item.href === "/Auditoria")
              ) {
                return false;
              }
              return !item.superadminOnly || superadmin;
            })
            .map((item) => {
              const disabled = viewer && !comisario && item.adminOnly;
              const active = isActivePath(pathname, item.href, item.external);
              const itemClasses = `${baseItemClasses} ${
                active
                  ? "bg-cyan-500/15 text-white ring-1 ring-cyan-400/25"
                  : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
              } ${disabled ? disabledClasses : ""}`;

            return (
              <li key={item.href}>
                {item.section && (
                  <p className="mb-2 mt-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {item.section}
                  </p>
                )}

                {item.external ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={itemClasses}
                    onClick={(e) =>
                      handleProtectedClick(e, item.adminOnly, item.superadminOnly)
                    }
                    aria-disabled={disabled}
                    tabIndex={disabled ? -1 : 0}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition ${
                        active
                          ? "bg-cyan-400 text-slate-950"
                          : "bg-slate-900 text-cyan-300 group-hover:bg-slate-800"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </a>
                ) : (
                  <Link
                    href={disabled ? "#" : item.href}
                    className={itemClasses}
                    onClick={(e) =>
                      handleProtectedClick(e, item.adminOnly, item.superadminOnly)
                    }
                    aria-disabled={disabled}
                    tabIndex={disabled ? -1 : 0}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition ${
                        active
                          ? "bg-cyan-400 text-slate-950"
                          : "bg-slate-900 text-cyan-300 group-hover:bg-slate-800"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={() => setShowAlert(true)}
          className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-300 transition hover:bg-red-500/10 hover:text-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-red-300 transition group-hover:bg-red-500/15">
            <HiOutlineLogout className="h-5 w-5" />
          </span>
          Cerrar sesión
        </button>
      </div>

      {showAlert && (
        <LogoutAlert
          onConfirm={confirmLogout}
          onCancel={() => setShowAlert(false)}
        />
      )}
    </div>
  );
}
