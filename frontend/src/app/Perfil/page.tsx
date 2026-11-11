"use client";

import { type FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, KeyRound, LogIn, Plus, Save, ShieldCheck, UserRound, UsersRound, X } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { Wrapper } from "@/components";
import {
  cambiarPasswordPerfil,
  finalizarImpersonacion,
  guardarPerfil,
  iniciarImpersonacion,
  listarUsuariosImpersonables,
  obtenerPerfil,
  type ImpersonationTarget,
  type PerfilUsuario,
} from "@/services/authService";
import { getAuthUser, setAuthUser } from "@/services/authRole";
import { passwordPolicyError } from "@/lib/passwordPolicy";
import { crearUsuarioAdmin } from "@/services/usuariosAdminService";

const SUPERVISED_ACCOUNTS = ["Comisario", "CONTINGENCIA1", "CONTINGENCIA2", "dante", "VICEGOBERNACION"];

function accountMatches(expected: string, actual: string) {
  const normalized = actual.trim().toLowerCase();
  if (expected === "CONTINGENCIA1") return normalized === "contingencia1" || normalized === "contigencia1";
  if (expected === "CONTINGENCIA2") return normalized === "contingencia2" || normalized === "contigencia2";
  return normalized === expected.toLowerCase();
}

const fieldClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950 dark:disabled:bg-slate-900/60";

const emptyProfileForm = {
  nombre: "",
  apellido: "",
  username: "",
};

const emptyPasswordForm = {
  actual: "",
  nueva: "",
  confirmacion: "",
};

