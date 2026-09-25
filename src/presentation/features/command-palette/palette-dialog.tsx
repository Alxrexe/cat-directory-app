"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import { ArrowRight, LayoutList, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { describeCountry } from "@domain/breed/country";
import { normalizeForSearch } from "@domain/breed/search";
import { useMediaQuery } from "../../hooks/use-media-query";
import { useUseCases } from "../../providers/use-cases-provider";
import { useNavigationStore } from "../../stores/navigation-store";
import { breedsQueryOptions } from "../directory/breeds-query";

interface PaletteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Salto rápido a cualquier raza cargada (⌘K). Comparte la consulta paginada
 * con el directorio: si ya bajaste tres páginas, aquí están las tres; si
 * entras directo a un detalle, pide la primera. En pantallas pequeñas se
 * abre como cajón inferior (vaul), que se cierra deslizando.
 */
export default function PaletteDialog({ open, onOpenChange }: PaletteDialogProps) {
  const desktop = useMediaQuery("(min-width: 768px)", true);
  const body = <PaletteBody open={open} close={() => onOpenChange(false)} />;

  if (desktop) {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed top-[14vh] left-1/2 z-50 w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[28px] bg-surface text-ink shadow-[0_0_0_1px_var(--alu-edge),inset_0_1px_0_var(--alu-hi),0_30px_70px_-24px_var(--shadow-deep)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2"
          >
            <DialogPrimitive.Title className="sr-only">Ir a una raza</DialogPrimitive.Title>
            {body}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-[32px] bg-surface text-ink outline-none"
        >
          <div className="mx-auto mt-3 mb-1 h-1.5 w-12 rounded-full bg-ink/15" aria-hidden="true" />
          <Drawer.Title className="sr-only">Ir a una raza</Drawer.Title>
          {body}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function PaletteBody({ open, close }: { open: boolean; close: () => void }) {
  const router = useRouter();
  const { listBreedsPage } = useUseCases();
  const directoryHref = useNavigationStore((state) => state.directoryHref);
  const setLastVisited = useNavigationStore((state) => state.setLastVisited);

  const { data, hasNextPage, fetchNextPage, isFetching } = useInfiniteQuery({
    ...breedsQueryOptions(listBreedsPage),
    enabled: open,
  });
  const breeds = data?.pages.flatMap((page) => page.breeds) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const run = (action: () => void) => {
    close();
    action();
  };

  return (
    <Command
      label="Ir a una raza"
      loop
      filter={(value, search) => (normalizeForSearch(value).includes(normalizeForSearch(search)) ? 1 : 0)}
      className="flex min-h-0 flex-col"
    >
      <Command.Input
        autoFocus
        placeholder="Escribe el nombre de una raza…"
        className="h-14 w-full border-b-[1.5px] border-ring bg-transparent px-5 font-display text-lg outline-none placeholder:text-ink-soft"
      />
      <Command.List data-lenis-prevent className="max-h-[min(26rem,60vh)] overflow-y-auto overscroll-contain p-2">
        <Command.Empty className="px-3 py-6 text-sm text-ink-soft">
          {isFetching ? "Cargando razas…" : "Ninguna raza cargada coincide."}
        </Command.Empty>

        <Group heading={total ? `Razas cargadas · ${breeds.length} de ${total}` : "Razas"}>
          {breeds.map((breed) => (
            <Item
              key={breed.slug}
              value={`${breed.name} ${breed.country ?? ""}`}
              onSelect={() =>
                run(() => {
                  setLastVisited(breed.slug);
                  router.push(`/razas/${breed.slug}`);
                })
              }
            >
              <span className="min-w-0 flex-1 truncate">{breed.name}</span>
              <span className="truncate text-xs text-ink-soft">
                {describeCountry(breed.country)?.primary}
              </span>
            </Item>
          ))}
          {hasNextPage && (
            <Item value="cargar más razas" onSelect={() => void fetchNextPage()}>
              <Plus aria-hidden="true" /> Cargar más razas
            </Item>
          )}
        </Group>

        <Group heading="Acciones">
          <Item value="ir al michiverso directorio" onSelect={() => run(() => router.push(directoryHref))}>
            <LayoutList aria-hidden="true" /> Ir al Michiverso
            <ArrowRight className="ml-auto" aria-hidden="true" />
          </Item>
        </Group>
      </Command.List>
    </Command>
  );
}

function Group({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="py-1 [&_[cmdk-group-heading]]:hud [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-ink-soft"
    >
      {children}
    </Command.Group>
  );
}

function Item({ children, ...props }: React.ComponentProps<typeof Command.Item>) {
  return (
    <Command.Item
      className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold outline-none select-none data-[selected=true]:bg-surface-2 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-soft"
      {...props}
    >
      {children}
    </Command.Item>
  );
}
