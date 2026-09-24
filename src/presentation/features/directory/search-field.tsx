"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Search, X } from "lucide-react";
import { useEffect, useEffectEvent, useImperativeHandle, useRef, type Ref } from "react";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod/mini";
import { useDebouncedValue } from "../../hooks/use-debounced-value";
import { SEARCH_MAX_LENGTH } from "../../lib/directory-params";
import { cn } from "../../lib/cn";

const SEARCH_DEBOUNCE_MS = 300;

const searchSchema = z.object({
  q: z.string().check(z.maxLength(SEARCH_MAX_LENGTH, `Máximo ${SEARCH_MAX_LENGTH} caracteres`)),
});
type SearchValues = z.infer<typeof searchSchema>;

export interface SearchFieldHandle {
  focus: () => void;
  clear: () => void;
}

interface SearchFieldProps {
  /** Valor inicial, leído de `?q=`. */
  defaultQuery: string;
  /** Valor ya "asentado" (con debounce): es lo que se escribe en la URL. */
  onQueryChange: (query: string) => void;
  /** Enter o flecha abajo: el foco pasa a la lista. */
  onEnterList: () => void;
  listId: string;
  resultsLabel: string;
  ref?: Ref<SearchFieldHandle>;
}

export function SearchField({ defaultQuery, onQueryChange, onEnterList, listId, resultsLabel, ref }: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const form = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { q: defaultQuery },
    mode: "onChange",
  });
  const value = useWatch({ control: form.control, name: "q" }) ?? "";
  const debounced = useDebouncedValue(value, SEARCH_DEBOUNCE_MS);
  const error = form.formState.errors.q?.message;

  // El debounce ya lo hizo useDebouncedValue; aquí solo se publica.
  const publish = useEffectEvent((query: string) => {
    const parsed = searchSchema.safeParse({ q: query });
    if (parsed.success) onQueryChange(parsed.data.q.trim());
  });
  useEffect(() => publish(debounced), [debounced]);

  const clear = () => {
    form.setValue("q", "", { shouldValidate: true });
    onQueryChange(""); // limpiar no espera al debounce
    inputRef.current?.focus();
  };

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus(), clear }));

  const { ref: registerRef, ...field } = form.register("q");

  return (
    <form
      role="search"
      aria-label="Directorio"
      onSubmit={form.handleSubmit(() => onEnterList())}
      className="min-w-0 flex-1"
    >
      <LabelPrimitive.Root htmlFor="breed-search" className="sr-only">
        Buscar raza por nombre
      </LabelPrimitive.Root>
      <div
        className={cn(
          "group relative flex items-center border-b border-input transition-colors focus-within:border-foreground",
          error && "border-destructive focus-within:border-destructive",
        )}
      >
        <Search className="pointer-events-none absolute left-0 size-4 text-faint group-focus-within:text-foreground" aria-hidden="true" />
        <input
          id="breed-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={SEARCH_MAX_LENGTH + 10}
          placeholder="Buscar raza: Bengal, Sphynx, Persian…"
          aria-controls={listId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "breed-search-error" : "breed-search-hint"}
          className="h-11 w-full min-w-0 bg-transparent pr-16 pl-7 text-base outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
          {...field}
          ref={(node) => {
            registerRef(node);
            inputRef.current = node;
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              onEnterList();
            } else if (event.key === "Escape" && value) {
              event.preventDefault();
              clear();
            }
          }}
        />
        {value ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-0 flex size-9 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <kbd className="label-mono pointer-events-none absolute right-1 hidden border border-border px-1.5 py-0.5 text-faint md:block">
            /
          </kbd>
        )}
      </div>
      {error ? (
        <p id="breed-search-error" className="mt-1 text-xs text-destructive">
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
