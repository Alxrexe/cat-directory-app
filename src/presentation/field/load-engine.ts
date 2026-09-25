import { loadGsap } from "../lib/gsap";
import { loadOnce } from "../lib/idle";

/**
 * El motor (Three.js + GSAP, ~170 KB comprimidos) no entra en el primer
 * pintado: se pide al acercar el puntero al botón de inicio y se termina de
 * cargar durante el túnel, que es literalmente la pantalla de carga.
 */
const importEngine = () => import("./engine/engine");
export const loadFieldEngine = () => {
  // El motor ya trae GSAP; así el resto de la UI también lo tiene a mano.
  void loadGsap().catch(() => {});
  return loadOnce(importEngine);
};

/** Familias tipográficas ya resueltas por next/font (con su hash). */
export async function resolveAtlasFonts() {
  const styles = getComputedStyle(document.documentElement);
  const display = styles.getPropertyValue("--font-rubik").trim() || "system-ui";
  const body = styles.getPropertyValue("--font-nunito").trim() || "system-ui";
  await Promise.allSettled([document.fonts.load(`700 80px ${display}`), document.fonts.load(`800 24px ${body}`)]);
  return { display, body };
}
