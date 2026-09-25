import { Color, DoubleSide, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from "three";

/** Fondo del campo: la onda de la lupa y, de noche, las estrellas. Un quad a pantalla completa. */
const vertexShader = /* glsl */ `
  uniform vec2 uRes;
  varying vec2 vPx;
  void main() {
    vPx = (position.xy + 0.5) * uRes;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPx, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec2 uMouse;
  uniform float uLens;
  uniform float uRadius;
  uniform float uTime;
  uniform vec3 uWave;
  uniform vec3 uRim;
  uniform float uWaveAlpha;
  uniform float uStars;
  uniform float uMotion;
  varying vec2 vPx;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }

  vec4 over(vec4 dst, vec3 color, float alpha) {
    float a = alpha + dst.a * (1.0 - alpha);
    vec3 c = (color * alpha + dst.rgb * dst.a * (1.0 - alpha)) / max(a, 1e-4);
    return vec4(c, a);
  }

  void main() {
    vec4 outc = vec4(0.0);

    // Una estrella por celda, como mucho.
    if (uStars > 0.001) {
      vec2 cellSize = vec2(46.0);
      vec2 cell = floor(vPx / cellSize);
      float h = hash(cell);
      vec2 star = (cell + vec2(hash(cell + 3.1), hash(cell + 7.7))) * cellSize;
      float d = length(vPx - star);
      float twinkle = 0.45 + 0.55 * sin(uTime * (0.6 + h * 1.4) * uMotion + h * 40.0);
      float s = smoothstep(1.6, 0.0, d) * step(0.72, h) * twinkle;
      outc = over(outc, vec3(0.93, 0.9, 1.0), s * 0.75 * uStars);
    }

    if (uLens > 0.001) {
      float r = length(vPx - uMouse) / uRadius;
      float disc = exp(-r * r * 1.8);
      float rim = exp(-pow((r - 0.98) * 7.0, 2.0));
      float ripple = (0.5 + 0.5 * sin(r * 11.0 - uTime * 2.4 * uMotion)) * smoothstep(1.35, 0.15, r);
      outc = over(outc, uWave, (disc * 0.38 + ripple * 0.08) * uLens * uWaveAlpha);
      outc = over(outc, uRim, rim * 0.45 * uLens * uWaveAlpha);
    }

    if (outc.a < 0.002) discard;
    gl_FragColor = outc;
  }
`;

export interface BackdropPalette {
  wave: string;
  rim: string;
  waveAlpha: number;
  stars: number;
}

export function createBackdropLayer(palette: BackdropPalette) {
  const geometry = new PlaneGeometry(1, 1);
  const uniforms = {
    uRes: { value: new Vector2(1, 1) },
    uMouse: { value: new Vector2(-9999, -9999) },
    uLens: { value: 0 },
    uRadius: { value: 200 },
    uTime: { value: 0 },
    uMotion: { value: 1 },
    uWave: { value: new Color(palette.wave) },
    uRim: { value: new Color(palette.rim) },
    uWaveAlpha: { value: palette.waveAlpha },
    uStars: { value: palette.stars },
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
  mesh.renderOrder = 0;

  return {
    mesh,
    uniforms,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Velo de la pantalla de inicio. Al llegar se abre como un iris; la CPU solo mueve el radio. */
export function createVeilLayer(color: string, rim: readonly [string, string]) {
  const geometry = new PlaneGeometry(1, 1);
  const uniforms = {
    uRes: { value: new Vector2(1, 1) },
    uColor: { value: new Color(color) },
    uAlpha: { value: 0 },
    uGlow: { value: 0 },
    /** En píxeles; 0 es cerrado. */
    uIris: { value: 0 },
    uRim: { value: 0 },
    uRimA: { value: new Color(rim[0]) },
    uRimB: { value: new Color(rim[1]) },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uAlpha;
      uniform float uGlow;
      uniform vec2 uRes;
      uniform float uIris;
      uniform float uRim;
      uniform vec3 uRimA;
      uniform vec3 uRimB;
      varying vec2 vPx;

      vec4 over(vec4 dst, vec3 color, float alpha) {
        float a = alpha + dst.a * (1.0 - alpha);
        vec3 c = (color * alpha + dst.rgb * dst.a * (1.0 - alpha)) / max(a, 1e-4);
        return vec4(c, a);
      }

      void main() {
        vec2 center = uRes * 0.5;
        vec2 d = vPx - center;
        float dist = length(d);
        float r = dist / length(center);
        vec3 c = mix(uColor, vec3(1.0), (1.0 - smoothstep(0.0, 0.6, r)) * uGlow);

        float open = step(0.5, uIris);
        float feather = 18.0 + uIris * 0.05;
        float veil = mix(1.0, smoothstep(uIris - feather, uIris, dist), open);
        vec4 outc = vec4(c, uAlpha * veil);

        float width = 8.0 + uIris * 0.025;
        float band = exp(-pow((dist - uIris) / width, 2.0)) * open * uRim;
        float hue = 0.5 + 0.5 * sin(atan(d.y, d.x) * 2.0 + uIris * 0.004);
        outc = over(outc, mix(uRimA, uRimB, hue), band);

        if (outc.a < 0.002) discard;
        gl_FragColor = outc;
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  return {
    mesh,
    uniforms,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
