// Llama decorativa de la portada: capas SVG difuminadas que titilan + brasas que suben.
// Solo CSS (sin JS) para que también anime en el HTML prerenderizado.
const FLAME_PATH =
  'M50 0C57 26 88 50 88 98c0 36-17 62-38 62S12 134 12 98c0-28 17-42 23-64 6 16 12 18 14 6 2-14-1-28 1-40Z';

// Posiciones fijas (nada aleatorio en render: evita diferencias con el prerender)
const EMBERS = [
  { x: '38%', s: 3, d: 7.5, delay: 0, drift: '-18px' },
  { x: '46%', s: 2, d: 6.2, delay: 1.4, drift: '14px' },
  { x: '52%', s: 4, d: 8.4, delay: 2.6, drift: '-10px' },
  { x: '58%', s: 2, d: 6.8, delay: 0.7, drift: '22px' },
  { x: '42%', s: 3, d: 9.1, delay: 3.8, drift: '8px' },
  { x: '64%', s: 2, d: 7.2, delay: 4.6, drift: '-16px' },
  { x: '34%', s: 2, d: 8.0, delay: 5.4, drift: '12px' },
  { x: '55%', s: 3, d: 6.5, delay: 6.1, drift: '-24px' },
  { x: '48%', s: 2, d: 9.4, delay: 2.1, drift: '18px' },
  { x: '61%', s: 3, d: 7.8, delay: 3.2, drift: '-6px' },
];

export default function HeroFlame({ className = '' }: { className?: string }) {
  return (
    <div className={`hero-flame pointer-events-none ${className}`} aria-hidden="true">
      <div className="hero-flame__glow" />

      <svg className="hero-flame__layer hero-flame__outer" viewBox="0 0 100 160" preserveAspectRatio="xMidYMax meet">
        <defs>
          <linearGradient id="hf-outer" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#8A1C45" />
            <stop offset="55%" stopColor="#DC3340" />
            <stop offset="100%" stopColor="#F26A2E" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hf-mid" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#DC3340" />
            <stop offset="45%" stopColor="#F26A2E" />
            <stop offset="100%" stopColor="#F9A23B" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hf-core" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#F9A23B" />
            <stop offset="60%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#FFF8F1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={FLAME_PATH} fill="url(#hf-outer)" />
      </svg>
      <svg className="hero-flame__layer hero-flame__mid" viewBox="0 0 100 160" preserveAspectRatio="xMidYMax meet">
        <path d={FLAME_PATH} fill="url(#hf-mid)" />
      </svg>
      <svg className="hero-flame__layer hero-flame__core" viewBox="0 0 100 160" preserveAspectRatio="xMidYMax meet">
        <path d={FLAME_PATH} fill="url(#hf-core)" />
      </svg>

      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="hero-flame__ember"
          style={
            {
              left: e.x,
              width: e.s,
              height: e.s,
              '--ember-d': `${e.d}s`,
              '--ember-delay': `${e.delay}s`,
              '--ember-drift': e.drift,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
