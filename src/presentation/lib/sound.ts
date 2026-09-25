import type { SoundName } from "cuelume";
import { loadOnce } from "./idle";

/**
 * Sonido de interfaz, siempre activo: es parte de la consola, no una
 * opción. cuelume sintetiza con Web Audio (no descarga archivos) y se
 * importa con la primera interacción, que es además cuando el navegador
 * permite que suene algo.
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
  loadSoundEngine()
    .then((module) => module.play(sound))
    .catch(() => {}); // sin red no hay sonido; no es un error para el usuario
}
