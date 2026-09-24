import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Serif, Outfit } from "next/font/google";
import type { ReactNode } from "react";
import { SiteFooter } from "@presentation/components/layout/site-footer";
import { SiteHeader } from "@presentation/components/layout/site-header";
import { AppProviders } from "@presentation/providers/app-providers";
import "./globals.css";

/**
 * Tres cortes con un papel cada uno: serif de exhibición para los nombres
 * de raza (lo que se busca), sans geométrica para la interfaz y mono para
 * los datos de archivo (índices, páginas, recuentos).
 */
const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const ui = Outfit({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

const technical = IBM_Plex_Mono({
  variable: "--font-technical",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Felis — Directorio de razas de gato",
    template: "%s · Felis",
  },
  description:
    "Directorio de razas de gato: país, origen, pelaje y patrón de cada raza, con un dato curioso al azar en cada ficha.",
  applicationName: "Felis",
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Felis",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#110e0b" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${display.variable} ${ui.variable} ${technical.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <AppProviders>
          <a
            href="#contenido"
            className="label-mono sr-only bg-foreground px-3 py-2 text-background focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
          >
            Saltar al contenido
          </a>
          <SiteHeader />
          <main id="contenido" tabIndex={-1} className="flex flex-1 flex-col outline-none">
            {children}
          </main>
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}
