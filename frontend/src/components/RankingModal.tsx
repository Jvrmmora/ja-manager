import React from 'react';
import { motion } from 'framer-motion';
import FullscreenLeaderboard from './FullscreenLeaderboard';
import SeasonStatsBar from './SeasonStatsBar';
import LeaderboardSection from './LeaderboardSection';
import type { ILeaderboardEntry } from '../types';

interface RankingModalProps {
  leaderboard: ILeaderboardEntry[];
  seasonName?: string | undefined;
  onClose: () => void;
}

// Modal de ranking de la temporada: el mismo para el joven y para el admin.
const RankingModal: React.FC<RankingModalProps> = ({
  leaderboard,
  seasonName,
  onClose,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0C0609]/80 backdrop-blur-sm sm:p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
      className="dark relative h-[94vh] sm:h-auto sm:max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-t-[28px] sm:rounded-[32px] border border-white/10 bg-ink-950 text-white shadow-[0_60px_120px_-40px_rgba(0,0,0,0.8)]"
      onClick={e => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Ranking de la Temporada"
    >
      <div className="pointer-events-none absolute left-1/2 top-64 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(249,162,59,.22)_0%,rgba(20,11,16,0)_65%)]" />
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-ink-950/90 px-5 sm:px-8 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <span className="bg-gold hidden sm:flex h-11 w-11 items-center justify-center rounded-2xl text-ink-950">
            <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            </svg>
          </span>
          <span className="flex flex-col">
            <h2 className="m-0 font-display text-2xl sm:text-[28px] font-semibold uppercase leading-none">
              Ranking de la Temporada
            </h2>
            {seasonName && (
              <span className="mt-1 text-[13px] text-white/55">{seasonName}</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <FullscreenLeaderboard leaderboard={leaderboard} />
          <button
            aria-label="Cerrar ranking"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white hover:border-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber transition-colors"
          >
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative p-4 sm:p-8">
        <SeasonStatsBar activeParticipants={leaderboard.length} />
        <LeaderboardSection />
      </div>
    </motion.div>
  </div>
);

export default RankingModal;
