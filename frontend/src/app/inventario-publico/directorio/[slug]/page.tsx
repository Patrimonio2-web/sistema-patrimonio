import type { Metadata } from "next";
import PublicAnexoView from "../../anexo/[id]/PublicAnexoView";

const title = "Directorio p\u00fablico | Patrimonio";
const description =
  "Consulta p\u00fablica de subdependencias e inventario patrimonial.";
const publicSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl),
  title,
  description,
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Direcci\u00f3n de Patrimonio",
    title,
    description,
    images: [
      {
        url: "/logo4.png",
        width: 1024,
        height: 1024,
        alt: "Direcci\u00f3n de Patrimonio",
      },
    ],
  },
};

export default function DirectorioPublicoPage() {
  return <PublicAnexoView />;
}
