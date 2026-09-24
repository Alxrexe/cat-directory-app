/**
 * El campo `country` mezcla dos formatos:
 *   "United Kingdom (Isle of Man)"                              → país + región
 *   "developed in the United States (founding stock from Asia)" → país donde se
 *                                                                 fijó la raza + linaje
 * En la lista hace falta el país a secas; el matiz se muestra aparte.
 */
export interface CountryDescription {
  /** País que se muestra en la lista. */
  readonly primary: string;
  /** Región o linaje, si el dato lo trae. */
  readonly note: string | null;
  /** La raza se fijó en `primary` a partir de ejemplares de otro lugar. */
  readonly developed: boolean;
}

const DEVELOPED_IN = /^developed in (?:the )?(.+?)\s*\((.+)\)\s*$/i;
const WITH_REGION = /^(.+?)\s*\((.+)\)\s*$/;

export function describeCountry(raw: string | null): CountryDescription | null {
  if (!raw) return null;

  const developed = DEVELOPED_IN.exec(raw);
  if (developed) {
    return { primary: developed[1].trim(), note: developed[2].trim(), developed: true };
  }

  const region = WITH_REGION.exec(raw);
  if (region) {
    return { primary: region[1].trim(), note: region[2].trim(), developed: false };
  }

  return { primary: raw, note: null, developed: false };
}
