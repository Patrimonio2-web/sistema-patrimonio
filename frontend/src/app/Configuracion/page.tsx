"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Copy,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { Wrapper } from "@/components";
import { getAuthUser, isSuperAdmin } from "@/services/authRole";
import {
  actualizarUsuarioAdmin,
  crearUsuarioAdmin,
  listarUsuariosAdmin,
  resetearPasswordUsuarioAdmin,
  type UsuarioAdmin,
  type UsuarioAdminRole,
} from "@/services/usuariosAdminService";
import { passwordPolicyError } from "@/lib/passwordPolicy";

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-950";

const emptyCreateForm = {
  username: "",
  nombre: "",
  apellido: "",
  password: "",
  role: "admin" as "admin" | "viewer" | "matafuegos" | "comisario",
};

function roleLabel(role: UsuarioAdminRole) {
  if (role === "superadmin") return "Super admin";
  if (role === "matafuegos") return "Control matafuegos";
  if (role === "comisario") return "Comisario";
  if (role === "viewer") return "Solo ver";
  return "Admin carga";
}

function roleClasses(role: UsuarioAdminRole) {
  if (role === "superadmin") {
    return "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100";
  }
  if (role === "viewer") {
    return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";
  }
  if (role === "matafuegos") {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100";
  }
  if (role === "comisario") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100";
  }
  return "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-100";
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function userDisplayName(user: UsuarioAdmin) {
  const fullName = `${user.nombre || ""} ${user.apellido || ""}`.trim();
  return fullName || user.username;
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function generateTemporaryPassword() {
  const groups = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnopqrstuvwxyz",
    "23456789",
    "!@#$%&*?",
  ];
  const all = groups.join("");
  const randomIndex = (limit: number) => {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] % limit;
  };
  const characters = groups.map((group) => group[randomIndex(group.length)]);
  while (characters.length < 12) {
    characters.push(all[randomIndex(all.length)]);
  }
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [
      characters[swapIndex],
      characters[index],
    ];
  }
  return characters.join("");
}

