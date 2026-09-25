export interface CatFact {
  readonly text: string;
}

export class InvalidFactError extends Error {
  constructor() {
    super("Dato curioso vacío");
    this.name = "InvalidFactError";
  }
}

export function createCatFact(text: string): CatFact {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) throw new InvalidFactError();
  return Object.freeze({ text: clean });
}

/** Es para toda la familia: fuera los pocos datos crudos del catálogo. */
const UNSUITABLE = /\b(skins?|eaten|hitler|sexually|fertili[sz]er|by death)\b/i;

export function isFamilyFriendly(fact: CatFact): boolean {
  return !UNSUITABLE.test(fact.text);
}