function roleLabel(role?: string) {
  if (role === "superadmin") return "Super admin";
  if (role === "matafuegos") return "Control matafuegos";
  if (role === "comisario") return "Comisario";
  if (role === "viewer") return "Solo lectura";
  if (role === "admin") return "Administrador";
  return "Usuario";
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function Profile() {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordVisibility, setPasswordVisibility] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [targets, setTargets] = useState<ImpersonationTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<ImpersonationTarget | null>(null);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [showViceModal, setShowViceModal] = useState(false);
  const [vicePassword, setVicePassword] = useState("");
  const [creatingVice, setCreatingVice] = useState(false);
  const readOnlyProfile = perfil?.role === "matafuegos" || perfil?.role === "comisario" || Boolean(perfil?.impersonating);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await obtenerPerfil();
        if (cancelled) return;
        setPerfil(data);
        setProfileForm({
          nombre: data.nombre ?? "",
          apellido: data.apellido ?? "",
          username: data.username,
        });
        if (data.role === "superadmin" && !data.impersonating) {
          setTargets(await listarUsuariosImpersonables());
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) toast.error(errorText(error, "No se pudo cargar el perfil."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const enterTargetAccount = async () => {
    if (!selectedTarget) return;
    try {
      setSwitchingAccount(true);
      const session = await iniciarImpersonacion(selectedTarget.username);
      setAuthUser(session.username, session.role);
      window.location.assign(session.role === "matafuegos" ? "/matafuegos" : "/Home");
    } catch (error) {
      toast.error(errorText(error, "No se pudo abrir la cuenta."));
      setSwitchingAccount(false);
    }
  };

  const returnToAdmin = async () => {
    try {
      setSwitchingAccount(true);
      const session = await finalizarImpersonacion();
      setAuthUser(session.username, session.role);
      window.location.assign("/Perfil");
    } catch (error) {
      toast.error(errorText(error, "No se pudo volver a tu cuenta."));
      setSwitchingAccount(false);
    }
  };

  const createViceAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const policyError = passwordPolicyError(vicePassword);
    if (policyError) return toast.error(policyError);
    try {
      setCreatingVice(true);
      await crearUsuarioAdmin({ username: "VICEGOBERNACION", nombre: "Vicegobernación", password: vicePassword, role: "viewer", activo: true });
      setTargets(await listarUsuariosImpersonables());
      setVicePassword("");
      setShowViceModal(false);
      toast.success("Cuenta VICEGOBERNACION creada.");
    } catch (error) {
      toast.error(errorText(error, "No se pudo crear la cuenta."));
    } finally {
      setCreatingVice(false);
    }
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profileForm.username.trim()) {
      toast.error("El usuario es obligatorio.");
      return;
    }

    try {
      setSavingProfile(true);
      const saved = await guardarPerfil(profileForm);
      const currentRole = getAuthUser().role;
      setAuthUser(saved.username, currentRole === "viewer" ? currentRole : saved.role);
      setPerfil(saved);
      setProfileForm({
        nombre: saved.nombre ?? "",
        apellido: saved.apellido ?? "",
        username: saved.username,
      });
      toast.success("Perfil guardado.");
    } catch (error) {
      toast.error(errorText(error, "No se pudo guardar el perfil."));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordForm.nueva !== passwordForm.confirmacion) {
      toast.error("La confirmacion no coincide.");
      return;
    }
    const policyError = passwordPolicyError(passwordForm.nueva);
    if (policyError) {
      toast.error(policyError);
      return;
    }

    try {
      setSavingPassword(true);
      await cambiarPasswordPerfil(
        passwordForm.actual,
        passwordForm.nueva,
        passwordForm.confirmacion
      );
      setPasswordForm(emptyPasswordForm);
      toast.success("Contraseña actualizada.");
    } catch (error) {
      toast.error(errorText(error, "No se pudo cambiar la contraseña."));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Wrapper>
      <Toaster position="top-center" />
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-800 ring-1 ring-cyan-500/15 dark:bg-cyan-950/60 dark:text-cyan-100">
                <UserRound className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">
                  Cuenta
                </p>
                <h1 className="truncate text-2xl font-bold text-slate-950 dark:text-white">
                  {perfil?.nombre || perfil?.apellido
                    ? `${perfil?.nombre ?? ""} ${perfil?.apellido ?? ""}`.trim()
                    : perfil?.username || "Perfil"}
                </h1>
                <p className="mt-1 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {perfil?.username ? `@${perfil.username}` : "Cargando usuario..."}
                </p>
              </div>
            </div>

            <div className="inline-flex h-11 items-center gap-2 self-start rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 sm:self-center">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
              {roleLabel(perfil?.role)}
            </div>
          </div>
        </section>

        {perfil?.impersonating && (
          <section className="mt-5 flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-black text-amber-950 dark:text-amber-100">Vista temporal de @{perfil.username}</p><p className="text-sm text-amber-800 dark:text-amber-200">Estás viendo el sistema con los permisos de esta cuenta.</p></div>
            <button type="button" onClick={returnToAdmin} disabled={switchingAccount} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-amber-700 px-4 text-sm font-black text-white hover:bg-amber-800 disabled:opacity-60"><ArrowLeft className="h-4 w-4" />Volver a mi perfil</button>
          </section>
        )}

        {perfil?.role === "superadmin" && ["facu", "hernan"].includes(perfil.username.trim().toLowerCase()) && !perfil.impersonating && (
          <section className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-6">
            <div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200"><UsersRound className="h-5 w-5" /></span><div><h2 className="text-lg font-black text-slate-950 dark:text-white">Cuentas supervisadas</h2><p className="text-sm text-slate-500 dark:text-slate-400">Ingresá temporalmente para comprobar exactamente qué puede ver cada usuario.</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {SUPERVISED_ACCOUNTS.map((expected) => {
                const target = targets.find((item) => accountMatches(expected, item.username));
                return <article key={expected} className="flex min-h-36 flex-col rounded-md border border-slate-200 p-4 dark:border-slate-800"><p className="break-words text-sm font-black text-slate-950 dark:text-white">{expected}</p><p className="mt-1 text-xs font-semibold text-slate-500">{target ? roleLabel(target.role) : "Cuenta pendiente"}</p><div className="mt-auto pt-4">{target ? <button type="button" disabled={!target.activo} onClick={() => setSelectedTarget(target)} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-cyan-700 px-3 text-xs font-black text-white hover:bg-cyan-800 disabled:bg-slate-400"><LogIn className="h-4 w-4" />Ver como usuario</button> : expected === "VICEGOBERNACION" ? <button type="button" onClick={() => setShowViceModal(true)} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-cyan-700 px-3 text-xs font-black text-cyan-800 hover:bg-cyan-50 dark:text-cyan-200 dark:hover:bg-cyan-950"><Plus className="h-4 w-4" />Crear cuenta</button> : <span className="text-xs font-bold text-rose-600">No encontrada</span>}</div></article>;
              })}
            </div>
          </section>
        )}

        <div className={`mt-5 grid gap-5 ${!perfil || readOnlyProfile ? "" : "lg:grid-cols-[1.1fr_0.9fr]"}`}>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                Datos del perfil
              </h2>
            </div>

            {!perfil ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {loading ? "Cargando perfil..." : "No se pudieron mostrar los datos del perfil."}
              </p>
            ) : readOnlyProfile ? (
              <dl className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {[
                  ["Nombre", perfil.nombre || "No informado"],
                  ["Apellido", perfil.apellido || "No informado"],
                  ["Usuario", perfil.username],
                ].map(([label, value]) => (
                  <div key={label} className="grid gap-1 py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
                    <dt className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{label}</dt>
                    <dd className="break-words text-sm font-semibold text-slate-900 dark:text-white">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={profileForm.nombre}
                      disabled={loading || savingProfile}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, nombre: event.target.value }))
                      }
                      className={fieldClass}
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                      Apellido
                    </label>
                    <input
                      type="text"
                      value={profileForm.apellido}
                      disabled={loading || savingProfile}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, apellido: event.target.value }))
                      }
                      className={fieldClass}
                      maxLength={100}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                    Usuario
                  </label>
                  <input
                    type="text"
                    autoComplete="username"
                    value={profileForm.username}
                    disabled={loading || savingProfile}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, username: event.target.value }))
                    }
                    className={fieldClass}
                    maxLength={50}
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={loading || savingProfile}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 text-sm font-bold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-600 dark:hover:bg-cyan-700"
                  >
                    <Save className="h-4 w-4" />
                    {savingProfile ? "Guardando..." : "Guardar perfil"}
                  </button>
                </div>
              </form>
            )}
          </section>

          {perfil && !readOnlyProfile && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                  <KeyRound className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                  Cambiar contraseña
                </h2>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                    Contraseña actual
                  </label>
                  <div className="relative">
                  <input
                    type={passwordVisibility.actual ? "text" : "password"}
                    autoComplete="current-password"
                    value={passwordForm.actual}
                    disabled={loading || savingPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, actual: event.target.value }))
                    }
                    className={`${fieldClass} pr-12`}
                  />
                  <PasswordVisibilityButton field="actual" visible={passwordVisibility.actual} setVisible={setPasswordVisibility} />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                  <input
                    type={passwordVisibility.nueva ? "text" : "password"}
                    autoComplete="new-password"
                    value={passwordForm.nueva}
                    disabled={loading || savingPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, nueva: event.target.value }))
                    }
                    className={`${fieldClass} pr-12`}
                  />
                  <PasswordVisibilityButton field="nueva" visible={passwordVisibility.nueva} setVisible={setPasswordVisibility} />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                  <input
                    type={passwordVisibility.confirmacion ? "text" : "password"}
                    autoComplete="new-password"
                    value={passwordForm.confirmacion}
                    disabled={loading || savingPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmacion: event.target.value,
                      }))
                    }
                    className={`${fieldClass} pr-12`}
                  />
                  <PasswordVisibilityButton field="confirmacion" visible={passwordVisibility.confirmacion} setVisible={setPasswordVisibility} />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={loading || savingPassword}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:border-emerald-700"
                  >
                    <KeyRound className="h-4 w-4" />
                    {savingPassword ? "Guardando..." : "Actualizar contraseña"}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>

      {selectedTarget && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-4" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-md bg-white p-5 shadow-2xl dark:bg-slate-950"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase text-cyan-700">Vista temporal</p><h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">¿Ir al perfil de {selectedTarget.username}?</h2></div><button type="button" onClick={() => setSelectedTarget(null)} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700"><X className="h-4 w-4" /></button></div><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Vas a navegar con sus permisos y ver únicamente lo que esa cuenta puede consultar. Podrás volver desde Perfil.</p><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setSelectedTarget(null)} className="h-11 rounded-md border border-slate-300 text-sm font-bold dark:border-slate-700">Cancelar</button><button type="button" onClick={enterTargetAccount} disabled={switchingAccount} className="h-11 rounded-md bg-cyan-700 text-sm font-black text-white hover:bg-cyan-800 disabled:opacity-60">{switchingAccount ? "Ingresando..." : "Continuar"}</button></div></div></div>}

      {showViceModal && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-4" role="dialog" aria-modal="true"><form onSubmit={createViceAccount} className="w-full max-w-md rounded-md bg-white p-5 shadow-2xl dark:bg-slate-950"><h2 className="text-xl font-black text-slate-950 dark:text-white">Crear VICEGOBERNACION</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Definí una contraseña provisoria. Al iniciar sesión, el usuario deberá reemplazarla.</p><label className="mt-4 block text-xs font-bold uppercase text-slate-600">Contraseña provisoria</label><div className="relative mt-1.5"><input type={passwordVisibility.vice ? "text" : "password"} autoComplete="new-password" value={vicePassword} onChange={(event) => setVicePassword(event.target.value)} className={`${fieldClass} pr-12`} /><PasswordVisibilityButton field="vice" visible={passwordVisibility.vice} setVisible={setPasswordVisibility} /></div><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setShowViceModal(false)} className="h-11 rounded-md border border-slate-300 text-sm font-bold dark:border-slate-700">Cancelar</button><button type="submit" disabled={creatingVice} className="h-11 rounded-md bg-cyan-700 text-sm font-black text-white disabled:opacity-60">{creatingVice ? "Creando..." : "Crear cuenta"}</button></div></form></div>}
    </Wrapper>
  );
}

function PasswordVisibilityButton({
  field,
  visible,
  setVisible,
}: {
  field: string;
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  return (
    <button
      type="button"
      onClick={() => setVisible((current) => ({ ...current, [field]: !current[field] }))}
      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
