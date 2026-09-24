import type { BreedPage } from "@domain/breed/breed-page";
import type { BreedSnapshot, BreedSnapshotStore } from "../ports/breed-snapshot-store";
import type { Clock } from "../ports/clock";

/** Una copia de más de una semana se descarta: ya no representa el directorio. */
export const SNAPSHOT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface FirstPageSnapshotDeps {
  snapshots: BreedSnapshotStore;
  clock: Clock;
}

export function createFirstPageSnapshot({ snapshots, clock }: FirstPageSnapshotDeps) {
  /** Guarda la primera página. Cualquier otra se ignora: la copia es para arrancar, no para navegar. */
  function remember(page: BreedPage): void {
    if (page.page !== 1 || page.breeds.length === 0) return;
    snapshots.write({ page, savedAt: clock.now() });
  }

  function recall(): BreedSnapshot | null {
    const snapshot = snapshots.read();
    if (!snapshot) return null;
    const age = clock.now() - snapshot.savedAt;
    return age >= 0 && age <= SNAPSHOT_MAX_AGE_MS ? snapshot : null;
  }

  return { remember, recall };
}
