"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { ExternalLink, Feather, Globe2, Palette, Sprout } from "lucide-react";
import { Fragment, useEffect, useRef, type ComponentType } from "react";
import type { Breed } from "@domain/breed/breed";
import { coatFamily, type CoatShare } from "@domain/breed/coat";
import { describeCountry } from "@domain/breed/country";
import type { BreedPhoto, BreedProfile } from "@domain/breed/profile";
import { COAT_LABEL, MISSING } from "../lib/format";
import { readyGsap } from "../lib/gsap";
import { useIdleModule } from "../lib/idle";

export type ScreenTab = "ficha" | "historia" | "familia";
export const SCREEN_TABS: ScreenTab[] = ["ficha", "historia", "familia"];
const TAB_LABEL: Record<ScreenTab, string> = { ficha: "Ficha", historia: "Historia", familia: "Familia" };

// La pestaña Familia (carrusel de embla, fotos y gráfico) va en su propio
// chunk: se precarga en ocioso y se pide ya al abrir la pestaña.
const loadFamily = () => import("./family-tab");

// En escritorio el panel mide lo que deja la pantalla y se desplaza por
// dentro; es enfocable (Radix le da tabindex 0), así que también con teclado.
// El borde inferior se funde: si hay más contenido, se nota que sigue.
const PANEL =
  "rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-screen-accent/60 lg:absolute lg:inset-0 lg:-mr-2 lg:overflow-y-auto lg:overscroll-contain lg:pr-2 lg:pb-4 lg:[mask-image:linear-gradient(to_bottom,black_calc(100%-1rem),transparent)] [scrollbar-color:oklch(82%_0.09_255/0.4)_transparent] [scrollbar-width:thin]";

export interface DeviceScreenProps {
  breed: Breed;
  profile: BreedProfile | null;
  coats: readonly CoatShare[];
  total: number;
  related: readonly Breed[];
  relatedPhotos: Readonly<Record<string, BreedPhoto | null>>;
  tab: ScreenTab;
  onTabChange: (tab: ScreenTab) => void;
  onOpenRelated: (slug: string) => void;
}

/**
 * Pantalla LCD del Ronrón: nombre, país y tres pestañas (Radix Tabs, con
 * sus flechas de teclado). Cambiar de pestaña desliza el contenido unos
 * píxeles y lo funde: nunca aparece de golpe.
 */
