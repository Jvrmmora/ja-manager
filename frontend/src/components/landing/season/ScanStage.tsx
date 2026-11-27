// Animación decorativa: un celular escanea el QR del culto y se enciende la llama.
// Fases: 0 apunta · 1 escanea · 2 código leído · 3 llama.
export type ScanPhase = 0 | 1 | 2 | 3;

const FLAME_PATH =
  'M12 2c1 4-1 5.5-3 8-1.7 2.1-3 3.8-3 6.3C6 20 8.7 22 12 22s6-2.2 6-6c0-2.6-1.2-4.6-2.6-6.2-.3 1.7-1.1 2.7-2.2 3.2.8-4.4-.2-8.6-1.2-11z';

// QR de adorno (no lleva a ningún enlace): patrón fijo con las tres marcas de esquina.
const QR_SIZE = 25;
const QR_PATH = (() => {
  const finders = [
    [0, 0],
    [QR_SIZE - 7, 0],
    [0, QR_SIZE - 7],
  ];
  let d = '';
  for (let y = 0; y < QR_SIZE; y++) {
    for (let x = 0; x < QR_SIZE; x++) {
      const finder = finders.find(
        ([cx, cy]) => x >= cx - 1 && x <= cx + 7 && y >= cy - 1 && y <= cy + 7
      );
      let on: boolean;
      if (finder) {
        const dx = x - finder[0];
        const dy = y - finder[1];
        const inside = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
        const ring = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        on = inside && (ring || core);
      } else {
        on = (x * 7 + y * 13 + x * y * 3 + (x ^ y)) % 7 < 3;
      }
      if (on) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return d;
})();

const SPARKS = Array.from({ length: 14 }, (_, k) => ({
  left: `${14 + ((k * 41) % 72)}%`,
  size: 5 + (k % 3) * 2,
  color: ['#FDE68A', '#F9A23B', '#F26A2E'][k % 3],
  duration: `${1.3 + (k % 4) * 0.35}s`,
  delay: `${(k % 7) * 0.2}s`,
}));

const CAMERA_TEXT = ['Apunta al código', 'Escaneando…', '¡Código leído!', ''];

const CORNERS = [
  '-top-0.5 -left-0.5 border-t-4 border-l-4 rounded-tl-[10px]',
  '-top-0.5 -right-0.5 border-t-4 border-r-4 rounded-tr-[10px]',
  '-bottom-0.5 -left-0.5 border-b-4 border-l-4 rounded-bl-[10px]',
  '-bottom-0.5 -right-0.5 border-b-4 border-r-4 rounded-br-[10px]',
];

function QrCode({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
      shapeRendering="crispEdges"
      className="block"
    >
      <path d={QR_PATH} fill="#140B10" />
    </svg>
  );
}

export default function ScanStage({ phase }: { phase: ScanPhase }) {
  const aiming = phase === 0;
  const fire = phase === 3;

  return (
    <div
      role="img"
      aria-label="Un celular escanea el código QR del culto joven y se enciende una llama"
      className="relative h-[500px] w-[354px] flex-shrink-0 select-none max-[389px]:[zoom:0.88] max-[359px]:[zoom:0.78]"
    >
      <div aria-hidden="true">
        {/* Cartel con el QR del culto */}
        <div className="absolute left-0 top-10 flex w-[188px] -rotate-[5deg] flex-col items-center gap-2.5 rounded-[22px] bg-cream p-3.5 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.8)]">
          <span className="font-display text-lg font-bold uppercase text-[#4E0F3A]">
            Culto joven
          </span>
          <QrCode size={150} />
          <span className="text-xs font-bold text-brand-wine">
            Escanéame al llegar
          </span>
        </div>

        {/* Celular */}
        <div
          className="absolute left-[134px] top-10 h-[432px] w-[212px] rounded-[40px] border-2 border-white/20 bg-[#0B0609] p-[9px] shadow-[0_40px_80px_-30px_rgba(242,106,46,0.7)] motion-safe:transition-transform motion-safe:duration-[1300ms] motion-safe:ease-[cubic-bezier(.3,.8,.25,1)]"
          style={{
            transform: aiming
              ? 'translate(16px, 56px) rotate(12deg)'
              : 'translate(-22px, 0) rotate(2deg)',
          }}
        >
          <div className="relative h-full w-full overflow-hidden rounded-[31px] bg-ink-900">
            <span className="absolute left-1/2 top-2 z-10 h-[18px] w-[66px] -translate-x-1/2 rounded-full bg-[#0B0609]" />

            {/* Cámara */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-[radial-gradient(circle_at_50%_45%,#5B4A52,#20141A_75%)]">
              <div className="relative flex h-[146px] w-[146px] items-center justify-center">
                <div
                  className="rounded-lg bg-cream p-2 motion-safe:transition-transform motion-safe:duration-[1300ms]"
                  style={{
                    transform: aiming
                      ? 'scale(0.55) rotate(-14deg)'
                      : 'scale(1) rotate(0deg)',
                  }}
                >
                  <QrCode size={112} />
                </div>
                {CORNERS.map(corner => (
                  <span
                    key={corner}
                    className={`absolute h-[30px] w-[30px] transition-colors duration-300 ${corner} ${
                      phase >= 2 ? 'border-emerald-500' : 'border-brand-amber'
                    }`}
                  />
                ))}
                {phase === 1 && (
                  <span className="absolute left-1 right-1 top-1.5 h-[3px] rounded-full bg-brand-amber shadow-[0_0_18px_5px_rgba(249,162,59,0.75)] motion-safe:animate-qr-sweep" />
                )}
                {phase === 2 && (
                  <span className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 motion-safe:animate-pop">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-white">
                {CAMERA_TEXT[phase]}
              </span>
            </div>

            {/* Pantalla de fuego */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-[radial-gradient(circle_at_50%_42%,#8A1C45_0%,#3A1020_52%,#140B10_100%)] px-3.5 text-center motion-safe:transition-[clip-path,opacity] motion-safe:duration-700"
              style={{
                opacity: fire ? 1 : 0,
                clipPath: `circle(${fire ? '150%' : '0%'} at 50% 45%)`,
              }}
            >
              {fire && (
                <>
                  <span className="h-[190px]" />
                  <span className="font-display text-2xl font-bold uppercase leading-tight text-white motion-safe:animate-pop">
                    ¡Asistencia registrada!
                  </span>
                  <span className="text-[13px] font-bold text-[#FDE68A] motion-safe:animate-pop">
                    Sumaste puntos · racha encendida
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Llama que sale del celular */}
        {fire && (
          <div className="pointer-events-none absolute left-[150px] top-[76px] z-20 flex h-[190px] w-[180px] items-end justify-center">
            <div className="origin-bottom motion-safe:animate-burst">
              <div className="origin-bottom drop-shadow-[0_0_28px_rgba(249,162,59,0.9)] motion-safe:animate-flicker">
                <svg width="180" height="180" viewBox="0 0 24 24" className="block">
                  <path d={FLAME_PATH} fill="#F26A2E" />
                  <path d={FLAME_PATH} fill="#F9A23B" transform="translate(3 6.4) scale(.72)" />
                  <path d={FLAME_PATH} fill="#FDE68A" transform="translate(6.6 13.2) scale(.42)" />
                </svg>
              </div>
            </div>
            {SPARKS.map((spark, i) => (
              <span
                key={i}
                className="absolute bottom-10 rounded-full opacity-0 motion-safe:animate-spark"
                style={{
                  left: spark.left,
                  width: spark.size,
                  height: spark.size,
                  background: spark.color,
                  animationDuration: spark.duration,
                  animationDelay: spark.delay,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
