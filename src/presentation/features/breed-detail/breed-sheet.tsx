import type { Breed } from "@domain/breed/breed";
import { coatFamily } from "@domain/breed/coat";
import { describeCountry } from "@domain/breed/country";
import { COAT_LABEL, MISSING } from "../../lib/format";

/**
 * Los cinco campos de la API, con su nombre original debajo de la etiqueta:
 * quien revisa la prueba reconoce cada dato de un vistazo.
 */
export function BreedSheet({ breed }: { breed: Breed }) {
  const country = describeCountry(breed.country);
  const family = coatFamily(breed.coat);

  const rows: Array<{ field: string; label: string; value: string | null; note?: string | null }> = [
    { field: "breed", label: "Raza", value: breed.name },
    { field: "country", label: "País", value: country?.primary ?? null, note: country?.note },
    { field: "origin", label: "Origen", value: breed.origin },
    {
      field: "coat",
      label: "Pelaje",
      value: breed.coat,
      note: family !== "unknown" ? `Familia: ${COAT_LABEL[family].toLowerCase()}` : null,
    },
    { field: "pattern", label: "Patrón", value: breed.pattern },
  ];

  return (
    <dl className="border-t border-foreground">
      {rows.map((row) => (
        <div key={row.field} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 border-b border-border py-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <dt>
            <span className="label-mono block text-muted-foreground">{row.label}</span>
            <span className="mt-1 block font-mono text-xs text-faint">{row.field}</span>
          </dt>
          <dd className="min-w-0">
            {row.value ? (
              <span className="text-lg wrap-break-word">{row.value}</span>
            ) : (
              <span className="text-lg text-faint">{MISSING}</span>
            )}
            {row.note && <span className="mt-1 block text-sm text-muted-foreground">{row.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
