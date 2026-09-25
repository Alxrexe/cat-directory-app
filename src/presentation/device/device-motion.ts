import { EASE, finished, finishAll, play, playEach } from "../lib/motion";

/** Punto de la pantalla del que nace el Ronrón (el orbe o la fila pulsada). */
export interface DeviceOrigin {
  x: number;
  y: number;
  size: number;
}

export interface DeviceMotion {
  finished: Promise<unknown>;
  /** Salta al estado final (otra raza, cierre a mitad de la apertura). */
  finish: () => void;
}

const LID_OPEN = "perspective(1400px) rotateX(0deg)";
const LID_CLOSED = "perspective(1400px) rotateX(-96deg)";

function parts(device: HTMLElement) {
  const all = (selector: string) => device.querySelectorAll<HTMLElement>(selector);
  return {
    lid: device.querySelector<HTMLElement>("[data-device-lid]"),
    screens: all("[data-screen]"),
    ears: all("[data-device-ears] > *"),
    shoulders: all("[data-device-shoulder]"),
    controls: all("[data-device-control]"),
  };
}

/** Transformación que lleva el Ronrón (centrado) hasta el orbe de origen. */
function atOrigin(device: HTMLElement, origin: DeviceOrigin | null) {
  const rect = device.getBoundingClientRect();
  if (!origin) return "translate(0px, 30px) scale(0.9)";
  const x = origin.x - (rect.left + rect.width / 2);
  const y = origin.y - (rect.top + Math.min(rect.height, window.innerHeight) / 2);
  const scale = Math.max(0.08, (origin.size * 1.4) / rect.width);
  return `translate(${x}px, ${y}px) scale(${scale})`;
}

const motion = (animations: Array<Animation | null>): DeviceMotion => ({
  finished: finished(animations),
  finish: () => finishAll(animations),
});

/** Sale cerrado del orbe, abre la tapa y enciende las pantallas. Al acabar no queda nada aplicado. */
export function playDeviceOpen(device: HTMLElement, origin: DeviceOrigin | null): DeviceMotion {
  const { lid, screens, ears, shoulders, controls } = parts(device);
  if (lid) lid.style.transformOrigin = "50% 100%";
  return motion([
    play(device, [{ transform: atOrigin(device, origin), opacity: 0 }, { transform: "none", opacity: 1 }], {
      duration: 800,
      easing: EASE.expo,
      fill: "backwards",
    }),
    play(lid, [{ transform: LID_CLOSED }, { transform: LID_OPEN }], {
      duration: 950,
      delay: 260,
      easing: EASE.back,
      fill: "backwards",
    }),
    ...playEach(
      screens,
      () => [
        { transform: "scaleY(0.03)", opacity: 0, filter: "brightness(2.4)" },
        { transform: "none", opacity: 1, filter: "brightness(1)" },
      ],
      { duration: 550, delay: 720, stagger: 90, easing: EASE.expo, fill: "backwards" },
    ),
    ...playEach(
      ears,
      () => [{ transform: "translateY(30px) scale(0.35)", opacity: 0 }, { transform: "none", opacity: 1 }],
      { duration: 750, delay: 620, stagger: 80, easing: EASE.backStrong, fill: "backwards" },
    ),
    ...playEach(shoulders, () => [{ transform: "translateY(22px)", opacity: 0 }, { transform: "none", opacity: 1 }], {
      duration: 600,
      delay: 740,
      stagger: 70,
      easing: EASE.back,
      fill: "backwards",
    }),
    ...playEach(controls, () => [{ transform: "scale(0.6)", opacity: 0 }, { transform: "none", opacity: 1 }], {
      duration: 550,
      delay: 500,
      stagger: 60,
      easing: EASE.backStrong,
      fill: "backwards",
    }),
  ]);
}

/** Cierre: el camino inverso, más corto. Deja todo oculto hasta desmontarse. */
export function playDeviceClose(device: HTMLElement, origin: DeviceOrigin | null): DeviceMotion {
  const { lid, screens, ears, shoulders } = parts(device);
  if (lid) lid.style.transformOrigin = "50% 100%";
  return motion([
    ...playEach(
      screens,
      () => [
        { transform: "none", opacity: 1, filter: "brightness(1)" },
        { transform: "scaleY(0.03)", opacity: 0, filter: "brightness(2.4)" },
      ],
      { duration: 200, easing: EASE.in, fill: "forwards" },
    ),
    ...playEach([...ears, ...shoulders], () => [{ transform: "none", opacity: 1 }, { transform: "translateY(18px)", opacity: 0 }], {
      duration: 250,
      stagger: 30,
      easing: EASE.in,
      fill: "forwards",
    }),
    play(lid, [{ transform: LID_OPEN }, { transform: LID_CLOSED }], {
      duration: 360,
      delay: 80,
      easing: EASE.in,
      fill: "forwards",
    }),
    play(device, [{ transform: "none", opacity: 1 }, { transform: atOrigin(device, origin), opacity: 0 }], {
      duration: 420,
      delay: 300,
      easing: EASE.in,
      fill: "forwards",
    }),
  ]);
}

/** Cambio de raza dentro del Ronrón: las piezas se deslizan en ese sentido. */
export function playDeviceSlide(device: HTMLElement, direction: -1 | 1): DeviceMotion {
  return motion(
    playEach(
      device.querySelectorAll("[data-device-part]"),
      () => [{ transform: `translateX(${direction * 36}px)`, opacity: 0 }, { transform: "none", opacity: 1 }],
      { duration: 550, stagger: 50, easing: EASE.expo, fill: "backwards" },
    ),
  );
}
