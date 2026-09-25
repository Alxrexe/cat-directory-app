import type { SoundName } from "cuelume";
import { loadOnce } from "./idle";

/** cuelume sintetiza con Web Audio; se importa con la primera interacción. */
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
