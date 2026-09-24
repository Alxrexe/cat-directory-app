import type { SoundName } from "cuelume";
import { usePreferencesStore } from "../stores/preferences-store";
import { loadOnce } from "./idle";

/**
 * Sonido de interacción, opcional y apagado por defecto. cuelume sintetiza
 * con Web Audio (no descarga archivos) y solo se importa la primera vez que
 * hace falta, así que quien no activa el sonido no paga ni un byte.
 */
const loadCuelume = () =>
  import("cuelume").then((module) => {
    module.setVolume(0.3);
    return module;
  });

export function loadSoundEngine() {
  return loadOnce(loadCuelume);
}

export function playCue(sound: SoundName): void {
  if (!usePreferencesStore.getState().sound) return;
  loadSoundEngine()
    .then((module) => module.play(sound))
    .catch(() => {}); // sin red no hay sonido; no es un error para el usuario
}
