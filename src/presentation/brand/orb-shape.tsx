import type { SVGProps } from "react";

/**
 * El orbe-gato en SVG: la misma silueta que dibuja el shader del campo
 * (cabeza redonda + dos orejas), para usarla en la interfaz: logo, botón de
 * inicio, iconos de la lista y el marco del visor del Ronrón.
 *
 * viewBox 100×100. Las puntas de las orejas se redondean con el trazo.
 */
export const ORB_PATH_HEAD = { cx: 50, cy: 57, r: 38 };
export const ORB_PATH_EARS = ["M15 42 L27 8 L46 26 Z", "M85 42 L73 8 L54 26 Z"];
export const ORB_PATH_INNER_EARS = ["M22 34 L29 16 L39 27 Z", "M78 34 L71 16 L61 27 Z"];

interface OrbShapeProps extends SVGProps<SVGSVGElement> {
  fill?: string;
  innerEar?: string | null;
  face?: boolean;
  faceColor?: string;
}

export function OrbShape({ fill = "currentColor", innerEar = null, face = false, faceColor = "#172340", ...props }: OrbShapeProps) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" {...props}>
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
