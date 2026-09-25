import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // `next dev` crea AGENTS.md y CLAUDE.md en la raíz si no se desactiva.
  agentRules: false,
  images: {
    // Wikimedia Commons: originales en upload.*, miniaturas en thumb.*.
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/**" },
      { protocol: "https", hostname: "thumb.wikimedia.org", pathname: "/wikipedia/**" },
    ],
    formats: ["image/avif", "image/webp"],
    // 60 para la foto del visor (recortada y a ~320 px en móvil); 75 el resto.
    qualities: [60, 75],
    // Wikimedia limita las ráfagas (429): cada foto optimizada se guarda un
    // mes, así se le pide una sola vez y no en cada visita.
    minimumCacheTTL: 60 * 60 * 24 * 30,
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
