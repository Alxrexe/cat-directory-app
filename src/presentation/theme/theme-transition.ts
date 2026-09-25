"use client";

import { applyColorTheme, type ColorTheme } from "./use-color-theme";

/** Se rasteriza una vez a este tamaño y después solo se escala. */
const WAVE_SIZE = 64;
/** Fracción opaca del disco; el resto es el halo. */
const CORE = 0.56;

const COVER_MS = 560;
const REVEAL_MS = 560;

/**
 * Una ola del color del tema nuevo tapa la pantalla desde el botón, el tema
 * cambia debajo (el recálculo de estilos queda oculto) y la ola se disuelve.
 * Solo transform/opacity: corre en el compositor aunque el hilo esté ocupado.
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
    // Un momento para el póster del cielo nuevo y dos frames para pintar debajo.
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
