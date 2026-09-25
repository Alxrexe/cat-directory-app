/** Sin distinguir mayúsculas ni acentos: "pérs" encuentra "Persian". */
export function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function filterByName<T extends { readonly name: string }>(items: readonly T[], term: string): readonly T[] {
  const needle = normalizeForSearch(term);
  if (!needle) return items;
  return items.filter((item) => normalizeForSearch(item.name).includes(needle));
}
