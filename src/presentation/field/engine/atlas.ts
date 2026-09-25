import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter } from "three";

export interface AtlasEntry {
  monogram: string;
  label: string;
}

const CELL = 256;

export interface AtlasFonts {
  /** `font-family` ya resuelto (next/font genera nombres con hash; canvas no entiende `var()`). */
  display: string;
  body: string;
}

/**
 * Atlas de glifos: una celda de 256 px por raza con su monograma y su nombre
 * corto, dibujados en blanco. El shader solo usa el canal alfa y lo tiñe con
 * el color de tinta del tema, así que el mismo atlas sirve para día y noche.
 *
 * Se dibuja con canvas 2D (una vez por raza) y se sube como textura; el
 * nombre es pequeño a propósito: se lee cuando la lupa agranda el orbe.
 */
export function createGlyphAtlas(capacity: number, fonts: AtlasFonts) {
  const grid = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, capacity))));
  const canvas = document.createElement("canvas");
  canvas.width = grid * CELL;
  canvas.height = grid * CELL;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");

  const texture = new CanvasTexture(canvas);
  texture.flipY = false;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;

  const drawn = new Set<number>();

  /** Pone la fuente al mayor tamaño (desde `start`) con el que el texto cabe. */
  function fit(text: string, font: (size: number) => string, start: number, maxWidth: number) {
    let size = start;
    ctx!.font = font(size);
    while (size > 12 && ctx!.measureText(text).width > maxWidth) {
      size -= 2;
      ctx!.font = font(size);
    }
  }

  function draw(index: number, entry: AtlasEntry) {
    if (index >= grid * grid) return false;
    const x = (index % grid) * CELL;
    const y = Math.floor(index / grid) * CELL;
    ctx!.clearRect(x, y, CELL, CELL);
    ctx!.fillStyle = "#ffffff";
    ctx!.textAlign = "center";
    ctx!.textBaseline = "middle";

    fit(entry.monogram, (size) => `700 ${size}px ${fonts.display}`, 104, CELL * 0.62);
    ctx!.fillText(entry.monogram, x + CELL / 2, y + CELL * 0.43);

    fit(entry.label, (size) => `800 ${size}px ${fonts.body}`, 27, CELL * 0.74);
    ctx!.fillText(entry.label, x + CELL / 2, y + CELL * 0.72);

    drawn.add(index);
    return true;
  }

  return {
    grid,
    texture,
    /** Dibuja las entradas nuevas y sube la textura una sola vez. */
    update(entries: readonly AtlasEntry[]) {
      let changed = false;
      entries.forEach((entry, index) => {
        if (!drawn.has(index)) changed = draw(index, entry) || changed;
      });
      if (changed) texture.needsUpdate = true;
    },
    dispose() {
      texture.dispose();
    },
  };
}

export type GlyphAtlas = ReturnType<typeof createGlyphAtlas>;
