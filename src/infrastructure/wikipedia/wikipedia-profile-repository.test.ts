import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "../http/http-client";
import type { WikiPage } from "./schemas";
import {
  cleanImageUrl,
  createWikipediaProfileRepository,
  isCatArticle,
  wikiCandidates,
} from "./wikipedia-profile-repository";

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

const THUMB = "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Bengal.jpg/960px-Bengal.jpg";

/**
 * Wikipedia de mentira: responde según el idioma y los parámetros, como la
 * API real con `formatversion=2` (normalizaciones, redirecciones, páginas).
 */
function fakeWikipedia(url: URL) {
  const titles = url.searchParams.get("titles")!.split("|");
  const english = url.hostname.startsWith("en.");

  if (english && url.searchParams.get("prop")?.includes("pageimages")) {
    const pages = titles.map((title): WikiPage => {
      if (title === "Bengal cat") {
        return {
          title: "Bengal cat",
          description: "Breed of domestic cat",
          thumbnail: { source: `${THUMB}?utm_source=en.wikipedia.org&utm_content=thumbnail`, width: 800, height: 1027 },
          langlinks: [{ lang: "es", title: "Bengalí (gato)" }],
        };
      }
      // "Aegean" a secas redirige a un mar: no es una raza y se descarta.
      if (title === "Aegean") return { title: "Aegean Sea", description: "Arm of the Mediterranean Sea" };
      // "Chausie" solo existe con el título a secas (tercer candidato).
      if (title === "Chausie") return { title: "Chausie", description: "Cat breed" };
      return { title, missing: true };
    });
    return json({ query: { redirects: [{ from: "Aegean", to: "Aegean Sea" }], pages } });
  }

  if (url.searchParams.get("prop") === "extracts") {
    const pages = titles.map((title) => ({
      title,
      extract: english ? `${title} is a cat breed.` : `${title} es una raza de gato.`,
    }));
    return json({ query: { pages } });
  }

  throw new Error(`petición inesperada: ${url}`);
}

function setup() {
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => fakeWikipedia(new URL(String(input))));
  const http = createHttpClient({
    fetchImpl: fetchImpl as unknown as typeof fetch,
    timeoutMs: 1000,
    retry: { retries: 0, baseDelayMs: 1, maxDelayMs: 1 },
  });
  return { repository: createWikipediaProfileRepository({ http }), fetchImpl };
}

describe("candidatos de título", () => {
  it("prueba primero el artículo de la raza y limpia aclaraciones y referencias", () => {
    expect(wikiCandidates("Bengal")).toEqual(["Bengal cat", "Bengal (cat)", "Bengal"]);
    expect(wikiCandidates("Persian (Modern Persian Cat)")[0]).toBe("Persian cat");
    expect(wikiCandidates("Donskoy, or Don Sphynx")[0]).toBe("Donskoy cat");
    expect(wikiCandidates("Foldex[4]")[0]).toBe("Foldex cat");
  });

  it("solo acepta artículos que se describen como gato o raza", () => {
    expect(isCatArticle({ title: "Bengal cat", description: "Breed of domestic cat" })).toBe(true);
    expect(isCatArticle({ title: "Bengal", description: "Region in South Asia" })).toBe(false);
    expect(isCatArticle({ title: "Foo cat", missing: true })).toBe(false);
    expect(isCatArticle(undefined)).toBe(false);
  });

  it("quita los parámetros de seguimiento de las fotos", () => {
    expect(cleanImageUrl(`${THUMB}?utm_source=en.wikipedia.org&utm_campaign=api`)).toBe(THUMB);
    expect(cleanImageUrl(THUMB)).toBe(THUMB);
  });
});

describe("WikipediaProfileRepository", () => {
  it("arma perfiles con foto limpia y resumen en español cuando existe", async () => {
    const { repository } = setup();

    const profiles = await repository.getProfiles(["Bengal", "Chausie", "Aegean"]);

    expect(profiles.get("Bengal")).toEqual({
      photo: { url: THUMB, width: 800, height: 1027 },
      summary: "Bengalí (gato) es una raza de gato.",
      summaryLanguage: "es",
      source: { title: "Bengalí (gato)", url: "https://es.wikipedia.org/wiki/Bengal%C3%AD_(gato)", language: "es" },
    });
    // Sin artículo en español: resumen en inglés y enlace al artículo inglés.
    expect(profiles.get("Chausie")).toMatchObject({
      photo: null,
      summary: "Chausie is a cat breed.",
      summaryLanguage: "en",
      source: { url: "https://en.wikipedia.org/wiki/Chausie", language: "en" },
    });
    expect(profiles.has("Aegean")).toBe(false);
  });

  it("pregunta por lotes y en serie, nunca raza a raza", async () => {
    const { repository, fetchImpl } = setup();
    const names = Array.from({ length: 60 }, (_, i) => `Raza ${i}`);

    await repository.getProfiles(names);

    // 60 razas sin artículo: tres rondas de candidatos × dos lotes (50 + 10).
    expect(fetchImpl).toHaveBeenCalledTimes(6);
    const firstTitles = new URL(String(fetchImpl.mock.calls[0][0])).searchParams.get("titles")!.split("|");
    expect(firstTitles).toHaveLength(50);
  });
});
