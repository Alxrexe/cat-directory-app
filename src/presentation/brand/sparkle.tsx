import { cn } from "../lib/cn";

/** Destello de cuatro puntas (Y2K). Decorativo; titila con transform/opacidad. */
export function Sparkle({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ animationDelay: `${delay}s` }}
      className={cn("pointer-events-none animate-twinkle", className)}
    >
      <path d="M12 0 C12.9 7.6 16.4 11.1 24 12 C16.4 12.9 12.9 16.4 12 24 C11.1 16.4 7.6 12.9 0 12 C7.6 11.1 11.1 7.6 12 0 Z" fill="currentColor" />
    </svg>
  );
}
