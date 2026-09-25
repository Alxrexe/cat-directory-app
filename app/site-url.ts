/**
 * URL canónica del sitio (metadatos, Open Graph, sitemap y robots).
 *
 * 1. `NEXT_PUBLIC_SITE_URL`, si se define (dominio propio).
 * 2. En Vercel, el dominio de producción del proyecto, que la plataforma
 *    inyecta en el build (`VERCEL_PROJECT_PRODUCTION_URL`, sin protocolo).
 * 3. En local, el servidor de desarrollo.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