export default function Configuration() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [resetTarget, setResetTarget] = useState<UsuarioAdmin | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const canManage = isSuperAdmin();
  const { username } = getAuthUser();

  useEffect(() => {
    if (!canManage) {
      toast.error("Solo super admin puede abrir esta seccion.");
      router.replace("/Home");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await listarUsuariosAdmin();
        if (!cancelled) setUsuarios(data);
      } catch (error) {
        if (!cancelled) toast.error(errorText(error, "No se pudieron cargar los usuarios."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canManage, router]);

  const usuariosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    if (!query) return usuarios;
    return usuarios.filter((user) =>
      [user.username, user.nombre, user.apellido, roleLabel(user.role)]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [busqueda, usuarios]);

  const stats = useMemo(() => {
    return {
      total: usuarios.length,
      activos: usuarios.filter((user) => user.activo).length,
      admins: usuarios.filter((user) => user.role === "admin").length,
      viewers: usuarios.filter((user) =>
        user.role === "viewer" || user.role === "comisario"
      ).length,
      matafuegos: usuarios.filter((user) => user.role === "matafuegos").length,
    };
  }, [usuarios]);

  const refreshUsers = async () => {
    try {
      setLoading(true);
      setUsuarios(await listarUsuariosAdmin());
    } catch (error) {
      toast.error(errorText(error, "No se pudieron cargar los usuarios."));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createForm.username.trim() || !createForm.password.trim()) {
      toast.error("Usuario y contraseña son obligatorios.");
      return;
    }
    const createPasswordError = passwordPolicyError(createForm.password);
    if (createPasswordError) {
      toast.error(createPasswordError);
      return;
    }

    try {
      setCreating(true);
      const creado = await crearUsuarioAdmin({ ...createForm, activo: true });
      setUsuarios((prev) => [...prev, creado].sort((a, b) => a.username.localeCompare(b.username)));
      setCreateForm(emptyCreateForm);
      toast.success("Usuario creado.");
    } catch (error) {
      toast.error(errorText(error, "No se pudo crear el usuario."));
    } finally {
      setCreating(false);
    }
  };

  const updateUser = async (
    user: UsuarioAdmin,
    patch: Partial<Pick<UsuarioAdmin, "activo" | "role">>
  ) => {
    try {
      setSavingId(user.id);
      const actualizado = await actualizarUsuarioAdmin(user.id, {
        username: user.username,
        nombre: user.nombre,
        apellido: user.apellido,
        role: patch.role ?? user.role,
        activo: patch.activo ?? user.activo,
      });
      setUsuarios((prev) =>
        prev.map((item) => (item.id === actualizado.id ? actualizado : item))
      );
      toast.success("Usuario actualizado.");
    } catch (error) {
      toast.error(errorText(error, "No se pudo actualizar el usuario."));
    } finally {
      setSavingId(null);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetTarget) return;
    const resetPasswordError = passwordPolicyError(resetPassword);
    if (resetPasswordError) {
      toast.error(resetPasswordError);
      return;
    }

    try {
      setResetSaving(true);
      const result = await resetearPasswordUsuarioAdmin(
        resetTarget.id,
        resetPassword
      );
      setUsuarios((prev) =>
        prev.map((user) =>
          user.id === resetTarget.id
            ? { ...user, password_change_required: true }
            : user
        )
      );
      setResetTarget(null);
      setResetPassword("");
      setResetPasswordVisible(false);
      toast.success(
        `Clave provisoria asignada a ${result.username}. Debera cambiarla al ingresar.`
      );
    } catch (error) {
      toast.error(errorText(error, "No se pudo actualizar la contraseña."));
    } finally {
      setResetSaving(false);
    }
  };

  if (!canManage) {
    return (
      <Wrapper>
        <Toaster position="top-center" />
        <div className="mx-auto w-full max-w-4xl px-4 py-10">
          <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <ShieldCheck className="mx-auto h-10 w-10 text-slate-400" />
            <h1 className="mt-3 text-xl font-bold text-slate-950 dark:text-white">
              Acceso restringido
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              Esta seccion es solo para super admin.
            </p>
          </section>
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <Toaster position="top-center" />
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-md border border-slate-200 bg-white px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">
                Super admin
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                Gestion de usuarios
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500 dark:text-slate-400">
                Alta de cuentas, estado de acceso y permisos de carga o solo lectura.
              </p>
            </div>

            <div className="inline-flex h-11 items-center gap-2 self-start rounded-md border border-violet-200 bg-violet-50 px-3 text-sm font-bold text-violet-800 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100 lg:self-center">
              <ShieldCheck className="h-4 w-4" />
              {username ?? "superadmin"}
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Usuarios" value={stats.total} icon={<UsersRound />} />
          <StatCard label="Activos" value={stats.activos} icon={<ShieldCheck />} />
          <StatCard label="Admin carga" value={stats.admins} icon={<UserPlus />} />
          <StatCard label="Solo ver" value={stats.viewers} icon={<Eye />} />
          <StatCard label="Matafuegos" value={stats.matafuegos} icon={<ShieldCheck />} />
        </div>

        <section className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                Crear usuario
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Los usuarios nuevos pueden quedar como admin de carga o solo lectura.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_180px_160px]">
            <input
              className={inputClass}
              placeholder="Usuario"
              value={createForm.username}
              maxLength={50}
              disabled={creating}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, username: event.target.value }))
              }
            />
            <input
              className={inputClass}
              placeholder="Nombre"
              value={createForm.nombre}
              maxLength={100}
              disabled={creating}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, nombre: event.target.value }))
              }
            />
            <input
              className={inputClass}
              placeholder="Apellido"
              value={createForm.apellido}
              maxLength={100}
              disabled={creating}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, apellido: event.target.value }))
              }
            />
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              placeholder="Contraseña inicial"
              value={createForm.password}
              disabled={creating}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, password: event.target.value }))
              }
            />
            <select
              className={inputClass}
              value={createForm.role}
              disabled={creating}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  role: event.target.value as
                    | "admin"
                    | "viewer"
                    | "matafuegos"
                    | "comisario",
                }))
              }
            >
              <option value="admin">Admin carga</option>
              <option value="viewer">Solo ver</option>
              <option value="matafuegos">Control matafuegos</option>
              <option value="comisario">Comisario (solo lectura)</option>
            </select>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" />
              {creating ? "Creando..." : "Crear"}
            </button>
          </form>
        </section>

        <section className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por usuario, nombre o rol"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                className={`${inputClass} pl-10`}
              />
            </div>
            <button
              type="button"
              onClick={refreshUsers}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 transition hover:border-cyan-300 hover:bg-white hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-500 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Alta</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((user) => (
                  <UsuarioRow
                    key={user.id}
                    user={user}
                    saving={savingId === user.id}
                    onRoleChange={(role) => updateUser(user, { role })}
                    onToggleActive={() => updateUser(user, { activo: !user.activo })}
                    onResetPassword={() => {
                      setResetTarget(user);
                      setResetPassword("");
                      setResetPasswordVisible(false);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {usuariosFiltrados.map((user) => (
              <UsuarioCard
                key={user.id}
                user={user}
                saving={savingId === user.id}
                onRoleChange={(role) => updateUser(user, { role })}
                onToggleActive={() => updateUser(user, { activo: !user.activo })}
                onResetPassword={() => {
                  setResetTarget(user);
                  setResetPassword("");
                  setResetPasswordVisible(false);
                }}
              />
            ))}
          </div>

          {!loading && usuariosFiltrados.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No hay usuarios para esa busqueda.
            </div>
          )}

          {loading && (
            <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Cargando usuarios...
            </div>
          )}
        </section>
      </div>

      {resetTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <form
            onSubmit={handleResetPassword}
            className="w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-100">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                  Asignar clave provisoria
                </h2>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {resetTarget.username}
                </p>
              </div>
            </div>

            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              Al ingresar con esta clave, el usuario deberá crear una contraseña
              personal antes de continuar.
            </p>

            <label className="mt-4 block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
              Clave provisoria
              <div className="relative mt-1.5">
                <input
                  className={`${inputClass} pr-12`}
                  type={resetPasswordVisible ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Minimo 8 caracteres"
                  value={resetPassword}
                  maxLength={128}
                  autoFocus
                  disabled={resetSaving}
                  onChange={(event) => setResetPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setResetPasswordVisible((current) => !current)}
                  disabled={resetSaving}
                  className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label={resetPasswordVisible ? "Ocultar clave" : "Mostrar clave"}
                  title={resetPasswordVisible ? "Ocultar clave" : "Mostrar clave"}
                >
                  {resetPasswordVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setResetPassword(generateTemporaryPassword());
                  setResetPasswordVisible(true);
                }}
                disabled={resetSaving}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 text-sm font-bold text-cyan-800 transition hover:border-cyan-400 hover:bg-cyan-100 disabled:opacity-50 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-100"
              >
                <KeyRound className="h-4 w-4" />
                Generar provisoria
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!resetPassword) {
                    toast.error("Primero genera o ingresa una clave provisoria.");
                    return;
                  }
                  try {
                    await navigator.clipboard.writeText(resetPassword);
                    toast.success("Clave provisoria copiada.");
                  } catch {
                    toast.error("No se pudo copiar la clave.");
                  }
                }}
                disabled={resetSaving || !resetPassword}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <Copy className="h-4 w-4" />
                Copiar
              </button>
            </div>

            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              Debe incluir al menos 8 caracteres, una letra, un numero y un
              caracter especial.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setResetTarget(null);
                  setResetPassword("");
                  setResetPasswordVisible(false);
                }}
                disabled={resetSaving}
                className="h-10 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={resetSaving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {resetSaving ? "Guardando..." : "Asignar provisoria"}
              </button>
            </div>
          </form>
        </div>
      )}
    </Wrapper>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: JSX.Element;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            {value}
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
          {icon}
        </span>
      </div>
    </div>
  );
}

