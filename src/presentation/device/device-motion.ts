import type { Gsap } from "../lib/gsap";

/** Punto de la pantalla del que nace el Ronrón (el orbe o la fila pulsada). */
export interface DeviceOrigin {
  x: number;
  y: number;
  size: number;
}

const LID_CLOSED = -96; // grados: la tapa, plegada tras la bisagra
const PERSPECTIVE = 1400;

function parts(device: HTMLElement) {
  const all = (selector: string) => Array.from(device.querySelectorAll<HTMLElement>(selector));
  return {
    lid: device.querySelector<HTMLElement>("[data-device-lid]"),
    hinge: device.querySelector<HTMLElement>("[data-device-hinge]"),
    screens: all("[data-screen]"),
    ears: all("[data-device-ears] > *"),
    shoulders: all("[data-device-shoulder]"),
    controls: all("[data-device-control]"),
  };
}

/** Desplazamiento y escala que llevan el Ronrón (centrado) hasta el origen. */
function toOrigin(device: HTMLElement, origin: DeviceOrigin | null) {
  const rect = device.getBoundingClientRect();
  if (!origin) return { x: 0, y: 30, scale: 0.9 };
  return {
    x: origin.x - (rect.left + rect.width / 2),
    y: origin.y - (rect.top + Math.min(rect.height, window.innerHeight) / 2),
    scale: Math.max(0.08, (origin.size * 1.4) / rect.width),
  };
}

/**
 * Apertura del Ronrón, como una consola de bolsillo que se abre:
 *
 *  1. El aparato, cerrado (la tapa plegada tras la bisagra), sale del orbe
 *     y viaja al centro creciendo.
 *  2. La tapa gira sobre la bisagra hasta quedar abierta, con un pequeño
 *     rebote (rotateX con perspectiva; su cara trasera no se pinta).
 *  3. Las pantallas se encienden como un tubo: una raya que se abre en
 *     vertical con un destello (scaleY + brightness).
 *  4. Orejas y gatillos llegan flotando; los botones saltan a su sitio.
 *
 * Todo es transform, opacity y filter: el compositor lo mueve sin repintar.
 */
export function playDeviceOpen(gsap: Gsap, device: HTMLElement, origin: DeviceOrigin | null) {
  const { lid, screens, ears, shoulders, controls } = parts(device);
  const from = toOrigin(device, origin);
  const tl = gsap.timeline();
  tl.set(lid, { transformPerspective: PERSPECTIVE, transformOrigin: "50% 100%", rotationX: LID_CLOSED })
    .set(screens, { transformOrigin: "50% 50%", scaleY: 0.03, opacity: 0, filter: "brightness(2.4)" })
    .fromTo(
      device,
      { x: from.x, y: from.y, scale: from.scale, opacity: 0 },
      { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.8, ease: "expo.out" },
      0,
    )
    .to(lid, { rotationX: 0, duration: 0.95, ease: "back.out(1.2)" }, 0.26)
    .to(
      screens,
      { scaleY: 1, opacity: 1, filter: "brightness(1)", duration: 0.55, stagger: 0.09, ease: "expo.out" },
      0.72,
    )
    .fromTo(
      ears,
      { y: 30, scale: 0.35, opacity: 0 },
      { y: 0, scale: 1, opacity: 1, duration: 0.75, stagger: 0.08, ease: "back.out(2.2)" },
      0.62,
    )
    .fromTo(
      shoulders,
      { y: 22, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.07, ease: "back.out(2)" },
      0.74,
    )
    .fromTo(
      controls,
      { scale: 0.6, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.55, stagger: 0.06, ease: "back.out(2.4)" },
      0.5,
    )
    // Al terminar no queda ningún filtro ni perspectiva puestos: el aparato
    // vuelve a ser una capa normal (sin coste mientras se usa).
    .set(screens, { clearProps: "filter,transform,opacity" })
    .set(lid, { clearProps: "transform" });
  return tl;
}

/** Cierre: el camino inverso, más corto (pantallas, tapa, vuelta al orbe). */
export function playDeviceClose(gsap: Gsap, device: HTMLElement, origin: DeviceOrigin | null) {
  const { lid, screens, ears, shoulders } = parts(device);
  const to = toOrigin(device, origin);
  const tl = gsap.timeline();
  tl.to(screens, { scaleY: 0.03, opacity: 0, filter: "brightness(2.4)", duration: 0.2, ease: "power2.in" }, 0)
    .to([...ears, ...shoulders], { y: 18, opacity: 0, duration: 0.25, stagger: 0.03, ease: "power2.in" }, 0)
    .to(
      lid,
      { transformPerspective: PERSPECTIVE, transformOrigin: "50% 100%", rotationX: LID_CLOSED, duration: 0.36, ease: "power2.in" },
      0.08,
    )
    .to(device, { x: to.x, y: to.y, scale: to.scale, opacity: 0, duration: 0.42, ease: "power3.in" }, 0.3);
  return tl;
}
