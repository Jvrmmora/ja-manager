import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../PageLoader';
import { seasonService } from '../../services/seasonService';
import type { ISeasonResultsData } from '../../types';
import { createCeremony } from '../../features/premiacion/engine/ceremony';
import type { PremiacionLaunch } from '../../features/premiacion/launch';
import '../../features/premiacion/premiacion.css';
import stage from '../../features/premiacion/assets/escenario.jpg';
import podium from '../../features/premiacion/assets/podio.jpg';
import winner from '../../features/premiacion/assets/ganador.jpg';
import film from '../../features/premiacion/assets/intro.mp4';
import music from '../../features/premiacion/assets/intro-pista.mp3';
import logo from '../../assets/logos/logo.png';

const ASSETS = { stage, podium, winner, film, music, logo };

// Recorte centrado en el rostro para fotos de Cloudinary
const photoUrl = (url?: string) =>
  url?.replace(
    '/image/upload/',
    '/image/upload/c_fill,g_face,w_640,h_640,f_auto,q_auto/'
  );

const toCeremonyData = ({ season, results }: ISeasonResultsData) => ({
  seasonName: season.name,
  totalDays: results.totalDays ?? 0,
  podium: results.podium.map(p => ({
    place: p.place,
    name: p.name,
    points: p.totalPoints,
    stats: p.stats,
    photo: photoUrl(p.profileImage),
  })),
  constancy: {
    bestStreakWeeks: results.constancy.bestStreakWeeks,
    winners: results.constancy.winners.map(w => ({
      name: w.name,
      attendanceCount: w.attendanceCount,
      stats: w.stats,
      photo: photoUrl(w.profileImage),
    })),
  },
});

interface PremiacionOverlayProps {
  seasonId: string;
  onClose: () => void;
  /** Resultado de launchImmersive() cuando se abre desde un botón */
  launch?: PremiacionLaunch | undefined;
}

/** Premiación de una temporada finalizada, a pantalla completa */
const PremiacionOverlay: React.FC<PremiacionOverlayProps> = ({
  seasonId,
  onClose,
  launch,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [data, setData] = useState<ISeasonResultsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    seasonService
      .getResults(seasonId)
      .then(result => !cancelled && setData(result))
      .catch(
        (e: Error) =>
          !cancelled && setError(e.message || 'No se pudo cargar la premiación')
      );
    return () => {
      cancelled = true;
    };
  }, [seasonId]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const empty = !!data && data.results.podium.length === 0;
  const ready = !!data && !empty;

  useEffect(() => {
    const root = rootRef.current;
    if (!ready || !data || !root) return;
    root.focus();
    const ceremony = createCeremony(
      root,
      toCeremonyData(data),
      ASSETS,
      () => onCloseRef.current(),
      launch
    );
    return () => ceremony.destroy();
  }, [ready, data, launch]);

  const message =
    error ||
    (empty ? 'Esta temporada no tiene participantes en el ranking.' : '');

  // El clic no debe llegar (vía portal) al fondo del modal que lo abrió
  return createPortal(
    <div onClick={e => e.stopPropagation()}>
      {ready ? (
        <div ref={rootRef} className="premiacion-root" tabIndex={-1} />
      ) : message ? (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-ink-950 p-6 text-center text-white">
          <p className="m-0 max-w-md text-lg">{message}</p>
          <button type="button" onClick={onClose} className="btn-fire h-11 px-6 text-sm">
            Cerrar
          </button>
        </div>
      ) : (
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          <PageLoader />
        </div>
      )}
    </div>,
    document.body
  );
};

export default PremiacionOverlay;
