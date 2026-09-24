import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { describeCountry } from "@domain/breed/country";
import { BreedNameTransition } from "../../components/breed-name-transition";
import { MISSING, padIndex } from "../../lib/format";
import { Highlight } from "./highlight";
import type { DirectoryEntry } from "./use-breed-directory";

interface BreedRowProps {
  entry: DirectoryEntry;
  index: number;
  active: boolean;
  query: string;
  onFocusRow: (index: number) => void;
  onOpen: (slug: string) => void;
}

export const BreedRow = memo(function BreedRow({ entry, index, active, query, onFocusRow, onOpen }: BreedRowProps) {
  const { breed } = entry;
  const country = describeCountry(breed.country);

  return (
    <Link
      href={`/razas/${breed.slug}`}
      data-row-index={index}
      data-cue="breed"
      tabIndex={active ? 0 : -1}
      onFocus={() => onFocusRow(index)}
      onClick={() => onOpen(breed.slug)}
      className="group grid min-h-[76px] grid-cols-[2.75rem_minmax(0,1fr)_1.25rem] items-center gap-x-3 border-b border-border py-3 outline-offset-[-2px] transition-colors duration-150 hover:bg-muted/60 md:grid-cols-[3.5rem_minmax(0,1.25fr)_minmax(0,1fr)_1.25rem] md:gap-x-6 lg:grid-cols-[3.5rem_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.7fr)_1.25rem]"
    >
      <span className="label-mono text-faint" aria-hidden="true">
        {padIndex(entry.position)}
      </span>

      <span className="min-w-0">
        <BreedNameTransition slug={breed.slug}>
          <span className="block truncate font-serif text-[1.625rem] leading-tight md:text-[2rem]">
            <Highlight text={breed.name} query={query} />
          </span>
        </BreedNameTransition>
        <span className="mt-0.5 block truncate text-sm text-muted-foreground md:hidden">
          {country?.primary ?? MISSING}
        </span>
      </span>

      <span className="hidden min-w-0 md:block">
        <span className="block truncate text-[0.9375rem]">{country?.primary ?? MISSING}</span>
        {country?.note && (
          <span className="block truncate text-xs text-muted-foreground">
            {country.developed ? `Linaje: ${country.note.replace(/^founding stock from /i, "")}` : country.note}
          </span>
        )}
      </span>

      <span className="label-mono hidden truncate text-muted-foreground lg:block">{breed.origin ?? "—"}</span>

      <ArrowUpRight
        className="size-4 text-faint transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary group-focus-visible:text-primary"
        aria-hidden="true"
      />
    </Link>
  );
});
