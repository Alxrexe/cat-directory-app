import { normalizeForSearch } from "@domain/breed/search";

/** Normaliza carácter a carácter para llevar la posición encontrada al texto con acentos. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const needle = normalizeForSearch(query);
  if (!needle) return <>{text}</>;

  const chars = Array.from(text);
  const offsets: number[] = [];
  let normalized = "";
  chars.forEach((char, index) => {
    const piece = normalizeForSearch(char) || (char === " " ? " " : "");
    for (let i = 0; i < piece.length; i++) offsets.push(index);
    normalized += piece;
  });

  const start = normalized.indexOf(needle);
  if (start === -1) return <>{text}</>;

  const from = offsets[start];
  const to = offsets[start + needle.length - 1] + 1;
  return (
    <>
      {chars.slice(0, from).join("")}
      <mark className="bg-transparent text-[var(--highlight,var(--slate))] underline decoration-2 underline-offset-[0.18em]">
        {chars.slice(from, to).join("")}
      </mark>
      {chars.slice(to).join("")}
    </>
  );
}
