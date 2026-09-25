import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface DiscoveryState {
  /** Razas abiertas alguna vez en el Ronrón. */
  discovered: string[];
  discover: (slug: string) => boolean;
}

/**
 * Colección de "michis descubiertos": un toque de juego. Cada raza abierta
 * por primera vez se marca como nueva y suma al contador de la barra.
 */
export const useDiscoveryStore = create<DiscoveryState>()(
  persist(
    (set, get) => ({
      discovered: [],
      discover: (slug) => {
        if (get().discovered.includes(slug)) return false;
        set((state) => ({ discovered: [...state.discovered, slug] }));
        return true;
      },
    }),
    {
      name: "michiverso:descubiertos",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
