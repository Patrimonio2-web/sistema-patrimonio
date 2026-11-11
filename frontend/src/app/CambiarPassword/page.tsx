"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { cambiarPasswordPerfil, logout } from "@/services/authService";
import { clearAuthUser, getAuthUser } from "@/services/authRole";
import { PASSWORD_REQUIREMENTS, passwordPolicyError } from "@/lib/passwordPolicy";

export default function CambiarPasswordPage() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const policyError = passwordPolicyError(nueva);
    if (policyError) return setError(policyError);
    if (nueva !== confirmacion) return setError("La confirmacion no coincide.");

    try {
      setSaving(true);
      setError("");
      await cambiarPasswordPerfil(actual, nueva, confirmacion);
      const { role } = getAuthUser();
      window.location.replace(role === "matafuegos" ? "/matafuegos" : "/Home");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuthUser();
      window.location.replace("/Login");
    }
  };

  const fields = [
    { id: "actual", label: "Contraseña actual", value: actual, setter: setActual },
    { id: "nueva", label: "Nueva contraseña", value: nueva, setter: setNueva },
    { id: "confirmacion", label: "Confirmar contraseña", value: confirmacion, setter: setConfirmacion },
  ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 text-slate-950 dark:bg-[#07111f] dark:text-white">
      <section className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 bg-slate-950 px-6 py-6 text-white dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500 text-slate-950">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-cyan-300">Seguridad de la cuenta</p>
              <h1 className="mt-1 text-2xl font-black">Actualizá tu contraseña</h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Para continuar en el sistema tenés que crear una contraseña personal y segura.
          </p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
            {PASSWORD_REQUIREMENTS.map((requirement) => (
              <span key={requirement} className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                {requirement}
              </span>
            ))}
          </div>

          {fields.map(({ id, label, value, setter }) => (
            <label key={id} className="block text-sm font-bold text-slate-800 dark:text-slate-100">
              {label}
              <span className="relative mt-2 block">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id={id}
                  type={visible[id] ? "text" : "password"}
                  autoComplete="off"
                  value={value}
                  onChange={(event) => setter(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-12 text-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-cyan-400 dark:focus:ring-cyan-950"
                  required
                />
                <button
                  type="button"
                  onClick={() => setVisible((current) => ({ ...current, [id]: !current[id] }))}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label={visible[id] ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
                  title={visible[id] ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {visible[id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>
          ))}

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </p>
          )}

          <button type="submit" disabled={saving} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 text-sm font-black text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400">
            <ShieldCheck className="h-5 w-5" />
            {saving ? "Actualizando..." : "Actualizar y continuar"}
          </button>
          <button type="button" onClick={handleLogout} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">
            <LogOut className="h-4 w-4" />
            Cerrar sesion
          </button>
        </form>
      </section>
    </main>
  );
}
