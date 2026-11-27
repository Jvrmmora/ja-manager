import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import ScanStage, { type ScanPhase } from './season/ScanStage';
import SeasonCard from './season/SeasonCard';
import Reveal from './ui/Reveal';

// Duración de cada fase de la animación (ms).
const PHASE_MS = [1500, 2200, 900, 3800];

const STEPS = [
  {
    title: 'Llega al culto',
    text: 'Cada sábado hay un código QR del día. También te esperamos en tu grupo pequeño.',
  },
  {
    title: 'Escanea el QR',
    text: 'Apunta con tu celular. En segundos queda registrada tu asistencia.',
  },
  {
    title: 'Enciende tu llama',
    text: 'Sumas puntos, tu racha crece y subes en el ranking de la temporada.',
  },
];

const PILL_CLASS =
  'min-h-[44px] rounded-full border border-white/25 px-5 text-[13px] font-bold text-white transition-colors hover:border-white/50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40';

// Sección fija (no editable desde el CMS): cómo funcionan las temporadas.
export default function SeasonSection() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { amount: 0.4 });
  const [phase, setPhase] = useState<ScanPhase>(0);
  const [paused, setPaused] = useState(false);

  const userInfo = authService.getUserInfo();
  const isAuthenticated = authService.isAuthenticated() && !!userInfo;
  const homePath =
    userInfo?.role_name === 'Young role' ? '/dashboard' : '/admin';

  useEffect(() => {
    if (reduceMotion || paused || !inView) return;
    const timer = window.setTimeout(
      () => setPhase(current => ((current + 1) % 4) as ScanPhase),
      PHASE_MS[phase]
    );
    return () => window.clearTimeout(timer);
  }, [phase, paused, inView, reduceMotion]);

  // Con "reducir movimiento" se muestra directamente el resultado.
  const shownPhase: ScanPhase = reduceMotion ? 3 : phase;
  const activeStep = shownPhase === 0 ? 0 : shownPhase === 3 ? 2 : 1;

  return (
    <section id="season" className="relative overflow-hidden bg-ink-950 py-24 md:py-28">
      <div className="pointer-events-none absolute -right-72 -top-96 h-[900px] w-[900px] rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.3)_0%,rgba(138,28,69,.18)_40%,rgba(20,11,16,0)_68%)] motion-safe:animate-ember" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-12 px-4 sm:px-6 md:gap-16 lg:px-8">
        <Reveal className="flex flex-col items-center gap-4 text-center">
          <span className="eyebrow text-brand-amber">Temporadas</span>
          <h2 className="m-0 max-w-4xl font-display text-4xl font-semibold uppercase leading-[1.05] text-white md:text-6xl">
            Venir cada semana <span className="text-fire">tiene premio</span>
          </h2>
          <p className="m-0 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">
            Así de fácil: llegas, escaneas el QR con tu celular y tu llama se
            enciende.
          </p>
        </Reveal>

        <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-center lg:gap-24">
          <div ref={stageRef} className="flex flex-col items-center gap-4">
            <ScanStage phase={shownPhase} />
            {!reduceMotion && (
              <div className="flex gap-3">
                <button type="button" className={PILL_CLASS} onClick={() => setPaused(p => !p)}>
                  {paused ? 'Reproducir' : 'Pausar'}
                </button>
                <button
                  type="button"
                  className={PILL_CLASS}
                  onClick={() => {
                    setPhase(0);
                    setPaused(false);
                  }}
                >
                  Ver otra vez
                </button>
              </div>
            )}
          </div>

          <div className="flex w-full max-w-[460px] flex-col gap-3.5">
            <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
              {STEPS.map((step, index) => {
                const active = index === activeStep;
                return (
                  <li
                    key={step.title}
                    aria-current={active && !reduceMotion ? 'step' : undefined}
                    className={`flex items-center gap-4 rounded-3xl border-2 p-5 transition-all duration-500 ${
                      active
                        ? 'border-brand-amber bg-[#3A1A22] lg:translate-x-2.5'
                        : 'border-white/10 bg-ink-900'
                    }`}
                  >
                    <span
                      className={`flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-full font-display text-[22px] font-bold text-white ${
                        active ? 'bg-fire' : 'bg-white/10'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <h3 className="m-0 font-display text-[22px] font-semibold uppercase leading-tight text-white">
                        {step.title}
                      </h3>
                      <p className="m-0 text-sm leading-relaxed text-white/75">
                        {step.text}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="m-0 px-1 pt-1.5 text-sm leading-relaxed text-white/70">
              Tu grupo pequeño, invitar amigos, tu cumpleaños y las actividades
              también suman.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal className="h-full">
            <div className="flex h-full flex-col justify-center gap-4 rounded-[28px] border border-white/10 bg-ink-900 p-6 md:p-10">
              <h3 className="m-0 font-display text-3xl font-semibold uppercase text-white">
                ¿Qué es una temporada?
              </h3>
              <p className="m-0 text-base leading-relaxed text-white/75">
                Es un periodo con fecha de inicio y de cierre. Lo que vives en
                ese tiempo suma puntos a tu nombre. Al cerrar, los tres primeros
                del ranking reciben premio y arranca una temporada nueva: todos
                vuelven a empezar con la misma oportunidad.
              </p>
              <button
                type="button"
                onClick={() => navigate(isAuthenticated ? homePath : '/register')}
                className="btn-fire mt-2 min-h-[52px] self-start px-7 text-[15px] font-extrabold"
              >
                {isAuthenticated ? 'Ir a mi panel' : 'Regístrate y empieza a sumar'}
              </button>
            </div>
          </Reveal>
          <Reveal className="h-full" delay={0.1}>
            <SeasonCard />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
