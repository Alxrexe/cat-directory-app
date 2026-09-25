"use client";

import { Search } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "../../components/ui/button";
import { Hint } from "../../components/ui/hint";
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
      <Hint label={`Ir a una raza · ${shortcut}`}>
        <Button
          variant="console"
          size="icon-lg"
          onClick={show}
          onPointerEnter={() => setRequested(true)}
          aria-haspopup="dialog"
          aria-keyshortcuts="Meta+K Control+K"
          aria-label="Ir a una raza"
          className="max-sm:size-11"
        >
          <Search className="size-5" aria-hidden="true" />
        </Button>
      </Hint>
      {PaletteDialog && <PaletteDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}
