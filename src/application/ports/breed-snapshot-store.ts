import type { BreedPage } from "@domain/breed/breed-page";

export interface BreedSnapshot {
  readonly page: BreedPage;
  /** Epoch en ms. */
  readonly savedAt: number;
}

/** Copia local de la primera página. Síncrona: se lee en el primer efecto del cliente. */
export interface BreedSnapshotStore {
  read(): BreedSnapshot | null;
  write(snapshot: BreedSnapshot): void;
}
