import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

// Fondo de hover como capa aparte que solo cambia de opacidad (compositor),
// en lugar de transicionar `background-color`.
const hoverLayer =
  "before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:opacity-0 before:transition-opacity before:duration-200 hover:before:opacity-100";

/**
 * Botones de consola. Tres voces:
 * - `default`: pizarra anodizada (la acción principal de la vista).
 * - `outline`: porcelana con canto de aluminio (acciones secundarias).
 * - `console`: la tapa de aluminio torneado del menú, para iconos.
 * Al pulsarlos bajan un píxel, como una tecla. Solo se animan transform y
 * opacidad; el fondo de hover es una capa que se funde.
 */
export const buttonVariants = cva(
  "relative isolate inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-display font-medium whitespace-nowrap select-none transition-transform duration-200 ease-[var(--ease-cozy)] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.1em]",
  {
    variants: {
      variant: {
        default: "anodized hover:-translate-y-0.5",
        outline: "porcelain text-ink hover:-translate-y-0.5",
        console: "console-dot text-slate hover:-translate-y-0.5",
        ghost: cn("text-ink before:bg-slate/8", hoverLayer),
        link: "h-auto rounded-none px-0 text-slate underline decoration-ring decoration-2 underline-offset-4 hover:decoration-accent",
      },
      size: {
        default: "h-11 px-5 text-[0.95rem]",
        sm: "h-9 px-4 text-sm",
        lg: "h-13 px-7 text-lg",
        icon: "size-11",
        "icon-lg": "size-13",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
