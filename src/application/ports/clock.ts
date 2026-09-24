/** Puerto de tiempo: los casos de uso que dependen de la hora se prueban sin esperar. */
export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };
