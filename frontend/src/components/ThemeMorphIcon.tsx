import React, { useId } from 'react';

// Rayos del sol: 8 trazos a 45° entre sí, a 7.5–10 unidades del centro.
const RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

// Transición compartida por las partes animadas del ícono.
const motion =
  'transition-transform duration-500 ease-in-out motion-reduce:transition-none';

interface ThemeMorphIconProps {
  /** true = media luna; false = sol. El cambio entre ambos se anima. */
  dark: boolean;
  className?: string;
}

/**
 * Sol que se transforma en media luna con una máscara SVG: un círculo "muerde"
 * el disco (de día queda fuera; de noche se desliza encima) y los rayos se
 * retraen girando. Solo usa transform/opacity, así que corre en el compositor.
 */
const ThemeMorphIcon: React.FC<ThemeMorphIconProps> = ({
  dark,
  className = 'h-6 w-6',
}) => {
  const maskId = useId();

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <mask id={maskId}>
        <rect width="24" height="24" fill="white" />
        <circle
          cx="17.5"
          cy="6.5"
          r="8.3"
          fill="black"
          className={motion}
          style={{
            transform: dark ? 'translate(0, 0)' : 'translate(14px, -14px)',
          }}
        />
      </mask>

      {/* Disco: sol (r=5) de día, luna (r=9) de noche */}
      <circle
        cx="12"
        cy="12"
        r="5"
        fill="currentColor"
        mask={`url(#${maskId})`}
        className={motion}
        style={{
          transformOrigin: '12px 12px',
          transform: dark ? 'scale(1.8)' : 'scale(1)',
        }}
      />

      {/* Rayos: se retraen girando al pasar a modo oscuro */}
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={`${motion} transition-opacity`}
        style={{
          transformOrigin: '12px 12px',
          transform: dark ? 'rotate(90deg) scale(0.3)' : 'rotate(0) scale(1)',
          opacity: dark ? 0 : 1,
        }}
      >
        {RAY_ANGLES.map(angle => (
          <line
            key={angle}
            x1="12"
            y1="2"
            x2="12"
            y2="4.5"
            transform={`rotate(${angle} 12 12)`}
          />
        ))}
      </g>
    </svg>
  );
};

export default ThemeMorphIcon;
