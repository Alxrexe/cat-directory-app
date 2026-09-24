import { create } from "zustand";

export interface RetryStatus {
  attempt: number;
  retries: number;
  delayMs: number;
  /** Epoch en ms en que empezó la espera. */
  since: number;
}

interface ConnectionState {
  online: boolean;
  retry: RetryStatus | null;
  setOnline: (online: boolean) => void;
  reportRetry: (retry: Omit<RetryStatus, "since">) => void;
  clearRetry: () => void;
}

/**
 * Estado de la conexión, compartido por toda la UI. Lo alimentan dos
 * fuentes: los eventos online/offline del navegador y el cliente HTTP, que
 * avisa de cada reintento a través de la raíz de composición.
 */
export const useConnectionStore = create<ConnectionState>()((set) => ({
  online: true,
  retry: null,
  setOnline: (online) => set({ online }),
  reportRetry: (retry) => set({ retry: { ...retry, since: Date.now() } }),
  clearRetry: () => set((state) => (state.retry ? { retry: null } : state)),
}));
