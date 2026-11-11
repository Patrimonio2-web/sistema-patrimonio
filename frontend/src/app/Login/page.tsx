
"use client";

import { useState } from "react";
import Image from "next/image";
import { toast, Toaster } from "react-hot-toast";
import { Eye, EyeOff, LockKeyhole, LogIn, ShieldCheck, UserRound } from "lucide-react";
import { Login23 } from "../../../public";
import { Spinner, Footer } from "@/components";
import { login } from "@/services/authService";
import { setAuthUser } from "@/services/authRole";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    setError("");
    setIsLoading(true);

    try {
      const auth = await login(username, password);
      setAuthUser(auth.username, auth.role, Boolean(auth.password_change_required));

      sessionStorage.setItem("showWelcome", "true");
      const nextPath = auth.password_change_required
        ? "/CambiarPassword"
        : auth.role === "matafuegos"
          ? "/matafuegos"
          : "/Home";
      window.location.replace(nextPath);
    } catch (err: unknown) {
      console.error("Error en login:", err);
      setError("Usuario o contraseña incorrectos");
      toast.error("Credenciales inválidas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col overflow-hidden bg-[#eef4f8] text-slate-950 dark:bg-[#07111f] dark:text-white">
      <Toaster position="top-center" />

      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-sm">
          <Spinner />
          <p className="mt-4 text-sm font-medium text-white">Iniciando sesión...</p>
        </div>
      )}

      <main className="flex flex-grow items-center justify-center px-4 py-8 sm:px-6">
        <section className="grid w-full max-w-6xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl shadow-slate-300/40 dark:border-white/10 dark:bg-slate-950 dark:shadow-black/40 md:grid-cols-[1.08fr_0.92fr]">
          <div className="relative hidden min-h-[620px] overflow-hidden md:block">
            <Image
              src={Login23}
              alt="Ilustración de login"
              fill
              priority
              className="object-cover"
              sizes="(min-width: 768px) 52vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 text-white">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs font-semibold backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5" />
                Acceso institucional
              </span>
              <h1 className="mt-4 max-w-md text-4xl font-bold leading-tight">
                Sistema de Patrimonio
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/85">
                Legislatura de la Provincia de La Rioja
              </p>
            </div>
          </div>

          <div className="relative h-52 overflow-hidden md:hidden">
            <Image
              src={Login23}
              alt="Ilustración de login móvil"
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[11px] font-semibold backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5" />
                Acceso institucional
              </span>
              <h1 className="mt-3 text-2xl font-bold leading-tight">
                Sistema de Patrimonio
              </h1>
              <p className="mt-1 text-xs text-white/85">
                Legislatura de la Provincia de La Rioja
              </p>
            </div>
          </div>

          <div className="flex items-center bg-white p-6 dark:bg-slate-950 sm:p-8 lg:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                  Sistema de patrimonio
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 dark:text-white">
                  Iniciar sesión
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Ingresá con tu usuario y contraseña para continuar.
                </p>
              </div>

              <form onSubmit={handleLogin} autoComplete="off" noValidate className="space-y-5">
                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100"
                  >
                    Usuario
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      id="username"
                      type="text"
                      autoComplete="off"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block h-12 w-full rounded-xl border border-slate-300 bg-white px-10 text-sm font-medium text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
                      placeholder="Usuario"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      autoComplete="off"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-12 text-sm font-medium text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
                      placeholder="Contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 text-sm font-bold text-white shadow-lg shadow-cyan-900/15 transition hover:bg-cyan-800 focus:outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-500 dark:text-slate-950 dark:shadow-cyan-950/30 dark:hover:bg-cyan-400 dark:focus:ring-cyan-950"
                >
                  <LogIn className="h-4 w-4" />
                  {isLoading ? "Ingresando..." : "Ingresar"}
                </button>
              </form>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                El acceso está reservado para usuarios autorizados por la Dirección de Patrimonio.
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer variant="light" />
    </div>
  );
}
