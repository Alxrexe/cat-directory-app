import { Color, DoubleSide, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from "three";

/**
 * Capa de fondo del campo (detrás de los orbes):
 * - La "onda" de la lupa: una burbuja translúcida con borde brillante y
 *   ondulaciones concéntricas que sigue al puntero. Hace que el zoom de los
 *   orbes se lea como una lente física y no como un simple escalado.
 * - En tema oscuro, un polvo de estrellas que titila muy despacio.
 *
 * Un solo quad a pantalla completa; todo se calcula en el fragment shader.
 */
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

    // Estrellas (solo de noche): una por celda, con titileo lento.
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

    // Onda de la lupa.
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

/**
 * Velo a pantalla completa, por encima de todo: es el blanco de la pantalla
 * de inicio mientras dura el túnel y el destello suave al llegar al cielo.
 */
export function createVeilLayer(color: string) {
  const geometry = new PlaneGeometry(1, 1);
  const uniforms = {
    uRes: { value: new Vector2(1, 1) },
    uColor: { value: new Color(color) },
    uAlpha: { value: 0 },
    uGlow: { value: 0 },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uAlpha;
      uniform float uGlow;
      uniform vec2 uRes;
      varying vec2 vPx;
      void main() {
        // Un centro un poco más luminoso: la "boca" del túnel.
        float r = length(vPx - uRes * 0.5) / length(uRes * 0.5);
        vec3 c = mix(uColor, vec3(1.0), (1.0 - smoothstep(0.0, 0.6, r)) * uGlow);
        if (uAlpha < 0.002) discard;
        gl_FragColor = vec4(c, uAlpha);
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
