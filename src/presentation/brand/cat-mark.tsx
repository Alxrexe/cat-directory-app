import type { SVGProps } from "react";

/**
 * La marca del Michiverso: la cabeza de un gato en pizarra, con ojos y
 * bigotes, dentro del aro lavanda de un botón de consola. Es el logo, el
 * avatar de la barra de sistema y el sello de las pantallas de aviso.
 *
 * viewBox 100×100. `ring={false}` deja solo la cabeza (para iconos
 * pequeños sobre una pieza que ya tiene aro).
 */
export const CAT_HEAD_PATH =
  "M31.5 26.5C33.5 26 39 30.5 43.5 36C47.6 35 52.4 35 56.5 36C61 30.5 66.5 26 68.5 26.5C70.8 27.2 71.8 36 70 43.5C73.4 48.2 75 53 75 58C75 70 63.8 77 50 77C36.2 77 25 70 25 58C25 53 26.6 48.2 30 43.5C28.2 36 29.2 27.2 31.5 26.5Z";

const WHISKERS = [
  "M17 60.2L29.5 61.4",
  "M17.8 65.6L29.5 64.6",
  "M19.8 70.6L30 67.6",
  "M83 60.2L70.5 61.4",
  "M82.2 65.6L70.5 64.6",
  "M80.2 70.6L70 67.6",
];

interface CatMarkProps extends SVGProps<SVGSVGElement> {
  ring?: boolean;
  /** Color de la cabeza; por defecto, la pizarra del sistema. */
  tone?: string;
}

export function CatMark({ ring = true, tone = "var(--slate)", ...props }: CatMarkProps) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" {...props}>
      {ring && <circle cx="50" cy="50" r="46" fill="var(--surface)" stroke="var(--ring)" strokeWidth="4" />}
      <g stroke={tone} strokeWidth="1.8" strokeLinecap="round">
        {WHISKERS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <path d={CAT_HEAD_PATH} fill={tone} />
      <g fill="var(--surface)">
        <ellipse cx="40.5" cy="56" rx="3.9" ry="5.3" />
        <ellipse cx="59.5" cy="56" rx="3.9" ry="5.3" />
        <path d="M47.4 62.2H52.6C53.4 62.2 53.8 63.1 53.2 63.7L50.7 66C50.3 66.4 49.7 66.4 49.3 66L46.8 63.7C46.2 63.1 46.6 62.2 47.4 62.2Z" />
      </g>
      <path
        d="M50 66.2V67.6M50 67.6C49 69.4 47.2 69.6 46 68.6M50 67.6C51 69.4 52.8 69.6 54 68.6"
        fill="none"
        stroke="var(--surface)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
