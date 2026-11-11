export function isVirtualSubdependenciaName(nombre?: string | null): boolean {
  return /\bvirtual\b/i.test(nombre?.trim() || "");
}
