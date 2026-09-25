import type { BreedProfileRepository } from "@application/ports/breed-profile-repository";
import type { RequestOptions } from "@application/ports/breed-repository";
import { trimSummary, type BreedPhoto, type BreedProfile, type ProfileLanguage } from "@domain/breed/profile";
import type { HttpClient } from "../http/http-client";
import { queryResponseSchema, type QueryResponse, type WikiPage } from "./schemas";

export interface WikipediaProfileRepositoryConfig {
  http: HttpClient;
  thumbnailSize?: number;
}

/** Límites de la API: 50 títulos por consulta, 20 extractos por consulta. */
const TITLES_PER_QUERY = 50;
const EXTRACTS_PER_QUERY = 20;

/** Del más específico al más genérico: "Bengal cat" antes que "Bengal". */
export function wikiCandidates(breedName: string): string[] {
  const base = breedName
    .replace(/\[\d+\]/g, "")
    .replace(/\s*\(.*?\)/g, "")
    .split(",")[0]
    .trim();
  return [`${base} cat`, `${base} (cat)`, base];
}

/** "Bengal" a secas es una región: el artículo tiene que hablar de gatos. */
export function isCatArticle(page: WikiPage | undefined): page is WikiPage {
  return Boolean(page && !page.missing && !page.invalid && /\bcat\b|\bbreed\b|felis/i.test(page.description ?? ""));
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));
}

function resolvePages(response: QueryResponse) {
  const normalized = new Map(response.query?.normalized?.map((m) => [m.from, m.to]));
  const redirects = new Map(response.query?.redirects?.map((m) => [m.from, m.to]));
  const pages = new Map(response.query?.pages?.map((page) => [page.title, page]));
  return (title: string): WikiPage | undefined => {
    let current = normalized.get(title) ?? title;
    current = redirects.get(current) ?? current;
    return pages.get(current);
  };
}

/** Wikipedia añade parámetros de seguimiento (utm_*) a las miniaturas: fuera. */
export const cleanImageUrl = (url: string) => url.split("?")[0];

const articleUrl = (language: ProfileLanguage, title: string) =>
  `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

interface Match {
  title: string;
  photo: BreedPhoto | null;
  spanishTitle: string | null;
}

/**
 * Perfiles desde MediaWiki, por lotes y en serie: tres rondas de títulos
 * candidatos y después los extractos (en español si existe el artículo).
 * Unas diez peticiones para las 98 razas.
 */
export function createWikipediaProfileRepository(config: WikipediaProfileRepositoryConfig): BreedProfileRepository {
  const thumbnailSize = config.thumbnailSize ?? 800;

  async function query(language: ProfileLanguage, params: Record<string, string>, options?: RequestOptions) {
    const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
    const all = { action: "query", format: "json", formatversion: "2", redirects: "1", origin: "*", ...params };
    for (const [key, value] of Object.entries(all)) url.searchParams.set(key, value);
    return config.http.getJson(url, queryResponseSchema, options);
  }

  async function findArticles(names: readonly string[], options?: RequestOptions) {
    const matches = new Map<string, Match>();
    for (let round = 0; round < 3; round++) {
      const pending = names.filter((name) => !matches.has(name));
      for (const group of chunk(pending, TITLES_PER_QUERY)) {
        const titles = group.map((name) => wikiCandidates(name)[round]);
        const response = await query(
          "en",
          {
            prop: "pageimages|description|langlinks",
            piprop: "thumbnail",
            pithumbsize: String(thumbnailSize),
            lllang: "es",
            lllimit: "max",
            titles: titles.join("|"),
          },
          options,
        );
        const pageFor = resolvePages(response);
        group.forEach((name, i) => {
          const page = pageFor(titles[i]);
          if (!isCatArticle(page)) return;
          matches.set(name, {
            title: page.title,
            photo: page.thumbnail
              ? { url: cleanImageUrl(page.thumbnail.source), width: page.thumbnail.width, height: page.thumbnail.height }
              : null,
            spanishTitle: page.langlinks?.find((link) => link.lang === "es")?.title ?? null,
          });
        });
      }
    }
    return matches;
  }

  async function fetchExtracts(language: ProfileLanguage, titles: readonly string[], options?: RequestOptions) {
    const extracts = new Map<string, string>();
    for (const group of chunk([...new Set(titles)], EXTRACTS_PER_QUERY)) {
      const response = await query(
        language,
        { prop: "extracts", exintro: "1", explaintext: "1", exsentences: "4", exlimit: "max", titles: group.join("|") },
        options,
      );
      const pageFor = resolvePages(response);
      for (const title of group) {
        const extract = pageFor(title)?.extract?.trim();
        if (extract) extracts.set(title, trimSummary(extract));
      }
    }
    return extracts;
  }

  return {
    async getProfiles(breedNames, options) {
      const matches = await findArticles(breedNames, options);

      const spanish = await fetchExtracts(
        "es",
        [...matches.values()].flatMap((m) => (m.spanishTitle ? [m.spanishTitle] : [])),
        options,
      );
      const englishTitles = [...matches.values()]
        .filter((m) => !m.spanishTitle || !spanish.has(m.spanishTitle))
        .map((m) => m.title);
      const english = await fetchExtracts("en", englishTitles, options);

      const profiles = new Map<string, BreedProfile>();
      for (const [name, match] of matches) {
        const spanishSummary = match.spanishTitle ? spanish.get(match.spanishTitle) : undefined;
        const summary = spanishSummary ?? english.get(match.title) ?? null;
        const language: ProfileLanguage = spanishSummary && match.spanishTitle ? "es" : "en";
        const title = language === "es" && match.spanishTitle ? match.spanishTitle : match.title;
        profiles.set(name, {
          photo: match.photo,
          summary,
          summaryLanguage: summary ? language : null,
          source: { title, url: articleUrl(language, title), language },
        });
      }
      return profiles;
    },
  };
}
