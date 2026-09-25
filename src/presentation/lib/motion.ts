"use client";

// Web Animations: transform/opacity/filter corren en el compositor y no se
// traban aunque el hilo principal esté ocupado montando una ruta.

type Target = Element | null | undefined;

export const EASE = {
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  expo: "cubic-bezier(0.16, 1, 0.3, 1)",
  in: "cubic-bezier(0.55, 0, 0.75, 0.2)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  back: sampled((t) => backOut(t, 1.6), "cubic-bezier(0.34, 1.4, 0.64, 1)"),
  backStrong: sampled((t) => backOut(t, 2.4), "cubic-bezier(0.34, 1.6, 0.64, 1)"),
  elastic: sampled((t) => elasticOut(t, 0.45), "cubic-bezier(0.34, 1.6, 0.64, 1)"),
} as const;

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function play(target: Target, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation | null {
  if (!target || typeof (target as HTMLElement).animate !== "function") return null;
  return (target as HTMLElement).animate(keyframes, options);
}

export function playEach(
  targets: ArrayLike<Element>,
  keyframes: (index: number) => Keyframe[],
  { stagger = 0, delay = 0, ...options }: KeyframeAnimationOptions & { stagger?: number },
): Animation[] {
  return Array.from(targets, (target, i) =>
    play(target, keyframes(i), { ...options, delay: delay + i * stagger }),
  ).filter((animation): animation is Animation => animation !== null);
}

export const finished = (animations: Array<Animation | null>) =>
  Promise.all(animations.map((animation) => animation?.finished.catch(() => {})));

export function finishAll(animations: Array<Animation | null>) {
  for (const animation of animations) {
    if (animation?.playState === "running" || animation?.playState === "paused") animation.finish();
  }
}

// Las entradas solo se animan tras el primer gesto: el primer pintado no espera a nada.
let armed = false;

export function armMotionOnInteraction(): () => void {
  if (armed) return () => {};
  const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
  const arm = () => {
    armed = true;
    cleanup();
  };
  const cleanup = () => {
    for (const type of events) window.removeEventListener(type, arm);
  };
  for (const type of events) window.addEventListener(type, arm, { passive: true });
  return cleanup;
}

export const motionArmed = () => armed && !prefersReducedMotion();

function backOut(t: number, s: number) {
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
}

function elasticOut(t: number, period: number) {
  if (t === 0 || t === 1) return t;
  return 2 ** (-10 * t) * Math.sin(((t - period / 4) * (2 * Math.PI)) / period) + 1;
}

function sampled(curve: (t: number) => number, fallback: string) {
  if (typeof CSS === "undefined" || !CSS.supports("animation-timing-function", "linear(0, 1)")) return fallback;
  const steps = 48;
  const points = Array.from({ length: steps + 1 }, (_, i) => curve(i / steps).toFixed(4));
  return `linear(${points.join(", ")})`;
}
