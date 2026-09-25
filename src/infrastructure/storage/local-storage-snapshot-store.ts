import * as z from "zod/mini";
import { createBreed } from "@domain/breed/breed";
import type { BreedSnapshot, BreedSnapshotStore } from "@application/ports/breed-snapshot-store";

/** Versión en la clave: si cambia la forma guardada, la copia vieja se ignora sola. */
export const SNAPSHOT_KEY = "cat-directory:first-page:v1";

const storedSnapshotSchema = z.object({
  savedAt: z.number(),
  page: z.object({
    page: z.int().check(z.positive()),
    lastPage: z.int().check(z.positive()),
    perPage: z.int().check(z.positive()),
    total: z.int().check(z.nonnegative()),
    breeds: z.array(
      z.object({
        name: z.string(),
        country: z.nullable(z.string()),
        origin: z.nullable(z.string()),
        coat: z.nullable(z.string()),
        pattern: z.nullable(z.string()),
      }),
    ),
  }),
});

/** Cada acceso en try/catch: en modo privado o sin espacio, localStorage lanza. */
export function createLocalStorageSnapshotStore(storage: () => Storage | undefined): BreedSnapshotStore {
  return {
    read() {
      try {
        const raw = storage()?.getItem(SNAPSHOT_KEY);
        if (!raw) return null;
        const parsed = storedSnapshotSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) return null;
        const { page, savedAt } = parsed.data;
        return { savedAt, page: { ...page, breeds: page.breeds.map((breed) => createBreed(breed)) } };
      } catch {
        return null;
      }
    },
    write(snapshot: BreedSnapshot) {
      try {
        storage()?.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
      } catch {
        // Sin espacio o sin permiso: se sigue sin copia.
      }
    },
  };
}
