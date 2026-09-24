import { normalizeForSearch } from "@domain/breed/search";

/**
 * Resalta la coincidencia sin romper los acentos: se normaliza carácter a
 * carácter para poder traducir la posición encontrada en el texto
 * normalizado a la posición en el texto original.
 */
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
      <mark className="bg-transparent text-primary underline decoration-1 underline-offset-[0.2em]">
        {chars.slice(from, to).join("")}
      </mark>
      {chars.slice(to).join("")}
    </>
  );
}
