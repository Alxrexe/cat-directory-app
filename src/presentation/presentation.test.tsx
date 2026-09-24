import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBreed } from "@domain/breed/breed";
import { useDebouncedValue } from "./hooks/use-debounced-value";
import { directorySearch, parseDirectoryParams } from "./lib/directory-params";
import { useConnectionStore } from "./stores/connection-store";
import { createLocalStorageSnapshotStore, SNAPSHOT_KEY } from "@infrastructure/storage/local-storage-snapshot-store";

afterEach(() => {
  vi.useRealTimers();
  useConnectionStore.setState({ online: true, retry: null });
  localStorage.clear();
});

describe("useDebouncedValue", () => {
  it("solo publica el valor cuando deja de cambiar", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "b" },
    });

    rerender({ value: "be" });
    rerender({ value: "ben" });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe("b");

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("ben");
  });
});

describe("estado del directorio en la URL", () => {
  it("parsea y sanea q y page", () => {
    expect(parseDirectoryParams(new URLSearchParams("q=  ben   gal &page=3"))).toEqual({ q: "ben gal", page: 3 });
    expect(parseDirectoryParams({ page: "-4" })).toEqual({ q: "", page: 1 });
    expect(parseDirectoryParams({ page: "nope", q: ["a", "b"] })).toEqual({ q: "a", page: 1 });
  });

  it("omite los valores por defecto al escribir", () => {
    expect(directorySearch({ q: "", page: 1 })).toBe("");
    expect(directorySearch({ q: "rex", page: 2 })).toBe("?q=rex&page=2");
  });
});

describe("useConnectionStore", () => {
  it("registra y limpia el reintento en curso", () => {
    const { reportRetry, clearRetry } = useConnectionStore.getState();
    reportRetry({ attempt: 2, retries: 3, delayMs: 1200 });
    expect(useConnectionStore.getState().retry).toMatchObject({ attempt: 2, retries: 3 });
    clearRetry();
    expect(useConnectionStore.getState().retry).toBeNull();
  });
});

describe("copia local de la primera página", () => {
  it("sobrevive a un viaje por localStorage y rechaza basura", () => {
    const store = createLocalStorageSnapshotStore(() => localStorage);
    const page = { page: 1, lastPage: 4, perPage: 25, total: 98, breeds: [createBreed({ name: "Bengal", country: "US" })] };

    store.write({ page, savedAt: 42 });
    expect(store.read()).toEqual({ page, savedAt: 42 });

    localStorage.setItem(SNAPSHOT_KEY, "{roto");
    expect(store.read()).toBeNull();
  });
});
