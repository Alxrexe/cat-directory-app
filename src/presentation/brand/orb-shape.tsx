import { useId, type SVGProps } from "react";

/**
 * El orbe-gato en SVG: la misma silueta que dibuja el shader del campo
 * (cabeza redonda + dos orejas), para usarla en la interfaz: logo, botón de
 * inicio, iconos de la lista y el marco del visor del Ronrón.
 *
 * viewBox 100×100. Las puntas de las orejas se redondean con el trazo.
 */
export const ORB_PATH_HEAD = { cx: 50, cy: 57, r: 38 };
export const ORB_PATH_EARS = ["M23 38 L30.5 22 L40.5 30 Z", "M77 38 L69.5 22 L59.5 30 Z"];
export const ORB_PATH_INNER_EARS = ["M27.5 34.5 L31 26.5 L36 30.5 Z", "M72.5 34.5 L69 26.5 L64 30.5 Z"];

interface OrbShapeProps extends SVGProps<SVGSVGElement> {
  fill?: string;
  /** Perla: plástico blanco con las orejas en el lavanda del aro y un filete. */
  pearl?: boolean;
  innerEar?: string | null;
  face?: boolean;
  faceColor?: string;
}

export function OrbShape({
  fill: plainFill = "currentColor",
  pearl = false,
  innerEar = null,
  face = false,
  faceColor = "var(--ink)",
  ...props
}: OrbShapeProps) {
  const gradientId = useId();
  const fill = pearl ? `url(#${gradientId})` : plainFill;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" {...props}>
      {pearl && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {/* Las orejas (arriba) en el lavanda del aro, para que se lean
                sobre fondo claro; la luz cae sobre la frente. */}
            <stop offset="0.18" stopColor="var(--ring)" />
            <stop offset="0.4" stopColor="var(--pearl-hi)" />
            <stop offset="1" stopColor="var(--surface-3)" />
          </linearGradient>
        </defs>
      )}
      <g fill={fill} stroke={fill} strokeWidth={8} strokeLinejoin="round">
        {ORB_PATH_EARS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <circle {...ORB_PATH_HEAD} fill={fill} />
      {pearl && <circle {...ORB_PATH_HEAD} fill="none" stroke="var(--hairline)" strokeWidth={1.5} />}
      {innerEar && (
        <g fill={innerEar} stroke={innerEar} strokeWidth={3} strokeLinejoin="round">
          {ORB_PATH_INNER_EARS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      )}
      {face && (
        <g fill={faceColor}>
          <ellipse cx="37" cy="56" rx="4.2" ry="5.4" />
          <ellipse cx="63" cy="56" rx="4.2" ry="5.4" />
          <path d="M46 66 Q50 70 54 66 Q50 68.5 46 66 Z" />
        </g>
      )}
    </svg>
  );
}
