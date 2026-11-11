export type PublicDirectoryConfig = {
  slug: string;
  title: string;
  description: string;
  anexoId: number;
  anexoName: string;
  imageSrc: string;
  scopeLabel: string;
  subdependenciaIds?: number[];
};

export const PUBLIC_DIRECTORIES: PublicDirectoryConfig[] = [
  {
    slug: "residencia-oficial-2",
    title: "Residencia Oficial N\u00ba 2",
    description: "Todas las oficinas y espacios de la Residencia.",
    anexoId: 1000,
    anexoName: "Residencia Oficial N\u00ba 2",
    imageSrc: "/directorios/residencia-hero.png",
    scopeLabel: "Anexo completo",
  },
  {
    slug: "observatorio",
    title: "Observatorio",
    description: "Todas las dependencias del Anexo X.",
    anexoId: 1101,
    anexoName: "Anexo X: Observatorio",
    imageSrc: "/directorios/observatorio-hero.png",
    scopeLabel: "Anexo completo",
  },
  {
    slug: "recinto",
    title: "Recinto",
    description: "Todos los espacios del Recinto legislativo.",
    anexoId: 1200,
    anexoName: "Recinto",
    imageSrc: "/directorios/recinto-hero.png",
    scopeLabel: "Anexo completo",
  },
  {
    slug: "centro-de-operaciones",
    title: "Centro de Operaciones",
    description: "Todas las oficinas del Centro de Operaciones.",
    anexoId: 400,
    anexoName: "Centro de Operaciones",
    imageSrc: "/directorios/centro-operaciones-hero.png",
    scopeLabel: "Anexo completo",
  },
  {
    slug: "bloques-casa-central",
    title: "Bloque - Casa Central",
    description: "Bloque Recepci\u00f3n, Privado y Sal\u00f3n Nuevo.",
    anexoId: 100,
    anexoName: "Casa Central",
    imageSrc: "/directorios/casa-central-hero.png",
    scopeLabel: "3 subdependencias",
    subdependenciaIds: [124, 1406, 125],
  },
  {
    slug: "vicepresidencia-primera",
    title: "Vicepresidencia Primera",
    description: "Recepci\u00f3n y Vicepresidencia Primera.",
    anexoId: 100,
    anexoName: "Casa Central",
    imageSrc: "/directorios/casa-central-hero.png",
    scopeLabel: "2 subdependencias",
    subdependenciaIds: [1404, 105],
  },
  {
    slug: "presidencia",
    title: "Presidencia",
    description: "Presidencia y Secretar\u00eda Privada.",
    anexoId: 100,
    anexoName: "Casa Central",
    imageSrc: "/directorios/casa-central-hero.png",
    scopeLabel: "2 subdependencias",
    subdependenciaIds: [119, 117],
  },
  {
    slug: "biblioteca-anexo-1",
    title: "Biblioteca - Anexo I",
    description: "Atenci\u00f3n al P\u00fablico, Sala 20 de Octubre y Subsuelo.",
    anexoId: 200,
    anexoName: "Anexo I: Copiap\u00f3 110",
    imageSrc: "/directorios/biblioteca-hero.png",
    scopeLabel: "3 subdependencias",
    subdependenciaIds: [222, 1400, 1401],
  },
];

export const PUBLIC_DIRECTORY_BY_SLUG = new Map(
  PUBLIC_DIRECTORIES.map((directory) => [directory.slug, directory])
);

export function publicDirectoryPath(slug: string) {
  return `/inventario-publico/directorio/${encodeURIComponent(slug)}`;
}
