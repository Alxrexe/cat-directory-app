"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { Toaster as Sileo } from "sileo";

export { sileo } from "sileo";

/**
 * Contenedor de avisos de sileo. Va en contraste con la página: píldora
 * oscura sobre el tema claro y clara sobre el oscuro (así funciona el
 * `theme` de sileo). Abajo y no arriba: arriba taparía la barra de
 * búsqueda fija. La sección que monta es `aria-live="polite"`.
 *
 * Se carga en diferido desde <ToasterHost>; `onMounted` corre después de
 * que sileo se suscriba a su store (los efectos del hijo van primero).
 */
export default function Toaster({ onMounted }: { onMounted?: () => void }) {
  const { resolvedTheme } = useTheme();
  useEffect(() => onMounted?.(), [onMounted]);

  return <Sileo position="bottom-center" offset={{ bottom: 16 }} theme={resolvedTheme === "dark" ? "dark" : "light"} />;
}
