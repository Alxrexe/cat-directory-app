"use client";

import { useEffect } from "react";
import { Toaster as Sileo } from "sileo";
import { useColorTheme } from "../../theme/use-color-theme";

export { sileo } from "sileo";

/**
 * Contenedor de avisos de sileo, arriba y al centro, justo bajo la barra de
 * sistema (como las notificaciones de una consola): abajo tapaban la
 * consola de búsqueda. La sección que monta es `aria-live="polite"`.
 *
 * Se carga en diferido desde <ToasterHost>; `onMounted` corre después de
 * que sileo se suscriba a su store (los efectos del hijo van primero).
 */
export default function Toaster({ onMounted }: { onMounted?: () => void }) {
  useEffect(() => {
    onMounted?.();
  }, [onMounted]);

  // sileo nombra el tema por el fondo que acompaña: "dark" es la píldora
  // clara (va con la porcelana) y "light", la oscura (va con la noche).
  const { theme } = useColorTheme();
  return <Sileo position="top-center" offset={{ top: 84 }} theme={theme === "dark" ? "light" : "dark"} />;
}
