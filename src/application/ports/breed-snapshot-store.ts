import type { BreedPage } from "@domain/breed/breed-page";

export interface BreedSnapshot {
  readonly page: BreedPage;
  /** Epoch en ms. */
  readonly savedAt: number;
}

/**
 * Puerto secundario: copia local de la primera página, para abrir la app sin
 * red. Síncrono a propósito: se lee en el primer efecto del cliente y tiene
 * que estar ahí en ese mismo frame.
 */
export interface BreedSnapshotStore {
  read(): BreedSnapshot | null;
  write(snapshot: BreedSnapshot): void;
}
