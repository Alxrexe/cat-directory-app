import {
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
} from "three";

/** La perspectiva va en el vertex shader: por frame solo cambian dos uniformes. */
const STREAKS = 520;

const vertexShader = /* glsl */ `
  attribute vec3 aStreak; // ángulo, fase de profundidad, factor de radio
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uSpeed;
  uniform vec2 uCenter;
  uniform float uScale;
  varying vec3 vColor;
  varying float vFade;
  varying vec2 vLocal;

  void main() {
    float z = fract(aStreak.y - uTime);
    float depth = mix(1.0, 0.035, z);
    float persp = 0.16 / depth;
    vec2 dir = vec2(cos(aStreak.x), sin(aStreak.x));
    vec2 across = vec2(-dir.y, dir.x);
    float radius = uScale * aStreak.z * persp;
    float len = uScale * (0.02 + uSpeed * 0.16) * persp;
    float thick = clamp(1.2 * persp, 1.0, 6.0);

    vec2 local = position.xy + vec2(0.5, 0.0);
    vec2 p = uCenter + dir * (radius + local.x * len) + across * local.y * thick;

    vFade = smoothstep(0.0, 0.25, z) * (1.0 - smoothstep(0.85, 1.0, z));
    vColor = aColor;
    vLocal = local;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uAlpha;
  varying vec3 vColor;
  varying float vFade;
  varying vec2 vLocal;
  void main() {
    float tail = smoothstep(0.0, 0.7, vLocal.x) * (1.0 - smoothstep(0.92, 1.0, vLocal.x));
    float edge = 1.0 - smoothstep(0.2, 0.5, abs(vLocal.y));
    float a = tail * edge * vFade * uAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function createTunnelLayer(palette: readonly string[]) {
  const base = new PlaneGeometry(1, 1);
  const geometry = new InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.setAttribute("position", base.getAttribute("position"));

  const streaks = new Float32Array(STREAKS * 3);
  const colors = new Float32Array(STREAKS * 3);
  const color = new Color();
  for (let i = 0; i < STREAKS; i++) {
    streaks[i * 3] = Math.random() * Math.PI * 2;
    streaks[i * 3 + 1] = Math.random();
    streaks[i * 3 + 2] = 0.55 + Math.random() * 0.9;
    color.set(palette[i % palette.length]);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute("aStreak", new InstancedBufferAttribute(streaks, 3));
  geometry.setAttribute("aColor", new InstancedBufferAttribute(colors, 3));
  geometry.instanceCount = STREAKS;

  const uniforms = {
    uTime: { value: 0 },
    uSpeed: { value: 0.05 },
    uCenter: { value: new Vector2() },
    uScale: { value: 600 },
    uAlpha: { value: 0 },
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
  mesh.renderOrder = 3;

  return {
    mesh,
    uniforms,
    dispose() {
      geometry.dispose();
      base.dispose();
      material.dispose();
    },
  };
}
