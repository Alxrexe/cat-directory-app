"use client";

import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { BreedPage } from "@domain/breed/breed-page";
import { coatFamily } from "@domain/breed/coat";
import { describeCountry } from "@domain/breed/country";
import { filterByName } from "@domain/breed/search";
import type { SerializedDataSourceError } from "@application/errors";
import { SearchDock, type SearchDockHandle } from "../dock/search-dock";
import type { FieldBreed, FieldEngine, OrbTarget } from "../field/engine/engine";
import { OrbField } from "../field/orb-field";
import { useBreedDirectory } from "../features/directory/use-breed-directory";
import { useDirectoryUrlState } from "../hooks/use-directory-url-state";
import { useMediaQuery } from "../hooks/use-media-query";
import { directorySearch } from "../lib/directory-params";
import { describeError } from "../lib/error-copy";
import { breedMonogram, shortBreedName } from "../lib/monogram";
import { notify } from "../lib/notify";
import { playCue } from "../lib/sound";
import { StartGate } from "../simulation/start-gate";
import { useSimulationStore, type SimulationPhase } from "../simulation/simulation-store";
import { useDeviceStore } from "../stores/device-store";
import { useNavigationStore } from "../stores/navigation-store";
import { TopBar } from "../top-bar/top-bar";

interface HomeExperienceProps {
  initialPages: readonly BreedPage[];
  serverError: SerializedDataSourceError | null;
  renderedAt: number;
}

/** El enlace dura al menos esto aunque todo cargue antes. */
const MIN_LINK_MS = 2400;
/** Del iris a que entren la barra y la consola. */
const ASSEMBLE_MS = 1250;

/**
 * Home: pantalla de inicio, enlace, campo y consola. Las páginas viven en
 * React Query, búsqueda/pelaje/página en la URL y la fase en Zustand; el
 * campo 3D solo recibe datos.
 */
