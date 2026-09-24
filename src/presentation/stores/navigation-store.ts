import { create } from "zustand";

interface NavigationState {
  /** Última URL del directorio, con su `?q=` y `?page=`: el "volver" regresa ahí. */
  directoryHref: string;
  /** Última raza abierta: al volver, el foco del teclado regresa a su fila. */
  lastVisitedSlug: string | null;
  setDirectoryHref: (href: string) => void;
  setLastVisited: (slug: string | null) => void;
}

export const useNavigationStore = create<NavigationState>()((set) => ({
  directoryHref: "/",
  lastVisitedSlug: null,
  setDirectoryHref: (directoryHref) => set({ directoryHref }),
  setLastVisited: (lastVisitedSlug) => set({ lastVisitedSlug }),
}));
