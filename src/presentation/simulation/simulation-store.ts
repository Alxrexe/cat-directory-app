import { create } from "zustand";

/**
 * Fases de la simulación:
 * - `gate`: pantalla de inicio (botón "Empezar simulación").
 * - `linking`: el túnel mientras se carga el motor, el cielo y los orbes.
 * - `running`: el campo de orbes, la consola y el Ronrón.
 */
export type SimulationPhase = "gate" | "linking" | "running";

export interface LinkStep {
  id: "engine" | "sky" | "breeds" | "orbs";
  label: string;
  done: boolean;
}

interface SimulationState {
  phase: SimulationPhase;
  steps: LinkStep[];
  /** El cielo puede cargar y reproducir su video. */
  skyActive: boolean;
  /** Origen del último orbe pulsado: el Ronrón se abre desde ahí. */
  origin: { x: number; y: number; size: number } | null;
  setPhase: (phase: SimulationPhase) => void;
  completeStep: (id: LinkStep["id"]) => void;
  activateSky: () => void;
  setOrigin: (origin: SimulationState["origin"]) => void;
}

const INITIAL_STEPS: LinkStep[] = [
  { id: "engine", label: "Motor de simulación", done: false },
  { id: "sky", label: "Cielo", done: false },
  { id: "breeds", label: "Razas", done: false },
  { id: "orbs", label: "Orbes", done: false },
];

export const useSimulationStore = create<SimulationState>()((set) => ({
  phase: "gate",
  steps: INITIAL_STEPS,
  skyActive: false,
  origin: null,
  setPhase: (phase) => set({ phase }),
  completeStep: (id) =>
    set((state) => ({ steps: state.steps.map((step) => (step.id === id ? { ...step, done: true } : step)) })),
  activateSky: () => set({ skyActive: true }),
  setOrigin: (origin) => set({ origin }),
}));
