import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // `next dev` crea AGENTS.md y CLAUDE.md en la raíz si no se desactiva.
  agentRules: false,
  images: {
    // Fotos de razas desde Wikimedia Commons, optimizadas por Next (AVIF/WebP
    // al tamaño del visor). Los originales pequeños llegan desde upload.* y
    // las miniaturas reescaladas desde thumb.* (por cubetas: 960px, 1280px…).
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/**" },
      { protocol: "https", hostname: "thumb.wikimedia.org", pathname: "/wikipedia/**" },
    ],
    formats: ["image/avif", "image/webp"],
    // 60 para la foto del visor (recortada y a ~320 px en móvil); 75 el resto.
    qualities: [60, 75],
  },
  experimental: {
    // Importa solo los módulos usados de estas librerías con muchos exports.
    optimizePackageImports: ["lucide-react", "react-icons", "recharts", "date-fns"],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
