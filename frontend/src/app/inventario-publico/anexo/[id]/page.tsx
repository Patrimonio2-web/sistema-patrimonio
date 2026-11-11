import type { Metadata } from "next";
import PublicAnexoView from "./PublicAnexoView";

const title = "Residencia Oficial N\u00ba 2 | Patrimonio";
const description =
  "Directorio p\u00fablico de subdependencias e inventario de la Residencia Oficial N\u00ba 2.";
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
        url: "/anexos/reci.jpg",
        width: 1024,
        height: 576,
        alt: "Residencia Oficial N\u00ba 2",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/anexos/reci.jpg"],
  },
};

export default function InventarioPublicoAnexoPage() {
  return <PublicAnexoView />;
}
