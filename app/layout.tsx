import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Doto, Hubot_Sans } from "next/font/google";
import { AppProviders } from "@presentation/providers/app-providers";
import { SkyBackground } from "@presentation/sky/sky-background";
import { THEME_SCRIPT } from "@presentation/theme/theme-script";
import { SITE_URL } from "./site-url";
import "./globals.css";

// Hubot Sans para todo (sin su eje de anchura, que duplicaba el archivo a 93 kB)
// y Doto solo para las cifras de LCD.
const hubot = Hubot_Sans({
  variable: "--font-hubot",
  subsets: ["latin"],
  display: "swap",
});

const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
  axes: ["ROND"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Michiverso · Simulación de razas de gato",
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
      className={`${hubot.variable} ${doto.variable}`}
    >
      <head>
        {/* Tema oscuro antes del primer pintado (ver theme-script.ts). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
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
