import { useId, type SVGProps } from "react";

/**
 * El orbe-gato en SVG: la misma silueta que dibuja el shader del campo
 * (cabeza redonda + dos orejas), para usarla en la interfaz: logo, botón de
 * inicio, iconos de la lista y el marco del visor del Ronrón.
 *
 * viewBox 100×100. Las puntas de las orejas se redondean con el trazo.
 */
export const ORB_PATH_HEAD = { cx: 50, cy: 57, r: 38 };
export const ORB_PATH_EARS = ["M20 39 L29 18 L42 28 Z", "M80 39 L71 18 L58 28 Z"];
export const ORB_PATH_INNER_EARS = ["M25 34 L29.5 23 L36 29 Z", "M75 34 L70.5 23 L64 29 Z"];

interface OrbShapeProps extends SVGProps<SVGSVGElement> {
  fill?: string;
  /** Aluminio: degradado claro arriba y canto oscuro, como una tapa mecanizada. */
  metal?: boolean;
  innerEar?: string | null;
  face?: boolean;
  faceColor?: string;
}

export function OrbShape({
  fill: plainFill = "currentColor",
  metal = false,
  innerEar = null,
  face = false,
  faceColor = "var(--ink)",
  ...props
}: OrbShapeProps) {
  const gradientId = useId();
  const fill = metal ? `url(#${gradientId})` : plainFill;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" {...props}>
      {metal && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {/* Las orejas (arriba) en aluminio medio para que se lean sobre
                fondo claro; el brillo cae sobre la frente y la sombra abajo. */}
            <stop offset="0" stopColor="var(--alu-lo)" />
            <stop offset="0.42" stopColor="var(--alu-hi)" />
            <stop offset="1" stopColor="var(--alu-lo)" />
          </linearGradient>
        </defs>
      )}
      <g fill={fill} stroke={fill} strokeWidth={8} strokeLinejoin="round">
        {ORB_PATH_EARS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <circle {...ORB_PATH_HEAD} fill={fill} />
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
