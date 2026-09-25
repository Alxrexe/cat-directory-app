import {
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
} from "three";
import type { GlyphAtlas } from "./atlas";

export const MAX_ORBS = 640;

/** Lado del quad en diámetros de orbe: sitio para orejas, anillo, sombra y halo. */
const QUAD = 1.6;

const vertexShader = /* glsl */ `
  attribute vec2 aOffset;
  attribute float aSize;
  attribute float aCell;
  attribute float aHover;
  attribute float aMatch;
  attribute float aLens;
  attribute float aSeed;

  uniform float uIntro;
  uniform vec2 uCenter;
  uniform float uDiag;
  uniform float uTime;
  uniform float uMotion;

  varying vec2 vQ;
  varying float vCell;
  varying float vHover;
  varying float vMatch;
  varying float vLens;
  varying float vAppear;

  void main() {
    // Aparecen del centro hacia fuera.
    float d01 = clamp(length(aOffset - uCenter) / (uDiag * 0.5), 0.0, 1.0);
    float appear = smoothstep(0.0, 1.0, clamp(uIntro * 1.7 - d01 * 0.7, 0.0, 1.0));

    float bob = sin(uTime * 1.1 + aSeed * 6.2831) * 2.2 * uMotion;
    float pop = 1.0 + 0.14 * sin(appear * 3.14159) * (1.0 - appear * 0.4);
    float size = aSize * mix(0.35, 1.0, appear) * pop * (0.84 + 0.16 * aMatch);

    vec2 p = aOffset + vec2(0.0, bob + (1.0 - appear) * 36.0) + position.xy * size * ${QUAD.toFixed(2)};
    // Coordenadas locales en radios de orbe, con y hacia arriba.
    vQ = vec2(position.x, -position.y) * 2.0 * ${QUAD.toFixed(2)};

    vCell = aCell;
    vHover = aHover;
    vMatch = aMatch;
    vLens = aLens;
    vAppear = appear;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uGrid;
  uniform vec3 uOrb;
  uniform vec3 uShade;
  uniform vec3 uInk;
  uniform vec3 uEar;
  uniform vec3 uRing;
  uniform vec3 uShadowColor;
  uniform float uShadow;
  uniform vec3 uGlowColor;
  uniform float uGlow;
  uniform float uGlowBase;
  uniform float uTime;
  uniform float uDim;

  varying vec2 vQ;
  varying float vCell;
  varying float vHover;
  varying float vMatch;
  varying float vLens;
  varying float vAppear;

  // Triángulo exacto (Íñigo Quílez).
  float sdTriangle(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
    vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2;
    vec2 v0 = p - p0, v1 = p - p1, v2 = p - p2;
    vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
    vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
    vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
    float s = sign(e0.x * e2.y - e0.y * e2.x);
    vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
                     vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
                     vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
    return -sqrt(d.x) * sign(d.y);
  }

  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // Composición "over" con alfa recto: sin halos oscuros en los bordes.
  vec4 over(vec4 dst, vec3 color, float alpha) {
    float a = alpha + dst.a * (1.0 - alpha);
    vec3 c = (color * alpha + dst.rgb * dst.a * (1.0 - alpha)) / max(a, 1e-4);
    return vec4(c, a);
  }

  void main() {
    vec2 q = vQ;
    float aa = length(fwidth(q)) * 0.9;

    vec2 headC = vec2(0.0, -0.06);
    float head = length(q - headC) - 0.9;
    float earL = sdTriangle(q, vec2(-0.75, 0.36), vec2(-0.58, 0.86), vec2(-0.39, 0.66)) - 0.045;
    float earR = sdTriangle(q, vec2(0.75, 0.36), vec2(0.58, 0.86), vec2(0.39, 0.66)) - 0.045;
    float shape = smin(head, min(earL, earR), 0.16);

    // Casi todo el quad es aire.
    if (shape > 0.9) discard;

    float body = 1.0 - smoothstep(-aa, aa, shape);

    // Normal de esfera para dar volumen.
    vec2 hp = (q - headC) / 0.9;
    float r2 = clamp(dot(hp, hp), 0.0, 1.0);
    vec3 n = normalize(vec3(hp, sqrt(1.0 - r2) + 0.001));
    float light = dot(n, normalize(vec3(-0.4, 0.62, 0.72))) * 0.5 + 0.5;
    vec3 col = mix(uShade, uOrb, smoothstep(0.18, 0.92, light));
    col = mix(col, uShade, smoothstep(0.78, 1.0, sqrt(r2)) * 0.28);
    col += pow(max(0.0, dot(n, normalize(vec3(-0.3, 0.55, 0.78)))), 28.0) * 0.28;

    float edgeBand = smoothstep(-0.07, -0.02, shape);
    vec3 rimCol = mix(mix(uShade, uInk, 0.16), vec3(1.0), smoothstep(-0.7, 0.9, q.y));
    col = mix(col, rimCol, edgeBand * 0.35);

    float inL = sdTriangle(q, vec2(-0.66, 0.47), vec2(-0.575, 0.74), vec2(-0.47, 0.62)) - 0.02;
    float inR = sdTriangle(q, vec2(0.66, 0.47), vec2(0.575, 0.74), vec2(0.47, 0.62)) - 0.02;
    col = mix(col, uEar, (1.0 - smoothstep(-aa, aa, min(inL, inR))) * 0.85);

    vec2 guv = (vec2(q.x, -q.y) + vec2(0.74, 0.8)) / vec2(1.48, 1.48);
    float inside = step(0.0, guv.x) * step(guv.x, 1.0) * step(0.0, guv.y) * step(guv.y, 1.0);
    vec2 cell = vec2(mod(vCell, uGrid), floor(vCell / uGrid));
    float glyph = texture2D(uAtlas, (cell + clamp(guv, 0.002, 0.998)) / uGrid).a * inside;
    col = mix(col, uInk, glyph * 0.94);

    vec4 outc = vec4(0.0);

    float sh = exp(-pow(length((q - vec2(0.0, -1.05)) / vec2(0.82, 0.2)), 2.0) * 2.2);
    outc = over(outc, uShadowColor, sh * uShadow * (1.0 - vLens * 0.6));

    float glow = exp(-max(shape, 0.0) * 5.0) * (1.0 - body);
    float lit = max(vLens, vHover);
    outc = over(outc, uGlowColor, glow * uGlow * mix(uGlowBase, 1.0, lit));

    // Marco de selección separado de la silueta, latiendo.
    float ring = 1.0 - smoothstep(0.035, 0.035 + aa * 1.5, abs(shape - 0.12));
    float pulse = 0.72 + 0.28 * sin(uTime * 5.0);
    outc = over(outc, uRing, ring * vHover * pulse);

    outc = over(outc, col, body);

    float fade = vAppear * mix(0.22, 1.0, vMatch) * (1.0 - uDim * 0.55);
    gl_FragColor = vec4(outc.rgb, outc.a * fade);
  }
`;

