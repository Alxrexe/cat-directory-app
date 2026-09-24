"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";

/**
 * Figura del hero: un iris felino dibujado en un shader (ogl, ~10 KB).
 *
 * - Debajo siempre hay un iris estático en CSS: es lo que ve quien no tiene
 *   WebGL, prefiere movimiento reducido o todavía no cargó el módulo. El
 *   canvas aparece encima con un fundido, sin mover el layout.
 * - ogl se importa cuando el navegador queda ocioso, fuera del camino
 *   crítico de la página.
 * - El bucle solo corre con la figura en pantalla y la pestaña visible.
 * - La pupila se dilata cuando el puntero se acerca y el iris lo sigue.
 */
const VERTEX = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uLook;
  uniform float uDilate;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    vec2 q = p - uLook * 0.1;
    float r = length(q);
    float a = atan(q.y, q.x);

    // Fibras del estroma: ruido angular estirado en radio.
    float fibers = noise(vec2(a * 16.0, r * 3.0 - uTime * 0.04)) * 0.6
                 + noise(vec2(a * 44.0, r * 10.0)) * 0.4;

    vec3 inner = vec3(0.47, 0.49, 0.16);
    vec3 outer = vec3(0.86, 0.55, 0.12);
    vec3 iris = mix(inner, outer, smoothstep(0.12, 0.8, r + fibers * 0.2));
    iris *= 0.72 + fibers * 0.42;
    iris = mix(iris, iris * 0.2, smoothstep(0.74, 0.9, r)); // anillo limbal

    float width = mix(0.07, 0.34, uDilate);
    float pupil = length(vec2(q.x / width, q.y / 0.74));
    vec3 color = mix(iris, vec3(0.035, 0.03, 0.025), 1.0 - smoothstep(0.94, 1.04, pupil));

    color += smoothstep(0.12, 0.0, length(p - vec2(-0.3, 0.34))) * 0.6; // brillo

    float disc = 1.0 - smoothstep(0.935, 0.95, length(p));
    gl_FragColor = vec4(color * disc, disc);
  }
`;

export function Iris({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let teardown = () => {};

    const start = async () => {
      if (!host.offsetWidth) return; // oculto (móvil): ni se descarga ogl
      const ogl = await import("ogl").catch(() => null);
      if (disposed || !ogl) return; // sin red: se queda el iris de CSS
      const { Renderer, Program, Mesh, Triangle } = ogl;

      let renderer: InstanceType<typeof Renderer>;
      try {
        renderer = new Renderer({ alpha: true, premultipliedAlpha: true, dpr: Math.min(2, window.devicePixelRatio) });
      } catch {
        return; // sin WebGL: se queda el iris de CSS
      }
      const { gl } = renderer;
      gl.clearColor(0, 0, 0, 0);
      gl.canvas.setAttribute("aria-hidden", "true");
      gl.canvas.className = "absolute inset-0 size-full";
      host.appendChild(gl.canvas);

      const program = new Program(gl, {
        vertex: VERTEX,
        fragment: FRAGMENT,
        transparent: true,
        uniforms: { uTime: { value: 0 }, uLook: { value: [0, 0] }, uDilate: { value: 0.35 } },
      });
      const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

      const resize = () => renderer.setSize(host.clientWidth, host.clientHeight);
      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      const target = { x: 0, y: 0, near: 0 };
      const current = { x: 0, y: 0, near: 0 };
      const onPointer = (event: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) / window.innerWidth;
        const dy = (event.clientY - (rect.top + rect.height / 2)) / window.innerHeight;
        target.x = Math.max(-1, Math.min(1, dx * 2.4));
        target.y = Math.max(-1, Math.min(1, -dy * 2.4));
        target.near = Math.max(0, 1 - Math.hypot(dx, dy) * 2.2);
      };

      let frame = 0;
      let visible = true;
      const render = (time: number) => {
        current.x += (target.x - current.x) * 0.06;
        current.y += (target.y - current.y) * 0.06;
        current.near += (target.near - current.near) * 0.04;
        program.uniforms.uTime.value = time / 1000;
        program.uniforms.uLook.value = [current.x, current.y];
        program.uniforms.uDilate.value = 0.28 + Math.sin(time / 1600) * 0.06 + current.near * 0.5;
        renderer.render({ scene: mesh });
        frame = visible && !document.hidden ? requestAnimationFrame(render) : 0;
      };
      const resume = () => {
        if (!frame && visible && !document.hidden && !reducedMotion) frame = requestAnimationFrame(render);
      };

      const intersection = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        resume();
      });
      intersection.observe(host);
      document.addEventListener("visibilitychange", resume);
      if (!reducedMotion) window.addEventListener("pointermove", onPointer, { passive: true });

      render(0);
      if (reducedMotion) cancelAnimationFrame(frame);
      setLive(true);

      teardown = () => {
        cancelAnimationFrame(frame);
        intersection.disconnect();
        resizeObserver.disconnect();
        document.removeEventListener("visibilitychange", resume);
        window.removeEventListener("pointermove", onPointer);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        gl.canvas.remove();
      };
    };

    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
    const handle = idle(() => void start());

    return () => {
      disposed = true;
      (window.cancelIdleCallback ?? window.clearTimeout)(handle);
      teardown();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={cn("relative aspect-square [&>canvas]:transition-opacity [&>canvas]:duration-700", className)}
      data-live={live}
    >
      {/* Iris de respaldo: el mismo dibujo, en CSS y sin movimiento. */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-[3%] rounded-full transition-opacity duration-700",
          "bg-[radial-gradient(ellipse_9%_37%_at_50%_50%,#0a0806_96%,transparent_100%),radial-gradient(circle_at_32%_32%,rgb(255_255_255/0.55),transparent_9%),radial-gradient(circle,#79791f_0%,#c98a22_45%,#dc8c1f_72%,#3a2408_92%)]",
          live && "opacity-0",
        )}
      />
    </div>
  );
}
