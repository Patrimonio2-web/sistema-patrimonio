import type { Metadata } from "next";
import PublicSubdependenciaView from "./PublicSubdependenciaView";

const title = "Inventario por subdependencia | Patrimonio";
const description =
  "Consulta p\u00fablica de bienes registrados en una subdependencia de Patrimonio.";
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
        alt: "Direcci\u00f3n de Patrimonio - Legislatura de La Rioja",
      },
    ],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/logo4.png"],
  },
};

export default function InventarioPublicoSubdependenciaPage() {
  return <PublicSubdependenciaView />;
}
