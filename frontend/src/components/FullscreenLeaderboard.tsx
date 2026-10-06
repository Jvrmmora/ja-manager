import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ILeaderboardEntry } from '../types';
import LeaderboardShowcase from './LeaderboardShowcase';

interface FullscreenLeaderboardProps {
  leaderboard: ILeaderboardEntry[];
}

// Botón "Modo proyector": pone el navegador en pantalla completa y muestra
// el ranking con rotación automática (ver LeaderboardShowcase).
const FullscreenLeaderboard: React.FC<FullscreenLeaderboardProps> = ({
  leaderboard,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = useCallback(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
      setIsFullscreen(true);
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen();
    }
    setIsFullscreen(false);
  }, []);

  // Listener para cambios de fullscreen desde navegador
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!isFullscreen) {
    return (
      <button
        type="button"
        onClick={enterFullscreen}
        className="hidden h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:border-white/50 md:inline-flex"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
        Modo proyector
      </button>
    );
  }

  return createPortal(
    <div className="brand-skin">
      <div className="fixed inset-0 z-[9999]">
        <LeaderboardShowcase leaderboard={leaderboard} onClose={exitFullscreen} />
      </div>
    </div>,
    document.body
  );
};

export default FullscreenLeaderboard;
