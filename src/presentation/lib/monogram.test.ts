import { describe, expect, it } from "vitest";
import { breedMonogram, shortBreedName } from "./monogram";

describe("monograma de los orbes", () => {
  it("acorta el nombre quitando aclaraciones y referencias", () => {
    expect(shortBreedName("Persian (Modern Persian Cat)")).toBe("Persian");
    expect(shortBreedName("Donskoy, or Don Sphynx")).toBe("Donskoy");
    expect(shortBreedName("Foldex[4]")).toBe("Foldex");
  });

  it("usa las iniciales de dos palabras o las dos primeras letras", () => {
    expect(breedMonogram("American Curl")).toBe("AC");
    expect(breedMonogram("Bengal")).toBe("Be");
    expect(breedMonogram("Asian Semi-longhair")).toBe("AS");
    expect(breedMonogram("Cheetoh")).toBe("Ch");
    expect(breedMonogram("(sin nombre)")).toBe("?");
  });
});
