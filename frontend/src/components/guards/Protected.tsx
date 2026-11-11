
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { me, type AuthSession } from "@/services/authService";
import { clearAuthUser, getAuthUser, setAuthUser } from "@/services/authRole";
import { useAutoLogout } from "@/hooks/useAutoLogout";

const LOGIN_PATH = "/Login";
const PASSWORD_CHANGE_PATH = "/CambiarPassword";
const RECENT_SESSION_MS = 30_000;

function isPublicRoute(pathname: string) {
  const current = pathname.toLowerCase();
  const isPublicSubdependencia =
    /^\/inventario-publico\/subdependencia\/\d+\/?$/.test(current);
  const isPublicAnexo =
    /^\/inventario-publico\/anexo\/\d+\/?$/.test(current);
  const isPublicDirectory =
    /^\/inventario-publico\/directorio\/[a-z0-9-]+\/?$/.test(current);

  return (
    pathname === "/" ||
    current === "/login" ||
    current === "/ver" ||
    current === "/ver/" ||
    isPublicSubdependencia ||
    isPublicAnexo ||
    isPublicDirectory
  );
}

function roleHome(role?: string | null) {
  return role === "matafuegos" ? "/matafuegos" : "/Home";
}

function canAccessPrivateRoute(
  pathname: string,
  role?: string | null,
  username?: string | null
) {
  const current = pathname.toLowerCase();
  const normalizedUsername = (username ?? "").trim().toLowerCase();

  if (
    (current === "/comprasbienes" || current.startsWith("/comprasbienes/")) &&
    role !== "admin" && role !== "superadmin" && normalizedUsername !== "dante"
  ) {
    return false;
  }

  if (
    (current === "/consultaspublicas" || current.startsWith("/consultaspublicas/")) &&
    role !== "superadmin" &&
    !["mauri", "luciano", "nahun"].includes(normalizedUsername)
  ) {
    return false;
  }

  if (role === "matafuegos") {
    return (
      current === "/anexos" ||
      current === "/matafuegos" ||
      current.startsWith("/matafuegos/") ||
      current === "/perfil" ||
      current.startsWith("/perfil/")
    );
  }

  if (role === "comisario") {
    return !(
      current === "/gestion" ||
      current.startsWith("/gestion/") ||
      current === "/listadosgenerales" ||
      current.startsWith("/listadosgenerales/") ||
      current === "/matafuegos/imprimir" ||
      current.startsWith("/matafuegos/imprimir/") ||
      current === "/altas" ||
      current.startsWith("/altas/") ||
      current === "/auditoria" ||
      current.startsWith("/auditoria/")
    );
  }

  return true;
}

export default function Protected({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [checkedPath, setCheckedPath] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<AuthSession | null>(null);
  const [authError, setAuthError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const isPublicPath = isPublicRoute(pathname);
  const currentPath = pathname.toLowerCase();
  const isPasswordChangePath =
    currentPath === PASSWORD_CHANGE_PATH.toLowerCase();
  const sessionAllowsCurrentPath = Boolean(
    sessionUser &&
      ((sessionUser.password_change_required &&
        currentPath === PASSWORD_CHANGE_PATH.toLowerCase()) ||
        (!sessionUser.password_change_required &&
          currentPath !== PASSWORD_CHANGE_PATH.toLowerCase() &&
          canAccessPrivateRoute(pathname, sessionUser.role, sessionUser.username)))
  );
  const pathIsReady = checkedPath === pathname || sessionAllowsCurrentPath;

  useAutoLogout(
    !checking && pathIsReady && !isPublicPath && !isPasswordChangePath
  );

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      // Si es pública, no chequea nada
      if (isPublicPath || isPasswordChangePath) {
        setCheckedPath(pathname);
        setChecking(false);
        return;
      }

      setAuthError("");

      let user = sessionUser;
      if (!user) {
        const cached = getAuthUser();
        const recentlyVerified = Boolean(
          cached.verifiedAt && Date.now() - cached.verifiedAt < RECENT_SESSION_MS
        );
        const pendingPasswordChange =
          currentPath === PASSWORD_CHANGE_PATH.toLowerCase() &&
          cached.passwordChangeRequired === true;

        if (cached.username && (recentlyVerified || pendingPasswordChange)) {
          user = {
            username: cached.username,
            role: cached.role,
            password_change_required: cached.passwordChangeRequired === true,
          };
        }
      }

      try {
        if (!user) user = await me();
        if (!mounted) return;

        if (!user) {
          document.cookie = "hm_auth=; Max-Age=0; Path=/; SameSite=Lax";
          clearAuthUser();
          router.replace(LOGIN_PATH);
        } else if (
          user.password_change_required &&
          currentPath !== PASSWORD_CHANGE_PATH.toLowerCase()
        ) {
          setSessionUser(user);
          setAuthUser(user.username, user.role, true);
          router.replace(PASSWORD_CHANGE_PATH);
        } else if (
          !user.password_change_required &&
          currentPath === PASSWORD_CHANGE_PATH.toLowerCase()
        ) {
          setSessionUser(user);
          setAuthUser(user.username, user.role, false);
          router.replace(roleHome(user.role));
        } else if (!canAccessPrivateRoute(pathname, user.role, user.username)) {
          setSessionUser(user);
          setAuthUser(user.username, user.role, user.password_change_required);
          router.replace(roleHome(user.role));
        } else {
          setSessionUser(user);
          setAuthUser(user.username, user.role, user.password_change_required);
          setCheckedPath(pathname);
          setChecking(false);
        }
      } catch {
        if (!mounted) return;
        setChecking(false);
        setAuthError("No pudimos verificar la sesión. Revisá la conexión e intentá nuevamente.");
      }
    };

    checkAuth();
    return () => {
      mounted = false;
    };
  }, [currentPath, isPasswordChangePath, isPublicPath, pathname, retryKey, router, sessionUser]);

  // El backend protege el cambio con cookie, clave actual y CSRF. Mostrar el
  // formulario directamente evita un ciclo si /me responde que la clave es provisoria.
  if (isPasswordChangePath) {
    return <>{children}</>;
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
        <div className="w-full max-w-md border border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
          <ShieldAlert className="mx-auto h-9 w-9 text-amber-500" />
          <h1 className="mt-3 text-lg font-black text-slate-950 dark:text-white">No se pudo verificar la sesión</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{authError}</p>
          <button
            type="button"
            onClick={() => {
              setChecking(true);
              setAuthError("");
              setRetryKey((current) => current + 1);
            }}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cyan-600 px-5 text-sm font-black text-slate-950 transition hover:bg-cyan-500"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (checking || !pathIsReady) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        Verificando sesión...
      </div>
    );
  }

  return <>{children}</>;
}
