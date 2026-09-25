"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import { Search, X } from "lucide-react";
import { useEffect, useEffectEvent, useImperativeHandle, useRef, type Ref } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { useDebouncedValue } from "../../hooks/use-debounced-value";
import { useMediaQuery } from "../../hooks/use-media-query";
import { SEARCH_MAX_LENGTH } from "../../lib/directory-params";
import { cn } from "../../lib/cn";
import { loadOnce } from "../../lib/idle";
import type { SearchValues } from "./search-schema";

const SEARCH_DEBOUNCE_MS = 300;

// Zod y su resolver llegan con la primera tecla, no con la página. Sin red
// (el chunk no baja) se aplica el mismo límite a mano.
const loadSchema = () => loadOnce(() => import("./search-schema"));

const resolver: Resolver<SearchValues> = async (values, context, options) => {
  try {
    return await (await loadSchema()).searchResolver(values, context, options);
  } catch {
    return { values, errors: {} };
  }
};

async function parseSearch(query: string): Promise<string | null> {
  try {
    return (await loadSchema()).parseSearch(query);
  } catch {
    return query.length <= SEARCH_MAX_LENGTH ? query.trim() : null;
  }
}

export interface SearchFieldHandle {
  focus: () => void;
  clear: () => void;
}

interface SearchFieldProps {
  defaultQuery: string;
  /** Ya con debounce: es lo que va a la URL. */
  onQueryChange: (query: string) => void;
  onEnterList: () => void;
  onFocus?: () => void;
  onEscapeEmpty?: () => void;
  listId: string;
  resultsLabel: string;
  ref?: Ref<SearchFieldHandle>;
}

export function SearchField({
  defaultQuery,
  onQueryChange,
  onEnterList,
  onFocus,
  onEscapeEmpty,
  listId,
  resultsLabel,
  ref,
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const form = useForm<SearchValues>({
    resolver,
    defaultValues: { q: defaultQuery },
    mode: "onChange",
  });
  const value = useWatch({ control: form.control, name: "q" }) ?? "";
  const debounced = useDebouncedValue(value, SEARCH_DEBOUNCE_MS);
  const error = form.formState.errors.q?.message;

  const publish = useEffectEvent((query: string | null) => {
    if (query !== null) onQueryChange(query);
  });
  const settled = useRef(defaultQuery);
  useEffect(() => {
    if (debounced === settled.current) return;
    settled.current = debounced;
    let current = true;
    void parseSearch(debounced).then((query) => current && publish(query));
    return () => {
      current = false;
    };
  }, [debounced]);

  const clear = () => {
    form.setValue("q", "", { shouldValidate: true });
    onQueryChange(""); // limpiar no espera al debounce
    inputRef.current?.focus();
  };

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus(), clear }));

  const { ref: registerRef, ...field } = form.register("q");

  const wide = useMediaQuery("(min-width: 640px)", true);

  return (
    <form role="search" aria-label="Razas" onSubmit={form.handleSubmit(() => onEnterList())} className="min-w-0 flex-1">
      <LabelPrimitive.Root htmlFor="breed-search" className="sr-only">
        Buscar raza por nombre
      </LabelPrimitive.Root>
      <div
        className={cn(
          "well group relative flex h-12 items-center rounded-full",
          "after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:opacity-0 after:ring-2 after:ring-accent after:transition-opacity after:duration-200 focus-within:after:opacity-100",
          error && "after:opacity-100 after:ring-danger",
        )}
      >
        <Search className="pointer-events-none absolute left-4 size-[1.1rem] text-slate" aria-hidden="true" />
        <input
          id="breed-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={SEARCH_MAX_LENGTH + 10}
          placeholder={wide ? "Busca un michi: Bengal, Sphynx, Persian…" : "Busca un michi…"}
          aria-controls={listId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "breed-search-error" : "breed-search-hint"}
          className="h-full w-full min-w-0 rounded-full bg-transparent pr-12 pl-11 text-[0.95rem] text-ink outline-none placeholder:text-ink-soft [&::-webkit-search-cancel-button]:hidden"
          {...field}
          ref={(node) => {
            registerRef(node);
            inputRef.current = node;
          }}
          onFocus={onFocus}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              onEnterList();
            } else if (event.key === "Escape") {
              event.preventDefault();
              if (value) clear();
              else onEscapeEmpty?.();
            }
          }}
        />
        {value ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-1.5 isolate grid size-9 place-items-center rounded-full text-slate before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-slate/10 before:opacity-0 before:transition-opacity hover:before:opacity-100"
            aria-label="Limpiar búsqueda"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <kbd className="pearl pointer-events-none absolute right-3 hidden h-6 min-w-6 place-items-center rounded-[7px] text-[0.72rem] font-semibold text-slate md:grid">
            /
          </kbd>
        )}
      </div>
      {error ? (
        <p id="breed-search-error" className="mt-1 pl-4 text-xs text-danger">
          {error}
        </p>
      ) : (
        <p id="breed-search-hint" className="sr-only">
          {resultsLabel}. Pulsa flecha abajo para recorrer la lista.
        </p>
      )}
    </form>
  );
}
