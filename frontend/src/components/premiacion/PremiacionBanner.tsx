import React, { lazy, Suspense, useEffect, useState } from 'react';
import PageLoader from '../PageLoader';
import { seasonService } from '../../services/seasonService';
import type { ISeasonResultsData } from '../../types';
import {
  launchImmersive,
  type PremiacionLaunch,
} from '../../features/premiacion/launch';

const PremiacionOverlay = lazy(() => import('./PremiacionOverlay'));

// Cuánto tiempo se anuncia la premiación tras cerrar la temporada
const VISIBLE_DAYS = 30;
const seenKey = (seasonId: string) => `premiacionVista:${seasonId}`;

/**
 * Aviso en el panel del joven: la premiación de la última temporada se abre
 * sola la primera vez y queda un botón para repetirla.
 */
const PremiacionBanner: React.FC = () => {
  const [latest, setLatest] = useState<ISeasonResultsData | null>(null);
  // Al abrirse sola no hay clic: va sin sonido ni pantalla completa
  const [open, setOpen] = useState<{ launch?: PremiacionLaunch } | null>(null);

  useEffect(() => {
    let cancelled = false;
    seasonService
      .getLatestResults()
      .then(data => {
        if (cancelled || !data || data.results.podium.length === 0) return;
        const age = Date.now() - new Date(data.results.finalizedAt).getTime();
        if (age > VISIBLE_DAYS * 24 * 60 * 60 * 1000) return;
        setLatest(data);
        if (!localStorage.getItem(seenKey(data.season.id))) {
          localStorage.setItem(seenKey(data.season.id), '1');
          setOpen({});
        }
      })
      .catch(error => console.error('Error cargando la premiación:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!latest) return null;

  return (
    <>
      <div className="dark flex flex-col items-start gap-4 rounded-3xl border border-brand-amber/30 bg-ink-900 p-5 shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <span className="text-3xl" aria-hidden="true">
            🏆
          </span>
          <div>
            <p className="m-0 font-display text-xl font-semibold uppercase text-white">
              La temporada terminó
            </p>
            <p className="m-0 text-sm text-white/70">
              Mira quiénes ganaron en «{latest.season.name}».
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen({ launch: launchImmersive() })}
          className="btn-fire h-11 px-6 text-sm"
        >
          Ver premiación
        </button>
      </div>
      {open && (
        <Suspense fallback={<PageLoader />}>
          <PremiacionOverlay
            seasonId={latest.season.id}
            launch={open.launch}
            onClose={() => setOpen(null)}
          />
        </Suspense>
      )}
    </>
  );
};

export default PremiacionBanner;
