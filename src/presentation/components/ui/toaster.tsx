"use client";

import { useEffect } from "react";
import { Toaster as Sileo } from "sileo";
import { useColorTheme } from "../../theme/use-color-theme";

export { sileo } from "sileo";

/** Arriba: abajo tapaba la consola. `onMounted` corre cuando sileo ya escucha su store. */
export default function Toaster({ onMounted }: { onMounted?: () => void }) {
  useEffect(() => {
    onMounted?.();
  }, [onMounted]);

  // sileo nombra el tema por el fondo que acompaña: "dark" es la píldora
  // clara (va con la perla) y "light", la oscura (va con la noche).
  const { theme } = useColorTheme();
  return <Sileo position="top-center" offset={{ top: 84 }} theme={theme === "dark" ? "light" : "dark"} />;
}
