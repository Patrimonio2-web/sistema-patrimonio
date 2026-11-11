/** @type {import('next').NextConfig} */

const apiBase = process.env.API_ORIGIN || "http://127.0.0.1:5000";
const apiOrigin = new URL(apiBase).origin;

const isDevelopment = process.env.NODE_ENV !== "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://api.qrserver.com",
  `connect-src 'self' ${apiOrigin}${isDevelopment ? " http://localhost:* ws://localhost:*" : ""}`,
  "frame-src 'self' https://www.google.com https://maps.google.com",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig = {
  reactStrictMode: true,
  // El navegador debe recibir la cookie de sesion desde el mismo sitio.
  env: { NEXT_PUBLIC_API_BASE: "/api" },
  async rewrites() {
    if (process.env.NODE_ENV === "production" && !process.env.API_ORIGIN) {
      throw new Error("API_ORIGIN es obligatorio para el build de producción");
    }
    return [
      { source: "/api/:path*", destination: `${apiOrigin}/api/:path*` },
      { source: "/altas/exportar_pdf", destination: `${apiOrigin}/altas/exportar_pdf` },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "example.com" },
      { protocol: "https", hostname: "api.qrserver.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
