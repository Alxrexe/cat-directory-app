"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createLazyClientContainer, type ClientUseCases } from "@infrastructure/container/client-lazy";
import { onIdle } from "../lib/idle";
import { useConnectionStore } from "../stores/connection-store";

const UseCasesContext = createContext<ClientUseCases | null>(null);

/** La UI pide casos de uso, nunca adaptadores; en tests se pasan dobles por `value`. */
export function UseCasesProvider({ children, value }: { children: ReactNode; value?: ClientUseCases }) {
  const [container] = useState(() =>
    value
      ? null
      : createLazyClientContainer({
          onRetry: ({ attempt, retries, delayMs }) =>
            useConnectionStore.getState().reportRetry({ attempt, retries, delayMs }),
        }),
  );

  useEffect(() => (container ? onIdle(container.preload, 4000) : undefined), [container]);

  const useCases = value ?? container!.useCases;
  return <UseCasesContext.Provider value={useCases}>{children}</UseCasesContext.Provider>;
}

export function useUseCases(): ClientUseCases {
  const useCases = useContext(UseCasesContext);
  if (!useCases) throw new Error("useUseCases fuera de <UseCasesProvider>");
  return useCases;
}
