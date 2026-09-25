import { loadOnce } from "../lib/idle";

/** Three.js y GSAP (~170 KB) no entran en el primer pintado. */
const importEngine = () => import("./engine/engine");
export const loadFieldEngine = () => {
  return loadOnce(importEngine);
};

/** Familias tipográficas ya resueltas por next/font (con su hash). */
export async function resolveAtlasFonts() {
  const styles = getComputedStyle(document.documentElement);
  // Monograma y nombre en la misma Hubot Sans del resto de la interfaz.
  const display = styles.getPropertyValue("--font-hubot").trim() || "system-ui";
  const body = display;
  await Promise.allSettled([document.fonts.load(`700 80px ${display}`), document.fonts.load(`800 24px ${body}`)]);
  return { display, body };
}
