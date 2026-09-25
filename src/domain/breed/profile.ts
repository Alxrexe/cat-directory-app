/** Foto y resumen de otra fuente (Wikipedia). Opcional. */
export interface BreedPhoto {
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

export type ProfileLanguage = "es" | "en";

export interface BreedProfile {
  readonly photo: BreedPhoto | null;
  readonly summary: string | null;
  readonly summaryLanguage: ProfileLanguage | null;
  /** Artículo del que sale el perfil, para citarlo. */
  readonly source: { readonly title: string; readonly url: string; readonly language: ProfileLanguage };
}

/** Recorta el resumen a frases completas: una ficha no es un artículo. */
export function trimSummary(text: string, maxLength = 420): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return lastStop > maxLength * 0.5 ? cut.slice(0, lastStop + 1) : `${cut.replace(/\s+\S*$/, "")}…`;
}
