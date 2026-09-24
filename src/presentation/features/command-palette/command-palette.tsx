"use client";

import { Search } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "../../components/ui/button";
import { useIdleModule } from "../../lib/idle";

// cmdk, el diálogo de Radix y el cajón de vaul se descargan al acercar el
// puntero o al abrir, nunca en la carga inicial.
const loadPalette = () => import("./palette-dialog");

const subscribe = () => () => {};
const isApple = () => /Mac|iPhone|iPad/.test(navigator.platform);

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);
  const palette = useIdleModule(loadPalette, { now: requested, idle: false });
  const PaletteDialog = palette?.default;
  const shortcut = useSyncExternalStore(subscribe, () => (isApple() ? "⌘K" : "Ctrl K"), () => "⌘K");

  const show = () => {
    setRequested(true);
    setOpen(true);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setRequested(true);
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={show}
        onPointerEnter={() => setRequested(true)}
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K"
        className="gap-3"
      >
        <Search aria-hidden="true" />
        <span className="hidden sm:inline">Ir a una raza</span>
        <kbd className="label-mono hidden text-faint sm:inline">{shortcut}</kbd>
        <span className="sr-only sm:hidden">Ir a una raza</span>
      </Button>
      {PaletteDialog && <PaletteDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}
