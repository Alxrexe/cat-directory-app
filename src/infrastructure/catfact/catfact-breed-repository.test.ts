import { describe, expect, it, vi } from "vitest";
import { DataSourceError } from "@application/errors";
import { createHttpClient } from "../http/http-client";
import { createCatfactBreedRepository } from "./catfact-breed-repository";

const BASE = "https://catfact.test";

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });
}

const pageBody = {
  current_page: 2,
  last_page: 4,
  per_page: "25",
  total: 98,
  data: [
    { breed: "Bengal", country: "developed in the United States (founding stock from Asia)", origin: "Hybrid", coat: "Short", pattern: "Spotted" },
    { breed: "Arabian Mau", country: "Arabian Peninsula", origin: "Natural", coat: "Short", pattern: "" },
    { country: "fila rota sin nombre" },
  ],
};

function setup(fetchImpl: typeof fetch) {
  const onRetry = vi.fn();
  const http = createHttpClient({
    fetchImpl,
    timeoutMs: 1000,
    retry: { retries: 2, baseDelayMs: 1, maxDelayMs: 2 },
    onRetry,
  });
  const onDroppedRows = vi.fn();
  const repository = createCatfactBreedRepository({ http, baseUrl: BASE, onDroppedRows });
  return { repository, onRetry, onDroppedRows };
}

describe("CatfactBreedRepository", () => {
  it("mapea la página al dominio y descarta solo las filas inválidas", async () => {
    const fetchImpl = vi.fn(async () => json(pageBody));
    const { repository, onDroppedRows } = setup(fetchImpl as unknown as typeof fetch);

    const page = await repository.getPage(2);

    expect(String((fetchImpl.mock.calls[0] as unknown[])[0])).toBe(`${BASE}/breeds?page=2`);
    expect(page).toMatchObject({ page: 2, lastPage: 4, perPage: 25, total: 98 });
    expect(page.breeds.map((breed) => breed.slug)).toEqual(["bengal", "arabian-mau"]);
    expect(page.breeds[1].pattern).toBeNull();
    expect(onDroppedRows).toHaveBeenCalledWith(1, 2);
  });

  it("reintenta un 503 intermitente con backoff y termina resolviendo", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(json(pageBody));
    const { repository, onRetry } = setup(fetchImpl as unknown as typeof fetch);

    await expect(repository.getPage(2)).resolves.toMatchObject({ page: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("tras agotar los reintentos expone un DataSourceError tipado", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const { repository } = setup(fetchImpl as unknown as typeof fetch);

    const error = await repository.getPage(1).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(DataSourceError);
    expect(error).toMatchObject({ kind: "network", retryable: true });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("no reintenta una respuesta con forma inválida", async () => {
    const fetchImpl = vi.fn(async () => json({ data: "nada" }));
    const { repository } = setup(fetchImpl as unknown as typeof fetch);

    await expect(repository.getPage(1)).rejects.toMatchObject({ kind: "invalid-response" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("marca un 429 como rate-limited y lee Retry-After", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 429, headers: { "retry-after": "0" } }));
    const { repository } = setup(fetchImpl as unknown as typeof fetch);

    await expect(repository.getPage(1)).rejects.toMatchObject({ kind: "rate-limited", status: 429, retryAfterMs: 0 });
  });
});
