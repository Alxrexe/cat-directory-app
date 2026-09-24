import Link from "next/link";
import { PiCatLight } from "react-icons/pi";
import { CommandPalette } from "../../features/command-palette/command-palette";
import { NetworkPill } from "./network-pill";
import { SoundToggle } from "./sound-toggle";
import { ThemeMenu } from "./theme-menu";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 md:px-8">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="Felis, inicio del directorio">
          <PiCatLight className="size-6 text-primary transition-transform duration-300 ease-out group-hover:-rotate-6" aria-hidden="true" />
          <span className="font-serif text-2xl leading-none italic">Felis</span>
          <span className="label-mono hidden border-l border-border pl-2.5 text-muted-foreground sm:inline">
            Razas de gato
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <NetworkPill />
          <CommandPalette />
          <SoundToggle />
          <ThemeMenu />
        </div>
      </div>
    </header>
  );
}
