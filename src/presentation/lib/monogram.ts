/**
 * Nombre corto de una raza, sin aclaraciones: "Persian (Modern Persian Cat)"
 * → "Persian", "Donskoy, or Don Sphynx" → "Donskoy", "Foldex[4]" → "Foldex".
 */
export function shortBreedName(name: string): string {
  return name
    .replace(/\[\d+\]/g, "")
    .replace(/\s*\(.*?\)/g, "")
    .split(",")[0]
    .trim();
}

/**
 * Monograma del orbe: iniciales de las dos primeras palabras ("American
 * Curl" → "AC") o las dos primeras letras si es una sola ("Bengal" → "Be").
 */
export function breedMonogram(name: string): string {
  const words = shortBreedName(name)
    .split(/[\s-]+/)
    .filter((word) => /\p{L}/u.test(word));
  if (words.length === 0) return "?";
  if (words.length === 1) {
    const [first, second = ""] = Array.from(words[0]);
    return `${first.toUpperCase()}${second.toLowerCase()}`;
  }
  return `${Array.from(words[0])[0]}${Array.from(words[1])[0]}`.toUpperCase();
}
