import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface PreferencesState {
  sound: boolean;
  setSound: (sound: boolean) => void;
}

/**
 * Preferencias del usuario, persistidas. `skipHydration` evita que el
 * cliente arranque con un valor distinto al que pintó el servidor: la
 * rehidratación se dispara a mano después del primer render.
 */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      sound: false,
      setSound: (sound) => set({ sound }),
    }),
    {
      name: "cat-directory:preferences",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
