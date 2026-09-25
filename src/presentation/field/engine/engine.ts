import gsap from "gsap";
import {
  Color,
  ColorManagement,
  LinearSRGBColorSpace,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { createGlyphAtlas, type AtlasEntry, type AtlasFonts } from "./atlas";
import { createBackdropLayer, createVeilLayer, type BackdropPalette } from "./backdrop-layer";
import { createOrbLayer, MAX_ORBS, type OrbPalette } from "./orb-layer";
import { createTunnelLayer } from "./tunnel-layer";

// Los colores se escriben en sRGB y se pintan tal cual: sin conversión de
// espacio de color, los hex del sistema visual llegan intactos al shader.
ColorManagement.enabled = false;


export interface FieldBreed extends AtlasEntry {
  slug: string;
  name: string;
  country: string | null;
}

export interface OrbTarget {
  slug: string;
  name: string;
  country: string | null;
  x: number;
  y: number;
  size: number;
}

export interface FieldEngineOptions {
  canvas: HTMLCanvasElement;
  reducedMotion: boolean;
  fonts: AtlasFonts;
  capacity: number;
  /** Tema con el que nace (luego, `setTheme`). */
  theme: FieldTheme;
  onHover: (target: OrbTarget | null) => void;
  /** Posición del orbe señalado en cada frame (para la etiqueta flotante). */
  onHoverMove: (x: number, y: number, size: number) => void;
  onPick: (target: OrbTarget) => void;
  /** El usuario "viajó" por el campo (rueda, arrastre): momento de cargar más. */
  onExplore: () => void;
}

export type FieldTheme = "light" | "dark";

interface FieldPalette {
  orb: OrbPalette;
  backdrop: BackdropPalette;
  veil: string;
}

/**
 * Paleta del logo. De día: orbes de porcelana, orejas lavanda (el aro),
 * monograma pizarra (el gato) y un anillo pervinca para el orbe señalado.
 * De noche: orbes lavanda con un halo suave, estrellas en el fondo y el
 * velo del color de la pantalla de inicio oscura (--surface de .dark).
 */
const PALETTES: Record<FieldTheme, FieldPalette> = {
  light: {
    orb: {
      orb: "#fbfbfe",
      shade: "#d3d9ea",
      ink: "#4a506e",
      ear: "#c5ccdf",
      ring: "#5c6cc9",
      shadowColor: "#2c3350",
      shadow: 0.18,
      glowColor: "#ffffff",
      glow: 0,
    },
    backdrop: { wave: "#ffffff", rim: "#e6e9f4", waveAlpha: 0.85, stars: 0 },
    veil: "#fbfbfe",
  },
  dark: {
    orb: {
      orb: "#dcd6fb",
      shade: "#968ed8",
      ink: "#262840",
      ear: "#aaa1ea",
      ring: "#c7b8ff",
      shadowColor: "#03040c",
      shadow: 0.4,
      glowColor: "#9d8cf5",
      glow: 0.75,
    },
    backdrop: { wave: "#c4bbf7", rim: "#ece7ff", waveAlpha: 0.5, stars: 1 },
    veil: "#1a1d2d",
  },
};

const TUNNEL_COLORS = ["#c5ccdf", "#9aa6d6", "#5c6cc9", "#ffffff", "#aab3cf", "#7d88b8"];

/** Hash determinista 0..1 (siempre el mismo valor para la misma clave). */
const hash01 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

interface Item {
  cell: number;
  match: number;
  hover: number;
  seen: number;
}

/**
 * Motor del campo de orbes (Three.js, sin React).
 *
 * Filas diagonales (-12°) que se deslizan en direcciones alternas sin fin.
 * Cada fila es una cinta infinita de razas: la posición en la cinta decide
 * qué raza lleva cada orbe, y esa asignación se congela mientras el orbe
 * está en pantalla, así que cuando llegan razas nuevas nunca cambia de
 * golpe un orbe visible: las nuevas entran por los bordes.
 *
 * La CPU solo coloca ~300 puntos por frame y los ordena por aumento (los
 * que están bajo la lupa se pintan encima); dibujarlos es un único draw
 * call instanciado.
 */
export function createFieldEngine(options: FieldEngineOptions) {
  const { canvas } = options;
  const motion = options.reducedMotion ? 0 : 1;

  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new OrthographicCamera(0, 1, 0, 1, -10, 10);

  const atlas = createGlyphAtlas(options.capacity, options.fonts);
  const palette = PALETTES[options.theme];
  const orbs = createOrbLayer(atlas, palette.orb);
  const backdrop = createBackdropLayer(palette.backdrop);
  const tunnel = createTunnelLayer(TUNNEL_COLORS);
  const veil = createVeilLayer(palette.veil);
  veil.mesh.renderOrder = 10;
  scene.add(backdrop.mesh, orbs.mesh, tunnel.mesh, veil.mesh);
  tunnel.mesh.visible = false;

  // ── Estado ──────────────────────────────────────────────────────────────
  let width = 1;
  let height = 1;
  let orbSize = 90;
  let breeds: FieldBreed[] = [];
  let matches: Uint8Array | null = null;
  let spotlightCell = -1;
  const items = new Map<number, Item>();
  const rowShift = new Map<number, number>();
  let frame = 0;

  const pointer = { x: -9999, y: -9999, sx: -9999, sy: -9999, inside: false };
  const lens = { value: 0 };
  const flow = { speed: 1 };
  let boost = 0;
  let explored = 0;
  let hoverKey = -1;
  let hoverTarget: OrbTarget | null = null;
  let tunnelPhase = 0;
  let theme = options.theme;
  let themeTween: gsap.core.Tween | null = null;

  // Buffers de ordenación reutilizados (sin basura por frame).
  const drawX = new Float32Array(MAX_ORBS);
  const drawY = new Float32Array(MAX_ORBS);
  const drawSize = new Float32Array(MAX_ORBS);
  const drawLens = new Float32Array(MAX_ORBS);
  const drawKey = new Float64Array(MAX_ORBS);
  const drawCell = new Int32Array(MAX_ORBS);
  const order: number[] = [];

  function resize() {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    const small = width < 640;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.75 : 1.5));
    renderer.setSize(width, height, false);
    camera.right = width;
    camera.bottom = height;
    camera.updateProjectionMatrix();
    orbSize = small ? 70 : Math.min(108, Math.max(78, width * 0.058));
    orbs.uniforms.uCenter.value.set(width / 2, height * 0.46);
    orbs.uniforms.uDiag.value = Math.hypot(width, height);
    backdrop.uniforms.uRes.value.set(width, height);
    backdrop.uniforms.uRadius.value = orbSize * LENS_RADIUS;
    veil.uniforms.uRes.value.set(width, height);
    tunnel.uniforms.uCenter.value.set(width / 2, height / 2);
    tunnel.uniforms.uScale.value = Math.hypot(width, height) * 0.5;
  }

  // ── Disposición y lupa ──────────────────────────────────────────────────
  const ANGLE = (-12 * Math.PI) / 180;
  // Lupa contenida: alcanza a los vecinos inmediatos, no a medio campo.
  const LENS_RADIUS = 1.7;
  const LENS_SPREAD = 0.5;
  const LENS_ZOOM = 0.5;
  const cos = Math.cos(ANGLE);
  const sin = Math.sin(ANGLE);

  function layout(dt: number) {
    const n = breeds.length;
    orbs.begin();
    order.length = 0;
    if (n === 0) {
      orbs.commit();
      return;
    }
    frame++;

    const spacing = orbSize * 1.5;
    const rowSpacing = spacing * 0.88;
    const diag = Math.hypot(width, height);
    const halfRows = Math.ceil(diag / rowSpacing / 2) + 1;
    const halfCols = Math.ceil(diag / spacing / 2) + 2;
    const cx = width / 2;
    const cy = height * 0.46;
    const radius = orbSize * LENS_RADIUS;
    const lensStrength = lens.value;
    const margin = orbSize * 1.4;

    const boostStep = boost * dt;
    let count = 0;

    for (let r = -halfRows; r <= halfRows; r++) {
      const dir = (r & 1) === 0 ? 1 : -1;
      const speed = (14 + hash01(r) * 16) * flow.speed * motion;
      const shift = (rowShift.get(r) ?? hash01(r + 91) * 1000) + dir * (speed * dt + boostStep);
      rowShift.set(r, shift);

      const base = shift / spacing;
      const whole = Math.floor(base);
      const frac = base - whole;
      const stagger = (r & 1) === 0 ? 0 : 0.5;
      const ly = r * rowSpacing;

      for (let j = -halfCols; j <= halfCols; j++) {
        const lx = (j + frac + stagger) * spacing;
        let x = cx + lx * cos - ly * sin;
        let y = cy + lx * sin + ly * cos;
        if (x < -margin || x > width + margin || y < -margin || y > height + margin) continue;
        if (count >= MAX_ORBS) break;

        const k = j - whole;
        const key = (r + 512) * 1e7 + (k + 5e6);
        let item = items.get(key);
        if (!item) {
          const cell = ((((k + r * 9) % n) + n) % n) | 0;
          item = { cell, match: matches ? matches[cell] ?? 1 : 1, hover: 0, seen: frame };
          items.set(key, item);
        }
        item.seen = frame;

        // Lupa de ojo de pez: separa en proporción a la distancia (el orbe
        // bajo el puntero se queda bajo el puntero) y agranda según una
        // campana gaussiana. Con LENS_SPREAD < 2.2 el mapeo es monótono:
        // ningún orbe adelanta a otro al cruzar la lupa.
        let f = 0;
        if (lensStrength > 0.001) {
          const dx = x - pointer.sx;
          const dy = y - pointer.sy;
          f = lensStrength * Math.exp(-(dx * dx + dy * dy) / (radius * radius));
          x += dx * f * LENS_SPREAD;
          y += dy * f * LENS_SPREAD;
        }

        const targetMatch = matches ? (matches[item.cell] ?? 0) : 1;
        item.match += (targetMatch - item.match) * Math.min(1, dt * 7);
        const targetHover = key === hoverKey || item.cell === spotlightCell ? 1 : 0;
        item.hover += (targetHover - item.hover) * Math.min(1, dt * 10);

        drawX[count] = x;
        drawY[count] = y;
        drawSize[count] = orbSize * (1 + f * LENS_ZOOM);
        drawLens[count] = f;
        drawKey[count] = key;
        drawCell[count] = item.cell;
        order.push(count);
        count++;
      }
    }

    // Los aumentados, al final: se pintan por encima de sus vecinos.
    if (lensStrength > 0.001) order.sort((a, b) => drawLens[a] - drawLens[b]);
    for (const i of order) {
      const item = items.get(drawKey[i])!;
      orbs.push(drawX[i], drawY[i], drawSize[i], drawCell[i], item.hover, item.match, drawLens[i], hash01(drawKey[i]));
    }
    orbs.commit();

    // Olvida los orbes que salieron de pantalla hace un rato.
    if (frame % 120 === 0) {
      for (const [key, item] of items) if (frame - item.seen > 60) items.delete(key);
    }
  }

  /** El orbe bajo el puntero: el más aumentado cuyo disco contiene el punto. */
  function hitTest(px: number, py: number): number {
    for (let o = order.length - 1; o >= 0; o--) {
      const i = order[o];
      const r = drawSize[i] * 0.5;
      if (Math.hypot(px - drawX[i], py - drawY[i]) <= r) return i;
    }
    return -1;
  }

  function targetFor(i: number): OrbTarget | null {
    const breed = breeds[drawCell[i]];
    if (!breed) return null;
    return { slug: breed.slug, name: breed.name, country: breed.country, x: drawX[i], y: drawY[i], size: drawSize[i] };
  }

  function updateHover() {
    const i = pointer.inside ? hitTest(pointer.x, pointer.y) : -1;
    const key = i >= 0 ? drawKey[i] : -1;
    if (key !== hoverKey) {
      hoverKey = key;
      hoverTarget = i >= 0 ? targetFor(i) : null;
      options.onHover(hoverTarget);
      canvas.style.cursor = i >= 0 ? "pointer" : "";
    }
    if (i >= 0) options.onHoverMove(drawX[i], drawY[i], drawSize[i]);
  }

  // ── Bucle ───────────────────────────────────────────────────────────────
  let raf = 0;
  let last = performance.now();
  let time = 0;
  let running = true;

  function tick(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    // El puntero suavizado persigue al real: la lupa se desliza, no salta.
    const ease = 1 - Math.exp(-dt * 12);
    if (pointer.sx < -9000) {
      pointer.sx = pointer.x;
      pointer.sy = pointer.y;
    } else {
      pointer.sx += (pointer.x - pointer.sx) * ease;
      pointer.sy += (pointer.y - pointer.sy) * ease;
    }
    const lensTarget = pointer.inside ? 1 : 0;
    lens.value += (lensTarget - lens.value) * (1 - Math.exp(-dt * 6));

    boost *= Math.exp(-dt * 2.6);
    explored += Math.abs(boost * dt);
    if (explored > 2400) {
      explored = 0;
      options.onExplore();
    }

    orbs.uniforms.uTime.value = time;
    backdrop.uniforms.uTime.value = time;
    backdrop.uniforms.uMouse.value.set(pointer.sx, pointer.sy);
    backdrop.uniforms.uLens.value = lens.value;

    if (tunnel.mesh.visible) {
      tunnelPhase += tunnel.uniforms.uSpeed.value * dt;
      tunnel.uniforms.uTime.value = tunnelPhase;
    }

    layout(dt);
    updateHover();
    renderer.render(scene, camera);
    raf = running ? requestAnimationFrame(tick) : 0;
  }

  function start() {
    if (raf) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
  }
  const onVisibility = () => (document.hidden ? stop() : start());

  // ── Entrada del usuario ─────────────────────────────────────────────────
  let press: { x: number; y: number; time: number; moved: number } | null = null;

  const onPointerMove = (event: PointerEvent) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.inside = event.target === canvas && event.pointerType === "mouse";
    if (press && event.target === canvas) {
      const dx = event.clientX - press.x;
      press.moved = Math.max(press.moved, Math.hypot(dx, event.clientY - press.y));
      if (press.moved > 6) boost += (event.movementX || dx * 0.1) * 26;
    }
  };
  const onPointerLeave = () => {
    pointer.inside = false;
  };
  const onPointerDown = (event: PointerEvent) => {
    press = { x: event.clientX, y: event.clientY, time: performance.now(), moved: 0 };
    if (event.pointerType !== "mouse") {
      pointer.x = pointer.sx = event.clientX;
      pointer.y = pointer.sy = event.clientY;
    }
  };
  const onPointerUp = (event: PointerEvent) => {
    const tap = press && press.moved < 8 && performance.now() - press.time < 600;
    press = null;
    if (!tap) return;
    const i = hitTest(event.clientX, event.clientY);
    const target = i >= 0 ? targetFor(i) : null;
    if (target) options.onPick(target);
  };
  const onWheel = (event: WheelEvent) => {
    boost += (event.deltaY + event.deltaX) * 9;
    boost = Math.max(-5200, Math.min(5200, boost));
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", onVisibility);

  resize();
  start();

  // ── API ─────────────────────────────────────────────────────────────────
  return {
    setBreeds(next: FieldBreed[]) {
      breeds = next;
      atlas.update(next);
    },

    /** Máscara por celda (1 = coincide con la búsqueda). `null`: todo coincide. */
    setMatches(mask: Uint8Array | null) {
      matches = mask;
    },

    setSpotlight(slug: string | null) {
      spotlightCell = slug ? breeds.findIndex((breed) => breed.slug === slug) : -1;
    },

    /** Con el Ronrón abierto el campo se atenúa y se desliza más despacio. */
    setDimmed(dimmed: boolean) {
      gsap.to(orbs.uniforms.uDim, { value: dimmed ? 1 : 0, duration: 0.7, ease: "sine.inOut" });
      gsap.to(flow, { speed: dimmed ? 0.25 : 1, duration: 1.2, ease: "sine.inOut" });
    },

    /**
     * Cambio de tema: los colores se funden en el shader (un tween de 0 a 1
     * que mezcla cada color de origen con el de destino). Nada se recrea.
     */
    setTheme(next: FieldTheme) {
      if (next === theme) return;
      theme = next;
      const to = PALETTES[next];
      const colors: Array<[Color, string]> = [
        [orbs.uniforms.uOrb.value, to.orb.orb],
        [orbs.uniforms.uShade.value, to.orb.shade],
        [orbs.uniforms.uInk.value, to.orb.ink],
        [orbs.uniforms.uEar.value, to.orb.ear],
        [orbs.uniforms.uRing.value, to.orb.ring],
        [orbs.uniforms.uShadowColor.value, to.orb.shadowColor],
        [orbs.uniforms.uGlowColor.value, to.orb.glowColor],
        [backdrop.uniforms.uWave.value, to.backdrop.wave],
        [backdrop.uniforms.uRim.value, to.backdrop.rim],
        [veil.uniforms.uColor.value, to.veil],
      ];
      const from = colors.map(([color]) => color.clone());
      const target = colors.map(([, hex]) => new Color(hex));
      const numbers: Array<[{ value: number }, number]> = [
        [orbs.uniforms.uShadow, to.orb.shadow],
        [orbs.uniforms.uGlow, to.orb.glow],
        [backdrop.uniforms.uWaveAlpha, to.backdrop.waveAlpha],
        [backdrop.uniforms.uStars, to.backdrop.stars],
      ];
      const start = numbers.map(([uniform]) => uniform.value);
      const mix = { t: 0 };
      const apply = () => {
        colors.forEach(([color], i) => color.copy(from[i]).lerp(target[i], mix.t));
        numbers.forEach(([uniform, value], i) => (uniform.value = start[i] + (value - start[i]) * mix.t));
      };
      themeTween?.kill();
      themeTween = gsap.to(mix, { t: 1, duration: motion ? 0.9 : 0.01, ease: "sine.inOut", onUpdate: apply });
    },

    /** Pantalla de inicio: velo lleno y túnel en marcha lenta. */
    beginLink() {
      veil.uniforms.uAlpha.value = 1;
      veil.uniforms.uGlow.value = 0;
      tunnel.mesh.visible = true;
      tunnel.uniforms.uSpeed.value = 0.06;
      gsap.to(tunnel.uniforms.uAlpha, { value: 1, duration: 0.9, ease: "sine.out" });
      gsap.to(tunnel.uniforms.uSpeed, { value: 0.32, duration: 2.6, ease: "sine.in" });
    },

    /** Llegada: acelerón, destello suave y el cielo aparece con sus orbes. */
    arrive(): Promise<void> {
      return new Promise((resolve) => {
        const tl = gsap.timeline({
          onComplete: () => {
            tunnel.mesh.visible = false;
            resolve();
          },
        });
        tl.to(tunnel.uniforms.uSpeed, { value: 1.1, duration: 0.9, ease: "power2.in" }, 0)
          .to(veil.uniforms.uGlow, { value: 1, duration: 0.9, ease: "sine.in" }, 0)
          .to(tunnel.uniforms.uAlpha, { value: 0, duration: 0.6, ease: "sine.inOut" }, 0.75)
          .to(veil.uniforms.uAlpha, { value: 0, duration: 1.4, ease: "sine.inOut" }, 0.95)
          .to(orbs.uniforms.uIntro, { value: 1, duration: 2.2, ease: "power2.out" }, 1.05);
      });
    },

    /** Sin pantalla de inicio (ya se entró en esta sesión): solo la entrada de orbes. */
    reveal() {
      veil.uniforms.uAlpha.value = 0;
      tunnel.mesh.visible = false;
      gsap.to(orbs.uniforms.uIntro, { value: 1, duration: motion ? 1.8 : 0.01, ease: "power2.out" });
    },

    /** Posición en pantalla del orbe de una raza (el más cercano al centro). */
    locate(slug: string): OrbTarget | null {
      let best = -1;
      let bestDistance = Infinity;
      for (const i of order) {
        const breed = breeds[drawCell[i]];
        if (breed?.slug !== slug) continue;
        const d = Math.hypot(drawX[i] - width / 2, drawY[i] - height / 2);
        if (d < bestDistance) {
          bestDistance = d;
          best = i;
        }
      }
      return best >= 0 ? targetFor(best) : null;
    },

    dispose() {
      stop();
      themeTween?.kill();
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      gsap.killTweensOf(flow);
      orbs.dispose();
      backdrop.dispose();
      tunnel.dispose();
      veil.dispose();
      atlas.dispose();
      renderer.dispose();
    },
  };
}

export type FieldEngine = ReturnType<typeof createFieldEngine>;
