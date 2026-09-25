"use client";

import { useEffect } from "react";
import type { SoundName } from "cuelume";
import { loadSoundEngine } from "../lib/sound";

/** El primer selector que coincide decide el sonido. */
const RULES: Array<{ selector: string; hover?: SoundName; press?: SoundName }> = [
  { selector: "[data-cue='breed']", hover: "tick", press: "droplet" },
  { selector: "[data-cue='primary']", hover: "scan", press: "pulse" },
  { selector: "button, a[href], [role='button'], [role='option']", hover: "tick", press: "press" },
  { selector: "input, textarea", press: "whisper" },
];
const SILENT = "[data-cue='mute'], [disabled], [aria-disabled='true']";

function resolve(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  for (const rule of RULES) {
    const node = target.closest(rule.selector);
    if (node && !node.closest(SILENT)) return { node, rule };
  }
  return null;
}

/**
 * Sonido de interfaz por delegación: cuatro listeners en el documento,
 * sin marcar cada elemento, así que las filas que monta la virtualización
 * suenan sin registrarse. Siempre activo; el motor se descarga con la
 * primera pulsación o tecla (antes el navegador no deja sonar nada).
 */
export function SoundLayer() {
  useEffect(() => {
    let play: ((sound: SoundName) => void) | null = null;
    const wake = () =>
      void loadSoundEngine()
        .then((module) => (play = module.play))
        .catch(() => {});
    window.addEventListener("keydown", wake, { once: true, passive: true });

    let lastNode: Element | null = null;
    let lastAt = 0;

    const onOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const hit = resolve(event.target);
      if (!hit?.rule.hover || hit.node === lastNode) return;
      const now = performance.now();
      if (now - lastAt < 70) return; // barrer la lista no es una ráfaga de clics
      lastNode = hit.node;
      lastAt = now;
      play?.(hit.rule.hover);
    };
    const onOut = (event: PointerEvent) => {
      if (lastNode && !lastNode.contains(event.relatedTarget as Node | null)) lastNode = null;
    };
    const onDown = (event: PointerEvent) => {
      const hit = resolve(event.target);
      if (!play) {
        // Primera pulsación: se descarga el motor y suena en cuanto llega.
        void loadSoundEngine()
          .then((module) => {
            play = module.play;
            if (hit?.rule.press) play(hit.rule.press);
          })
          .catch(() => {});
        return;
      }
      if (hit?.rule.press) play(hit.rule.press);
    };

    const options: AddEventListenerOptions = { passive: true, capture: true };
    document.addEventListener("pointerover", onOver, options);
    document.addEventListener("pointerout", onOut, options);
    document.addEventListener("pointerdown", onDown, options);
    return () => {
      document.removeEventListener("pointerover", onOver, options);
      document.removeEventListener("pointerout", onOut, options);
      document.removeEventListener("pointerdown", onDown, options);
      window.removeEventListener("keydown", wake);
    };
  }, []);

  return null;
}
