import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Nunito, Rubik } from "next/font/google";
import { AppProviders } from "@presentation/providers/app-providers";
import { SkyBackground } from "@presentation/sky/sky-background";
import "./globals.css";

/**
 * Tres voces, como el menú de una consola con un panel técnico:
 * - Rubik: geometría con esquinas suavizadas, la de títulos y nombres.
 * - Nunito: redondeada y muy legible, la de la interfaz y el texto.
 * - La mono del sistema (SF Mono, Menlo, Consolas, Roboto Mono): rótulos
 *   técnicos, reloj y contadores. No descarga nada: una tercera fuente web
 *   costaba ~30 kB en el camino del primer pintado en móvil.
 */
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Michiverso — Simulación de razas de gato",
    template: "%s · Michiverso",
  },
  description:
    "Explora 98 razas de gato en una simulación: orbes que flotan en el cielo y el Ronrón, un dispositivo con la ficha, la foto y un dato curioso de cada raza.",
  applicationName: "Michiverso",
  openGraph: { type: "website", locale: "es_ES", siteName: "Michiverso" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5fa" },
    { media: "(prefers-color-scheme: dark)", color: "#f4f5fa" },
  ],
};

export default function RootLayout({ children, modal }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${rubik.variable} ${nunito.variable}`}
    >
      <body className="min-h-dvh">
        <AppProviders>
          <a
            href="#contenido"
            className="sr-only rounded-full bg-ink px-4 py-2 font-display text-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100"
          >
            Saltar al contenido
          </a>
          <Suspense fallback={null}>
            <SkyBackground />
          </Suspense>
          <main id="contenido" tabIndex={-1} className="relative outline-none">
            {children}
          </main>
          {modal}
        </AppProviders>
      </body>
    </html>
  );
}