export function HomeExperience({ initialPages, serverError, renderedAt }: HomeExperienceProps) {
  const router = useRouter();
  const directory = useBreedDirectory({ initialPages, renderedAt });
  const { params, setQuery, setPage, setCoat } = useDirectoryUrlState();
  const [restorePage] = useState(params.page);

  // Cargar la página siempre pasa por la pantalla de inicio; volver de una ficha, no.
  const [skipGate] = useState(() => useSimulationStore.getState().entered);
  const [phase, setPhase] = useState<SimulationPhase>(skipGate ? "running" : "gate");
  const [gateMounted, setGateMounted] = useState(!skipGate);
  const [tunnelVisible, setTunnelVisible] = useState(false);
  const [arriving, setArriving] = useState(false);
  // El motor se crea con el primer movimiento del puntero: al pulsar ya está listo.
  const [warm, setWarm] = useState(false);
  const [fieldFailed, setFieldFailed] = useState(false);
  const [spotlight, setSpotlight] = useState<string | null>(null);
  const engineRef = useRef<FieldEngine | null>(null);
  const phaseRef = useRef(phase);
  const startedAt = useRef(0);
  const dockRef = useRef<SearchDockHandle>(null);

  const steps = useSimulationStore((state) => state.steps);
  const completeStep = useSimulationStore((state) => state.completeStep);
  const deviceOpen = useDeviceStore((state) => state.open);
  const setDirectoryHref = useNavigationStore((state) => state.setDirectoryHref);

  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const { q: query, coat } = params;
  const filtering = query.length > 0 || coat !== "all";
  const results = useMemo(() => {
    const byName = filterByName(directory.entries, query);
    return coat === "all" ? byName : byName.filter((entry) => coatFamily(entry.breed.coat) === coat);
  }, [directory.entries, query, coat]);

  const matchMask = useMemo(() => {
    if (!filtering) return null;
    const mask = new Uint8Array(directory.entries.length);
    const matching = new Set(results.map((entry) => entry.breed.slug));
    directory.entries.forEach((entry, index) => {
      mask[index] = matching.has(entry.breed.slug) ? 1 : 0;
    });
    return mask;
  }, [filtering, results, directory.entries]);

  const fieldBreeds = useMemo<FieldBreed[]>(
    () =>
      directory.entries.map(({ breed }) => ({
        slug: breed.slug,
        name: breed.name,
        country: describeCountry(breed.country)?.primary ?? null,
        monogram: breedMonogram(breed.name),
        label: shortBreedName(breed.name),
      })),
    [directory.entries],
  );

  useEffect(() => {
    phaseRef.current = phase;
    useSimulationStore.getState().setPhase(phase);
    if (phase !== "gate") useSimulationStore.getState().activateSky();
  }, [phase]);

  useEffect(() => {
    setDirectoryHref(`/${directorySearch(params)}`);
  }, [params, setDirectoryHref]);

  useEffect(() => {
    if (directory.entries.length > 0) completeStep("breeds");
  }, [directory.entries.length, completeStep]);

  // El cielo cuenta como listo cuando su video suena o, como mucho, a los 3,5 s.
  useEffect(() => {
    if (phase !== "linking") return;
    if (reducedMotion) completeStep("sky");
    const timer = setTimeout(() => completeStep("sky"), 3500);
    return () => clearTimeout(timer);
  }, [phase, reducedMotion, completeStep]);

  const start = useCallback(() => {
    startedAt.current = performance.now();
    setPhase("linking");
    const engine = engineRef.current;
    if (engine) {
      engine.beginLink();
      setTunnelVisible(true);
    }
  }, []);

  const onEngineReady = useCallback(
    (engine: FieldEngine) => {
      engineRef.current = engine;
      completeStep("engine");
      completeStep("orbs");
      if (phaseRef.current === "gate") return;
      if (phaseRef.current === "linking") {
        engine.beginLink();
        setTunnelVisible(true);
      } else {
        engine.reveal();
      }
    },
    [completeStep],
  );

  const onFieldFailed = useCallback(() => {
    setFieldFailed(true);
    completeStep("engine");
    completeStep("orbs");
    notify.info("Modo consola", {
      description: "Tu navegador no pudo iniciar la simulación 3D. La búsqueda y el Ronrón funcionan igual.",
    });
  }, [completeStep]);

  const allDone = steps.every((step) => step.done);
  useEffect(() => {
    if (phase !== "linking" || !allDone) return;
    const wait = Math.max(0, MIN_LINK_MS - (performance.now() - startedAt.current));
    let enter: ReturnType<typeof setTimeout>;
    const timer = setTimeout(() => {
      void engineRef.current?.arrive();
      setArriving(true);
      playCue("ready");
      enter = setTimeout(
        () => {
          setPhase("running");
          useSimulationStore.getState().markEntered();
        },
        engineRef.current ? ASSEMBLE_MS : 0,
      );
    }, wait);
    return () => {
      clearTimeout(timer);
      clearTimeout(enter);
    };
  }, [phase, allDone]);

  const openFromOrb = useCallback(
    (target: OrbTarget) => {
      useSimulationStore.getState().setOrigin({ x: target.x, y: target.y, size: target.size });
      useDeviceStore.getState().setDirection(0);
      playCue("droplet");
      router.push(`/razas/${target.slug}`, { scroll: false });
    },
    [router],
  );

  const openFromList = useCallback((_slug: string, rect: DOMRect) => {
    useSimulationStore.getState().setOrigin({
      x: rect.left + 28,
      y: rect.top + rect.height / 2,
      size: 44,
    });
    useDeviceStore.getState().setDirection(0);
  }, []);

  const prefetch = useCallback((slug: string | null) => slug && router.prefetch(`/razas/${slug}`), [router]);

  const { hasNextPage, loadMore } = directory;
  const explore = useCallback(() => {
    if (!hasNextPage) return;
    playCue("page");
    loadMore();
  }, [hasNextPage, loadMore]);

  // Los avisos llegan después de agotar los reintentos del cliente HTTP.
  const { nextPageError, initialError, retryNextPage, retryInitial, refresh } = directory;
  useEffect(() => {
    if (!nextPageError) return;
    const copy = describeError(nextPageError);
    playCue("error");
    notify.error(`Página ${directory.loadedPages + 1}: ${copy.title}`, {
      description: copy.description,
      action: { label: "Reintentar", onClick: retryNextPage },
    });
  }, [nextPageError, directory.loadedPages, retryNextPage]);

  useEffect(() => {
    if (!initialError) return;
    const copy = describeError(initialError);
    playCue("error");
    notify.error(copy.title, {
      description: copy.description,
      action: { label: "Reintentar", onClick: () => void retryInitial() },
    });
  }, [initialError, retryInitial]);

  useEffect(() => {
    if (!serverError || phase === "gate") return;
    notify.warning("El servidor no alcanzó la API", {
      description: "Reintentando desde tu navegador…",
    });
  }, [serverError, phase]);

  const onRefresh = useCallback(
    async function run(): Promise<void> {
      const result = await refresh();
      if (result.ok) {
        playCue("success");
        notify.success("Michiverso actualizado", {
          description: `Página 1 recargada · ${result.total} razas en total`,
        });
        setPage(1);
        return;
      }
      const copy = describeError(result.error);
      playCue("error");
      notify.error(`No se pudo recargar: ${copy.title}`, {
        description: `${copy.description} Conservas todo lo que ya tenías.`,
        action: { label: "Reintentar", onClick: () => void run() },
      });
    },
    [refresh, setPage],
  );

  const focusSearch = useEffectEvent(() => dockRef.current?.focusSearch());
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if ((event.target as HTMLElement | null)?.closest("input, textarea, [contenteditable='true']")) return;
      if (phaseRef.current !== "running") return;
      event.preventDefault();
      focusSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const running = phase === "running";
  const announcement = filtering
    ? `${results.length} ${results.length === 1 ? "raza coincide" : "razas coinciden"}`
    : directory.entries.length > 0
      ? `${directory.entries.length} de ${directory.total} razas despiertas`
      : "";

  return (
    <>
      <h1 className="sr-only">Michiverso: directorio de razas de gato</h1>

      {(phase !== "gate" || warm) && !fieldFailed && (
        <OrbField
          dormant={phase === "gate"}
          breeds={fieldBreeds}
          capacity={directory.total || fieldBreeds.length}
          matchMask={matchMask}
          spotlight={spotlight}
          dimmed={deviceOpen}
          reducedMotion={reducedMotion}
          onReady={onEngineReady}
          onFailed={onFieldFailed}
          onPick={openFromOrb}
          onExplore={explore}
          onHoverChange={prefetch}
          onPress={() => dockRef.current?.collapse()}
        />
      )}

      {/* Nada suspende: los <Suspense> reparten la hidratación en tareas cortas. */}
      {gateMounted && (
        <Suspense fallback={null}>
          <StartGate
            phase={phase}
            arriving={arriving}
            tunnelVisible={tunnelVisible}
            total={directory.total}
            onStart={start}
            onWarm={() => setWarm(true)}
            onLeft={() => setGateMounted(false)}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <TopBar visible={running} total={directory.total} />
      </Suspense>

      <Suspense fallback={null}>
        <SearchDock
          ref={dockRef}
          visible={running && !deviceOpen}
          directory={directory}
          results={results}
          query={query}
          coat={coat}
          restorePage={restorePage}
          initialExpanded={filtering || restorePage > 1}
          announcement={announcement}
          onQueryChange={setQuery}
          onCoatChange={setCoat}
          onVisiblePageChange={setPage}
          onOpen={openFromList}
          onSpotlight={setSpotlight}
          onRefresh={onRefresh}
        />
      </Suspense>

      <p className="sr-only" role="status" aria-live="polite">
        {running ? announcement : ""}
      </p>
    </>
  );
}
