import { Moon, Sun } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "../ui/button";

/** El mismo botón antes y después de que llegue el menú: sin salto visual. */
export function ThemeTriggerButton(props: ComponentProps<typeof Button>) {
  return (
    <Button variant="ghost" size="icon" aria-label="Tema de color" {...props}>
      <Sun className="dark:hidden" aria-hidden="true" />
      <Moon className="hidden dark:block" aria-hidden="true" />
    </Button>
  );
}
