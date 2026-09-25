import { describe, expect, it, vi } from "vitest";
import { createBreed } from "@domain/breed/breed";
import { createCatFact } from "@domain/fact/fact";
import type { BreedPage } from "@domain/breed/breed-page";
import type { BreedRepository } from "../ports/breed-repository";
import type { BreedSnapshot, BreedSnapshotStore } from "../ports/breed-snapshot-store";
import { createFirstPageSnapshot, SNAPSHOT_MAX_AGE_MS } from "./first-page-snapshot";
import { createGetBreedDossier } from "./get-breed-dossier";
import { createGetRandomFact, FACT_DRAWS, FACT_MAX_LENGTH } from "./get-random-fact";
import { createListBreedsPage } from "./list-breeds-page";
import { createRestoreBreedPages, MAX_RESTORED_PAGES } from "./restore-breed-pages";

/** Repositorio en memoria: `lastPage` páginas de dos razas cada una. */
function fakeRepository(lastPage: number): BreedRepository & { calls: number[] } {
  const calls: number[] = [];
  return {
    calls,
    async getPage(page) {
      calls.push(page);
      return {
        page,
        lastPage,
        perPage: 2,
        total: lastPage * 2,
        breeds: [createBreed({ name: `Breed ${page}A` }), createBreed({ name: `Breed ${page}B` })],
      };
    },
  };
}

describe("listBreedsPage", () => {
  it("rechaza páginas que no existen sin llamar al repositorio", async () => {
    const repository = fakeRepository(3);
    const listBreedsPage = createListBreedsPage({ breeds: repository });
    await expect(listBreedsPage(0)).rejects.toBeInstanceOf(RangeError);
    await expect(listBreedsPage(1.5)).rejects.toBeInstanceOf(RangeError);
    expect(repository.calls).toEqual([]);
  });
});

describe("restoreBreedPages", () => {
  it("reconstruye 1..N en orden y ajusta N a la última página real", async () => {
    const repository = fakeRepository(4);
    const pages = await createRestoreBreedPages({ breeds: repository })(9);
    expect(pages.map((page) => page.page)).toEqual([1, 2, 3, 4]);
  });

  it("no deja que un ?page= enorme dispare cientos de peticiones", async () => {
    const repository = fakeRepository(500);
    const pages = await createRestoreBreedPages({ breeds: repository })(10_000);
    expect(pages).toHaveLength(MAX_RESTORED_PAGES);
  });
});

describe("getBreedDossier", () => {
  it("localiza la raza, su posición y sus vecinas aunque estén en otra página", async () => {
    const restoreBreedPages = createRestoreBreedPages({ breeds: fakeRepository(3) });
    const { getBreedDossier } = createGetBreedDossier({ restoreBreedPages });

    const dossier = await getBreedDossier("breed-2b");
    expect(dossier).toMatchObject({ position: 4, total: 6 });
    expect(dossier?.previous?.name).toBe("Breed 2A");
    expect(dossier?.next?.name).toBe("Breed 3A");
  });

  it("devuelve null para slugs inválidos o inexistentes sin recorrer la API por nada", async () => {
    const repository = fakeRepository(2);
    const { getBreedDossier } = createGetBreedDossier({ restoreBreedPages: createRestoreBreedPages({ breeds: repository }) });

    expect(await getBreedDossier("../../secret")).toBeNull();
    expect(repository.calls).toEqual([]);
    expect(await getBreedDossier("no-existe")).toBeNull();
  });
});

describe("firstPageSnapshot", () => {
  const page: BreedPage = { page: 1, lastPage: 4, perPage: 1, total: 4, breeds: [createBreed({ name: "Bengal" })] };

  function memoryStore(): BreedSnapshotStore & { value: BreedSnapshot | null } {
    return {
      value: null,
      read() {
        return this.value;
      },
      write(snapshot) {
        this.value = snapshot;
      },
    };
  }

  it("solo guarda la primera página", () => {
    const store = memoryStore();
    const snapshot = createFirstPageSnapshot({ snapshots: store, clock: { now: () => 1000 } });
    snapshot.remember({ ...page, page: 2 });
    expect(store.value).toBeNull();
    snapshot.remember(page);
    expect(store.value).toEqual({ page, savedAt: 1000 });
  });

  it("descarta copias caducadas", () => {
    const store = memoryStore();
    const now = vi.fn(() => 0);
    const snapshot = createFirstPageSnapshot({ snapshots: store, clock: { now } });
    snapshot.remember(page);

    now.mockReturnValue(SNAPSHOT_MAX_AGE_MS - 1);
    expect(snapshot.recall()?.page).toEqual(page);
    now.mockReturnValue(SNAPSHOT_MAX_AGE_MS + 1);
    expect(snapshot.recall()).toBeNull();
  });
});

describe("getRandomFact", () => {
  const grim = createCatFact("Approximately 24 cat skins can make a coat.");
  const cozy = createCatFact("Cats sleep 16 to 18 hours per day.");

  it("pide otro dato si el primero no es apto para toda la familia", async () => {
    const getRandom = vi.fn().mockResolvedValueOnce(grim).mockResolvedValueOnce(cozy);
    const getRandomFact = createGetRandomFact({ facts: { getRandom } });

    await expect(getRandomFact()).resolves.toBe(cozy);
    expect(getRandom).toHaveBeenCalledTimes(2);
    expect(getRandom).toHaveBeenCalledWith({ maxLength: FACT_MAX_LENGTH });
  });

  it("no insiste para siempre: tras el límite muestra el último", async () => {
    const getRandom = vi.fn().mockResolvedValue(grim);
    const getRandomFact = createGetRandomFact({ facts: { getRandom } });

    await expect(getRandomFact()).resolves.toBe(grim);
    expect(getRandom).toHaveBeenCalledTimes(FACT_DRAWS);
  });
});
