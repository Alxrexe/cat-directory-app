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
