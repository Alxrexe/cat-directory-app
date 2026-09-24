"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createClientContainer, type ClientUseCases } from "@infrastructure/container/client";
import { useConnectionStore } from "../stores/connection-store";

const UseCasesContext = createContext<ClientUseCases | null>(null);

/**
 * Inyección de dependencias de la UI. Los componentes piden casos de uso,
 * nunca adaptadores; en tests se pasa `value` con dobles.
 */
export function UseCasesProvider({ children, value }: { children: ReactNode; value?: ClientUseCases }) {
  const [useCases] = useState<ClientUseCases>(
    () =>
      value ??
      createClientContainer({
        onRetry: ({ attempt, retries, delayMs }) =>
          useConnectionStore.getState().reportRetry({ attempt, retries, delayMs }),
      }),
  );
  return <UseCasesContext.Provider value={useCases}>{children}</UseCasesContext.Provider>;
}

export function useUseCases(): ClientUseCases {
  const useCases = useContext(UseCasesContext);
  if (!useCases) throw new Error("useUseCases fuera de <UseCasesProvider>");
  return useCases;
}