export function DeviceScreen(props: DeviceScreenProps) {
  const { breed, tab } = props;
  const country = describeCountry(breed.country);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current?.querySelector(`[data-tab="${tab}"]`);
    const gsap = readyGsap();
    if (!gsap || !panel || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tween = gsap.fromTo(panel, { x: 14, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: "power3.out" });
    return () => {
      tween.kill();
    };
  }, [tab, breed.slug]);

  return (
    <div data-screen className="squircle flex min-h-0 flex-1 flex-col rounded-[30px] screen-glass p-2">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[26px] p-4 ring-1 ring-white/5 sm:p-5">
        {/* Líneas de barrido del LCD: estáticas, casi invisibles. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgb(255_255_255/0.035)_0_1px,transparent_1px_3px)]"
        />

        <header className="relative">
          <h2 id="ronron-name" data-device-name className="font-display text-[clamp(1.8rem,3.6vw,2.35rem)] leading-[1.05] font-semibold text-screen-ink">
            {breed.name}
          </h2>
          <p className="mt-1 text-[0.95rem] text-screen-soft">
            {country?.primary ?? "País sin registrar"}
            {country?.note && <span className="text-screen-soft"> · {country.note}</span>}
          </p>
        </header>

        <Tabs.Root
          value={tab}
          onValueChange={(value) => props.onTabChange(value as ScreenTab)}
          className="relative mt-3.5 flex min-h-0 flex-1 flex-col"
        >
          <Tabs.List aria-label="Secciones de la ficha" className="flex gap-1 rounded-full bg-track p-1 shadow-[inset_0_1px_3px_var(--shadow-deep)]">
            {SCREEN_TABS.map((value) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className="hud h-9 flex-1 rounded-full text-screen-soft data-[state=active]:bg-[linear-gradient(180deg,var(--key-hi),var(--key-lo))] data-[state=active]:text-screen data-[state=active]:shadow-[inset_0_1px_0_var(--sheen),inset_0_-1px_0_var(--shade),0_2px_6px_-2px_var(--shadow-deep)]"
              >
                {TAB_LABEL[value]}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <div ref={panelRef} className="relative mt-3 min-h-[15rem] lg:min-h-0 lg:flex-1">
            <Tabs.Content value="ficha" data-tab="ficha" data-lenis-prevent className={PANEL}>
              <SheetTab {...props} />
            </Tabs.Content>
            <Tabs.Content value="historia" data-tab="historia" data-lenis-prevent className={PANEL}>
              <HistoryTab profile={props.profile} name={breed.name} />
            </Tabs.Content>
            <Tabs.Content value="familia" data-tab="familia" data-lenis-prevent className={PANEL}>
              <FamilyPanel {...props} />
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </div>
    </div>
  );
}

function SheetTab({ breed, coats, total }: DeviceScreenProps) {
  const country = describeCountry(breed.country);
  const family = coatFamily(breed.coat);
  const share = coats.find((item) => item.family === family);
  const barRef = useRef<HTMLDivElement>(null);

  // La barra se pinta ya en su medida (sirve sin JS); con GSAP, además, crece.
  const ratio = share ? share.count / Math.max(1, total) : 0;
  useEffect(() => {
    const gsap = readyGsap();
    if (!gsap || !barRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tween = gsap.fromTo(barRef.current, { scaleX: 0 }, { scaleX: ratio, duration: 1, ease: "power3.out", delay: 0.2 });
    return () => {
      tween.kill();
    };
  }, [ratio, breed.slug]);

  const stats: Array<{ icon: ComponentType<{ className?: string }>; label: string; field: string; value: string | null; note?: string | null }> = [
    { icon: Globe2, label: "País", field: "country", value: country?.primary ?? null, note: country?.note },
    { icon: Sprout, label: "Origen", field: "origin", value: breed.origin },
    { icon: Feather, label: "Pelaje", field: "coat", value: breed.coat, note: family !== "unknown" ? COAT_LABEL[family] : null },
    { icon: Palette, label: "Patrón", field: "pattern", value: breed.pattern },
  ];

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-2">
        {stats.map(({ icon: Icon, label, field, value, note }) => (
          <div key={field} className="rounded-2xl bg-white/[0.06] px-3 py-2.5">
            <dt className="hud flex items-center gap-1.5 text-screen-soft">
              <Icon className="size-3.5 text-screen-accent" aria-hidden="true" />
              {label}
              <span className="sr-only">({field})</span>
            </dt>
            <dd className="mt-1 text-[0.98rem] leading-snug font-semibold wrap-break-word text-screen-ink">
              {value ? <SlashBreaks text={value} /> : <span className="font-normal text-screen-soft">{MISSING}</span>}
              {note && <span className="mt-0.5 block text-xs font-normal text-screen-soft">{note}</span>}
            </dd>
          </div>
        ))}
      </dl>

      {share && (
        <div>
          <p className="text-sm text-screen-soft">
            <span className="font-semibold text-screen-ink">{share.count}</span> de {total} razas del Michiverso tienen pelaje{" "}
            {COAT_LABEL[family].toLowerCase()}.
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div
              ref={barRef}
              style={{ transform: `scaleX(${ratio})` }}
              className="h-full w-full origin-left rounded-full bg-gradient-to-r from-screen-accent to-ring"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * "Natural/Standard" es una sola palabra para el navegador: en una tarjeta
 * estrecha se partiría por cualquier letra. Un <wbr> tras cada barra deja
 * cortar justo ahí.
 */
function SlashBreaks({ text }: { text: string }) {
  const parts = text.split("/");
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && (
        <>
          /<wbr />
        </>
      )}
    </Fragment>
  ));
}

function HistoryTab({ profile, name }: { profile: BreedProfile | null; name: string }) {
  if (!profile?.summary) {
    return (
      <p className="text-[0.95rem] leading-relaxed text-screen-soft">
        Wikipedia no tiene un artículo sobre {name} que podamos citar. La ficha y el dato curioso siguen disponibles.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p lang={profile.summaryLanguage ?? undefined} className="text-[0.98rem] leading-relaxed text-screen-ink">
        {profile.summary}
      </p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-screen-soft">
        {profile.summaryLanguage === "en" && <span>Resumen en inglés: no hay artículo en español.</span>}
        <a
          href={profile.source.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-screen-accent underline underline-offset-2"
        >
          Leer en Wikipedia <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </p>
    </div>
  );
}

function FamilyPanel(props: DeviceScreenProps) {
  const family = useIdleModule(loadFamily, { now: props.tab === "familia" });
  const FamilyTab = family?.default;
  if (FamilyTab) return <FamilyTab {...props} />;
  return (
    <div role="status" aria-label="Cargando la familia" className="flex gap-3 overflow-hidden">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="aspect-[4/3] w-32 shrink-0 animate-pulse rounded-2xl bg-white/[0.06]" />
      ))}
    </div>
  );
}
