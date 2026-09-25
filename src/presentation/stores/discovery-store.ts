import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface DiscoveryState {
  /** Razas abiertas alguna vez en el Ronrón. */
  discovered: string[];
  discover: (slug: string) => boolean;
}

/** Razas ya abiertas: la primera vez salen como nuevas. */
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
