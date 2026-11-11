const DEFAULT_RETURN_PATH = "/listados";
const SUBDEPENDENCIA_PREFIX = "/subdependencia/";

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function splitPathTrailer(value: string) {
  const queryIndex = value.indexOf("?");
  const hashIndex = value.indexOf("#");
  const indexes = [queryIndex, hashIndex].filter((index) => index >= 0);
  const splitIndex = indexes.length ? Math.min(...indexes) : -1;

  if (splitIndex === -1) {
    return { pathname: value, trailer: "" };
  }

  return {
    pathname: value.slice(0, splitIndex),
    trailer: value.slice(splitIndex),
  };
}

export function buildSubdependenciaPath(nombre: string, ubicacionId?: string | number | null) {
  const idQuery =
    ubicacionId !== undefined && ubicacionId !== null && String(ubicacionId).trim() !== ""
      ? `?id=${encodeURIComponent(String(ubicacionId))}`
      : "";

  return `${SUBDEPENDENCIA_PREFIX}${encodeURIComponent(nombre.trim())}${idQuery}`;
}

export function normalizeReturnPath(value?: string | null, fallback = DEFAULT_RETURN_PATH) {
  const raw = (value ?? "").trim();

  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }

  const { pathname, trailer } = splitPathTrailer(raw);

  if (pathname.startsWith(SUBDEPENDENCIA_PREFIX)) {
    const rawName = pathname.slice(SUBDEPENDENCIA_PREFIX.length);

    if (!rawName) {
      return fallback;
    }

    return `${SUBDEPENDENCIA_PREFIX}${encodeURIComponent(safeDecodeURIComponent(rawName))}${trailer}`;
  }

  return raw;
}