export interface OrbPalette {
  orb: string;
  shade: string;
  ink: string;
  ear: string;
  ring: string;
  shadowColor: string;
  shadow: number;
  glowColor: string;
  glow: number;
  /** Halo de todos los orbes; 0 deja solo el del señalado. */
  glowBase: number;
}

export function createOrbLayer(atlas: GlyphAtlas, palette: OrbPalette) {
  const base = new PlaneGeometry(1, 1);
  const geometry = new InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.setAttribute("position", base.getAttribute("position"));

  const make = (itemSize: number) => {
    const attr = new InstancedBufferAttribute(new Float32Array(MAX_ORBS * itemSize), itemSize);
    attr.setUsage(DynamicDrawUsage);
    return attr;
  };
  const attrs = {
    offset: make(2),
    size: make(1),
    cell: make(1),
    hover: make(1),
    match: make(1),
    lens: make(1),
    seed: make(1),
  };
  geometry.setAttribute("aOffset", attrs.offset);
  geometry.setAttribute("aSize", attrs.size);
  geometry.setAttribute("aCell", attrs.cell);
  geometry.setAttribute("aHover", attrs.hover);
  geometry.setAttribute("aMatch", attrs.match);
  geometry.setAttribute("aLens", attrs.lens);
  geometry.setAttribute("aSeed", attrs.seed);
  geometry.instanceCount = 0;

  const uniforms = {
    uAtlas: { value: atlas.texture },
    uGrid: { value: atlas.grid },
    uIntro: { value: 0 },
    uCenter: { value: new Vector2() },
    uDiag: { value: 1 },
    uTime: { value: 0 },
    uMotion: { value: 1 },
    uDim: { value: 0 },
    uOrb: { value: new Color(palette.orb) },
    uShade: { value: new Color(palette.shade) },
    uInk: { value: new Color(palette.ink) },
    uEar: { value: new Color(palette.ear) },
    uRing: { value: new Color(palette.ring) },
    uShadowColor: { value: new Color(palette.shadowColor) },
    uShadow: { value: palette.shadow },
    uGlowColor: { value: new Color(palette.glowColor) },
    uGlow: { value: palette.glow },
    uGlowBase: { value: palette.glowBase },
  };

  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
  });

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;

  let count = 0;

  return {
    mesh,
    uniforms,
    begin() {
      count = 0;
    },
    push(x: number, y: number, size: number, cell: number, hover: number, match: number, lens: number, seed: number) {
      if (count >= MAX_ORBS) return;
      const i = count++;
      attrs.offset.array[i * 2] = x;
      attrs.offset.array[i * 2 + 1] = y;
      attrs.size.array[i] = size;
      attrs.cell.array[i] = cell;
      attrs.hover.array[i] = hover;
      attrs.match.array[i] = match;
      attrs.lens.array[i] = lens;
      attrs.seed.array[i] = seed;
    },
    commit() {
      geometry.instanceCount = count;
      for (const attr of Object.values(attrs)) {
        attr.clearUpdateRanges();
        attr.addUpdateRange(0, count * attr.itemSize);
        attr.needsUpdate = true;
      }
    },
    dispose() {
      geometry.dispose();
      base.dispose();
      material.dispose();
    },
  };
}

export type OrbLayer = ReturnType<typeof createOrbLayer>;
