// src/services/authRole.ts
export type UserRole =
  | "superadmin"
  | "admin"
  | "viewer"
  | "matafuegos"
  | "comisario";

const ROLE_KEY = "auth.role";
const USER_KEY = "auth.user";
const LEGACY_USER_KEY = "username";
const PASSWORD_CHANGE_REQUIRED_KEY = "auth.password_change_required";
const AUTH_VERIFIED_AT_KEY = "auth.verified_at";
const SUPERADMIN_USERS = new Set(["hernan", "facu"]);
const VIEWER_USERS = new Set(["dante", "vicegobernacion"]);
const MATAFUEGOS_USERS = new Set(["contingencia1", "contingencia2"]);
const COMISARIO_USERS = new Set(["comisario"]);
const PUBLIC_CONSULTATION_USERS = new Set(["mauri", "luciano", "nahun"]);

function normalizeRole(username: string | null, role?: string | null): UserRole {
  const cleanUsername = (username ?? "").trim().toLowerCase();
  const cleanRole = (role ?? "").trim().toLowerCase();

  if (SUPERADMIN_USERS.has(cleanUsername)) {
    return "superadmin";
  }
  if (MATAFUEGOS_USERS.has(cleanUsername)) {
    return "matafuegos";
  }
  if (cleanRole === "superadmin") {
    return "superadmin";
  }
  if (cleanRole === "matafuegos") {
    return "matafuegos";
  }
  if (cleanRole === "comisario" || COMISARIO_USERS.has(cleanUsername)) {
    return "comisario";
  }
  if (cleanRole === "viewer" || VIEWER_USERS.has(cleanUsername)) {
    return "viewer";
  }
  return "admin";
}

export function setAuthUser(
  username: string,
  role?: string | null,
  passwordChangeRequired?: boolean
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, username);
  localStorage.setItem(LEGACY_USER_KEY, username);
  localStorage.setItem(ROLE_KEY, normalizeRole(username, role));
  localStorage.setItem(AUTH_VERIFIED_AT_KEY, String(Date.now()));
  if (typeof passwordChangeRequired === "boolean") {
    localStorage.setItem(
      PASSWORD_CHANGE_REQUIRED_KEY,
      String(passwordChangeRequired)
    );
  }
}

export function setPasswordChangeRequired(required: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PASSWORD_CHANGE_REQUIRED_KEY, String(required));
}

export function getAuthUser(): {
  username: string | null;
  role: UserRole;
  passwordChangeRequired: boolean | null;
  verifiedAt: number | null;
} {
  if (typeof window === "undefined") {
    return {
      username: null,
      role: "admin",
      passwordChangeRequired: null,
      verifiedAt: null,
    };
  }
  const username = localStorage.getItem(USER_KEY) ?? localStorage.getItem(LEGACY_USER_KEY);
  const role = normalizeRole(username, localStorage.getItem(ROLE_KEY));
  const savedRequirement = localStorage.getItem(PASSWORD_CHANGE_REQUIRED_KEY);
  const passwordChangeRequired =
    savedRequirement === "true"
      ? true
      : savedRequirement === "false"
        ? false
        : null;
  const verifiedAtValue = Number(localStorage.getItem(AUTH_VERIFIED_AT_KEY));
  const verifiedAt = Number.isFinite(verifiedAtValue) && verifiedAtValue > 0
    ? verifiedAtValue
    : null;
  return { username, role, passwordChangeRequired, verifiedAt };
}

export const isViewer = () => {
  const { role } = getAuthUser();
  return role === "viewer" || role === "comisario";
};

export const isAdmin = () => {
  const { role } = getAuthUser();
  return role === "admin" || role === "superadmin";
};

export const isSuperAdmin = () => {
  const { role } = getAuthUser();
  return role === "superadmin";
};

export const isMatafuegosManager = () => {
  const { role } = getAuthUser();
  return role === "matafuegos";
};

export const isComisario = () => {
  const { role } = getAuthUser();
  return role === "comisario";
};

export const canManagePublicConsultations = () => {
  const { username, role } = getAuthUser();
  return role === "superadmin" || PUBLIC_CONSULTATION_USERS.has((username ?? "").trim().toLowerCase());
};

export const canEditMatafuegos = () => {
  const { role } = getAuthUser();
  return role === "superadmin" || role === "admin" || role === "matafuegos";
};

export const canAdminMatafuegos = () => isAdmin();

export const canDeleteMobiliario = () => {
  const { username } = getAuthUser();
  return (username ?? "").trim().toLowerCase() === "hernan";
};

export const canPreviewPlanillasAltas = () => {
  const { username } = getAuthUser();
  return (username ?? "").trim().toLowerCase() !== "dante";
};

export const canAccessPurchaseReports = () => {
  const { username, role } = getAuthUser();
  return role === "admin" || role === "superadmin" || (username ?? "").trim().toLowerCase() === "dante";
};

export function clearAuthUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(PASSWORD_CHANGE_REQUIRED_KEY);
  localStorage.removeItem(AUTH_VERIFIED_AT_KEY);
}
