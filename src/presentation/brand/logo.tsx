import { cn } from "../lib/cn";
import { CatMark } from "./cat-mark";

/** Marca: el sello del gato + "Michiverso" en Hubot algo extendida, en pizarra. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <CatMark className="size-9 shrink-0" />
      {!compact && (
        <span className="font-display text-[1.28rem] leading-none tracking-[-0.01em] text-slate">
          <span className="font-extrabold">Michi</span>
          <span className="font-medium text-ink-soft">verso</span>
        </span>
      )}
    </span>
  );
}