function RoleButtons({
  user,
  saving,
  onRoleChange,
}: {
  user: UsuarioAdmin;
  saving: boolean;
  onRoleChange: (role: UsuarioAdminRole) => void;
}) {
  if (user.protegido || user.role === "superadmin") {
    return (
      <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-bold ${roleClasses(user.role)}`}>
        {roleLabel(user.role)}
      </span>
    );
  }

  return (
    <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
      {(["admin", "viewer", "matafuegos", "comisario"] as UsuarioAdminRole[]).map((role) => (
        <button
          key={role}
          type="button"
          disabled={saving || user.role === role}
          onClick={() => onRoleChange(role)}
          className={`h-8 rounded px-3 text-xs font-bold transition disabled:cursor-default ${
            user.role === role
              ? "bg-white text-cyan-800 shadow-sm dark:bg-slate-800 dark:text-cyan-100"
              : "text-slate-600 hover:bg-white hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-cyan-100"
          }`}
        >
          {roleLabel(role)}
        </button>
      ))}
    </div>
  );
}

function ActionButtons({
  user,
  saving,
  onToggleActive,
  onResetPassword,
}: {
  user: UsuarioAdmin;
  saving: boolean;
  onToggleActive: () => void;
  onResetPassword: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        onClick={onToggleActive}
        disabled={saving || user.protegido}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-200 dark:hover:border-cyan-500 dark:hover:text-cyan-100"
      >
        <Lock className="h-4 w-4" />
        {user.activo ? "Desactivar" : "Activar"}
      </button>
      <button
        type="button"
        onClick={onResetPassword}
        disabled={saving}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-200 dark:hover:border-cyan-500 dark:hover:text-cyan-100"
      >
        <KeyRound className="h-4 w-4" />
        Contraseña
      </button>
    </div>
  );
}

function UsuarioRow({
  user,
  saving,
  onRoleChange,
  onToggleActive,
  onResetPassword,
}: {
  user: UsuarioAdmin;
  saving: boolean;
  onRoleChange: (role: UsuarioAdminRole) => void;
  onToggleActive: () => void;
  onResetPassword: () => void;
}) {
  return (
    <tr className="border-b border-slate-100 align-middle last:border-0 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-900/60">
      <td className="px-4 py-4">
        <p className="font-bold text-slate-950 dark:text-white">{userDisplayName(user)}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          @{user.username}
        </p>
      </td>
      <td className="px-4 py-4">
        <RoleButtons user={user} saving={saving} onRoleChange={onRoleChange} />
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col items-start gap-1.5">
          <span
            className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-bold ${
              user.activo
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
                : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100"
            }`}
          >
            {user.activo ? "Activo" : "Inactivo"}
          </span>
          {user.password_change_required && (
            <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              Cambio de clave pendiente
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-300">
        {formatDate(user.fecha_creacion)}
      </td>
      <td className="px-4 py-4">
        <ActionButtons
          user={user}
          saving={saving}
          onToggleActive={onToggleActive}
          onResetPassword={onResetPassword}
        />
      </td>
    </tr>
  );
}

function UsuarioCard({
  user,
  saving,
  onRoleChange,
  onToggleActive,
  onResetPassword,
}: {
  user: UsuarioAdmin;
  saving: boolean;
  onRoleChange: (role: UsuarioAdminRole) => void;
  onToggleActive: () => void;
  onResetPassword: () => void;
}) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-slate-950 dark:text-white">
            {userDisplayName(user)}
          </h3>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
            @{user.username}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-bold ${
            user.activo
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100"
          }`}
        >
          {user.activo ? "Activo" : "Inactivo"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <RoleButtons user={user} saving={saving} onRoleChange={onRoleChange} />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Alta {formatDate(user.fecha_creacion)}
        </p>
      </div>

      {user.password_change_required && (
        <p className="mt-3 inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          Cambio de clave pendiente
        </p>
      )}

      <div className="mt-4">
        <ActionButtons
          user={user}
          saving={saving}
          onToggleActive={onToggleActive}
          onResetPassword={onResetPassword}
        />
      </div>
    </article>
  );
}
