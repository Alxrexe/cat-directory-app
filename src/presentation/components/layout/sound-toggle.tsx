"use client";

import * as TogglePrimitive from "@radix-ui/react-toggle";
import { Volume2, VolumeX } from "lucide-react";
import { buttonVariants } from "../ui/button";
import { Hint } from "../ui/hint";
import { usePreferencesStore } from "../../stores/preferences-store";
import { playCue } from "../../lib/sound";
import { cn } from "../../lib/cn";

export function SoundToggle() {
  const sound = usePreferencesStore((state) => state.sound);
  const setSound = usePreferencesStore((state) => state.setSound);

  return (
    <Hint label={sound ? "Silenciar" : "Activar sonidos"}>
      <TogglePrimitive.Root
        pressed={sound}
        onPressedChange={(pressed) => {
          setSound(pressed);
          if (pressed) playCue("toggle");
        }}
        aria-label="Sonidos de interfaz"
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "data-[state=on]:text-primary")}
      >
        {sound ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
      </TogglePrimitive.Root>
    </Hint>
  );
}
