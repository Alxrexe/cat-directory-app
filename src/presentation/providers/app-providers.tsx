"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";
import { ToasterHost } from "../components/ui/toaster-host";
import { ConnectionWatcher } from "./connection-watcher";
import { createQueryClient } from "./query-client";
import { ServiceWorkerRegistrar } from "./service-worker";
import { SmoothScroll } from "./smooth-scroll";
import { SoundLayer } from "./sound-layer";
import { UseCasesProvider } from "./use-cases-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  // Un QueryClient por pestaña, no por módulo: en el servidor un singleton
  // compartiría caché entre usuarios.
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <UseCasesProvider>
          {children}
          <ToasterHost />
          <ConnectionWatcher />
          <SmoothScroll />
          <SoundLayer />
          <ServiceWorkerRegistrar />
        </UseCasesProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
