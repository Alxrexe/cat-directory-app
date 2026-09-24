import { describe, expect, it } from "vitest";
import { createBreed, InvalidBreedError } from "./breed";
import { coatFamily } from "./coat";
import { describeCountry } from "./country";
import { relatedBreeds } from "./related";
import { filterByName } from "./search";
import { isBreedSlug, toBreedSlug } from "./slug";

describe("toBreedSlug", () => {
  it("produce slugs legibles y estables", () => {
    expect(toBreedSlug("American Shorthair")).toBe("american-shorthair");
    expect(toBreedSlug("Bi- or tri-colored")).toBe("bi-or-tri-colored");
  });

  it("translitera ligaduras que NFD no descompone", () => {
    expect(toBreedSlug("PerFoldæ(Experimental Breed - WCF)")).toBe("perfoldae-experimental-breed-wcf");
  });

  it("valida slugs", () => {
    expect(isBreedSlug("abyssinian")).toBe(true);
    expect(isBreedSlug("../etc/passwd")).toBe(false);
    expect(isBreedSlug("Abyssinian")).toBe(false);
  });
});

describe("createBreed", () => {
  it("convierte cadenas vacías de la API en null", () => {
    const breed = createBreed({ name: " Arabian Mau ", country: "Arabian Peninsula", origin: "", coat: "Short", pattern: "  " });
    expect(breed).toMatchObject({ slug: "arabian-mau", name: "Arabian Mau", origin: null, pattern: null });
  });

  it("rechaza nombres vacíos", () => {
    expect(() => createBreed({ name: "   " })).toThrow(InvalidBreedError);
  });
});

describe("describeCountry", () => {
  it("separa el país del linaje", () => {
    expect(describeCountry("developed in the United States (founding stock from Asia)")).toEqual({
      primary: "United States",
      note: "founding stock from Asia",
      developed: true,
    });
  });

  it("separa el país de la región", () => {
    expect(describeCountry("United Kingdom (Isle of Man)")).toEqual({
      primary: "United Kingdom",
      note: "Isle of Man",
      developed: false,
    });
  });
});

describe("filterByName", () => {
  const items = [{ name: "Persian" }, { name: "Siamese" }, { name: "Égyptian Mau" }];

  it("ignora mayúsculas y acentos en ambos lados", () => {
    expect(filterByName(items, "PÉRSIÁ")).toEqual([{ name: "Persian" }]);
    expect(filterByName(items, "egyp")).toEqual([{ name: "Égyptian Mau" }]);
  });

  it("devuelve todo con un término vacío", () => {
    expect(filterByName(items, "   ")).toBe(items);
  });
});

describe("coatFamily y relatedBreeds", () => {
  it("normaliza las variantes de pelaje", () => {
    expect(coatFamily("Semi Long")).toBe("semi-long");
    expect(coatFamily("Rex (Short/Long)")).toBe("rex");
    expect(coatFamily("Long/short")).toBe("mixed");
    expect(coatFamily(null)).toBe("unknown");
  });

  it("prioriza el mismo país y nunca incluye la raza misma", () => {
    const target = createBreed({ name: "Manx", country: "United Kingdom (Isle of Man)", coat: "Short" });
    const catalog = [
      target,
      createBreed({ name: "Abyssinian", country: "Ethiopia", coat: "Short" }),
      createBreed({ name: "British Shorthair", country: "United Kingdom", coat: "Short" }),
      createBreed({ name: "Sphynx", country: "Canada", coat: "Hairless" }),
    ];
    expect(relatedBreeds(target, catalog).map((breed) => breed.name)).toEqual(["British Shorthair", "Abyssinian"]);
  });
});
