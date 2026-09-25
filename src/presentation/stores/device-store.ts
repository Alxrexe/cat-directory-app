import { create } from "zustand";

interface DeviceState {
  /** El Ronrón está abierto como modal sobre el campo. */
  open: boolean;
  /** Sentido del último cambio de raza (para animar el contenido). */
  direction: -1 | 0 | 1;
  setOpen: (open: boolean) => void;
  setDirection: (direction: -1 | 0 | 1) => void;
}

export const useDeviceStore = create<DeviceState>()((set) => ({
  open: false,
  direction: 0,
  setOpen: (open) => set({ open }),
  setDirection: (direction) => set({ direction }),
}));
