"use client";

import { applyColorTheme, type ColorTheme } from "./use-color-theme";

/** Diámetro del disco de la ola antes de escalarlo (se rasteriza una vez). */
const WAVE_SIZE = 64;
/** Radio del núcleo opaco dentro del disco (el resto es el halo). */
const CORE = 0.56;

const COVER_MS = 560;
const REVEAL_MS = 560;

/**
 * Cambio de tema con una ola de luz, como pasar de canal en una consola:
 *
 *  1. Tapar: un disco del color del tema nuevo, con un halo, crece desde
 *     el botón hasta cubrir la pantalla (solo `transform: scale`).
 *  2. Cambiar: con todo tapado, el tema cambia de golpe (clase `.dark`),
 *     el cielo cambia de video y el campo WebGL empieza a fundir su paleta.
 *  3. Destapar: la ola se desvanece y se abre un poco (opacidad + escala) y
 *     aparece la interfaz ya en el tema nuevo.
 *
 * La ola es un único elemento de 64 px: el navegador lo pinta una vez y la
 * GPU solo lo escala y lo funde (Web Animations sobre transform/opacity, que
 * corren en el compositor aunque el hilo principal esté ocupado con el
 * cambio de tema). Sin movimiento reducido o sin `animate`, cambio directo.
 */
export async function switchColorTheme(
  next: ColorTheme,
  from: { x: number; y: number },
  options: { beforeReveal?: Promise<unknown> } = {},
): Promise<void> {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || typeof document.body.animate !== "function") {
    applyColorTheme(next);
    return;
  }

  const reach = Math.hypot(Math.max(from.x, innerWidth - from.x), Math.max(from.y, innerHeight - from.y));
  const cover = (reach / ((WAVE_SIZE / 2) * CORE)) * 1.04;

  const wave = document.createElement("div");
  wave.setAttribute("aria-hidden", "true");
  wave.className = "theme-wave";
  wave.dataset.to = next;
  wave.style.left = `${from.x - WAVE_SIZE / 2}px`;
  wave.style.top = `${from.y - WAVE_SIZE / 2}px`;
  document.body.append(wave);

  try {
    await wave.animate([{ transform: "scale(0.01)" }, { transform: `scale(${cover})` }], {
      duration: COVER_MS,
      easing: "cubic-bezier(0.7, 0, 0.3, 1)",
      fill: "forwards",
    }).finished;

    applyColorTheme(next);
    // El póster del cielo nuevo, si aún no estaba, tiene un momento (acotado)
    // para llegar mientras la ola tapa; después, dos frames para que el
    // navegador pinte el tema nuevo antes de destaparlo.
    await Promise.race([options.beforeReveal ?? Promise.resolve(), wait(420)]);
    await nextFrames(2);

    await wave.animate(
      [
        { transform: `scale(${cover})`, opacity: 1 },
        { transform: `scale(${cover * 1.12})`, opacity: 0 },
      ],
      { duration: REVEAL_MS, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
    ).finished;
  } finally {
    wave.remove();
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const nextFrames = (count: number) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
    step(count);
  });
