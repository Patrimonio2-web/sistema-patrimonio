import type { Metadata } from "next";
import { ThemeProvider } from "../Context/ThemeContext";
import localFont from "next/font/local";
import Protected from "@/components/guards/Protected";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Gestión de patrimonio",
  description:
    "Una plataforma integral para gestionar activos legislativos, que incluye seguimiento de propiedades, gestión de inventario e informes detallados.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <Protected>
            <main>{children}</main>
          </Protected>
        </ThemeProvider>
      </body>
    </html>
  );
}
