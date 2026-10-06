import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../brand-skin.css';
import { SeasonProvider, useSeason } from '../context/SeasonContext';
import LeaderboardShowcase from '../components/LeaderboardShowcase';
import ShareLinkButton from '../components/ShareLinkButton';
import PageLoader from '../components/PageLoader';
import StatusScreen, {
  statusPrimaryBtn,
  statusSecondaryBtn,
} from '../components/StatusScreen';
import { pointsService } from '../services/pointsService';
import { seasonService } from '../services/seasonService';
import { authService } from '../services/auth';
import type { ILeaderboardEntry } from '../types';
import { buildRankingShareUrl, rankingShareMessage } from '../utils/shareUrls';
import { useSharedViewSession } from '../hooks/useSharedViewSession';

const REFRESH_MS = 60000;

// Vista completa del ranking que se comparte por WhatsApp (requiere sesión).
const RankingShareContent: React.FC = () => {
  const navigate = useNavigate();
  const sessionReady = useSharedViewSession();
  const { activeSeason, setActiveSeason } = useSeason();
  const [leaderboard, setLeaderboard] = useState<ILeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const user = authService.getUserInfo();
  const isYoung = user?.role_name === 'Young role';
  const homePath = isYoung ? '/dashboard' : '/admin';

  const loadLeaderboard = useCallback(async () => {
    try {
      const data = await pointsService.getLeaderboard({});
      setLeaderboard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el ranking');
    }
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    seasonService
      .getActive()
      .then(season => setActiveSeason(season))
      .catch(() => setActiveSeason(null));
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, REFRESH_MS);
    return () => clearInterval(interval);
  }, [sessionReady, loadLeaderboard, setActiveSeason]);

  const goHome = useCallback(() => navigate(homePath), [navigate, homePath]);

  if (!leaderboard) {
    if (!error) return <PageLoader />;
    return (
      <StatusScreen
        eyebrow="Ranking de la temporada"
        title="No pudimos cargar el ranking"
        description={error}
        actions={
          <>
            <button type="button" onClick={loadLeaderboard} className={statusPrimaryBtn}>
              Reintentar
            </button>
            <button type="button" onClick={goHome} className={statusSecondaryBtn}>
              Ir a mi panel
            </button>
          </>
        }
      />
    );
  }

  // Resaltar al joven (o a quien esté en el ranking) y mostrar su puesto
  const highlightUserId =
    user?.id && (isYoung || leaderboard.some(e => e.youngId === user.id))
      ? (user.id as string)
      : undefined;
  const shareUrl = buildRankingShareUrl();

  return (
    <div className="fixed inset-0">
      <LeaderboardShowcase
        leaderboard={leaderboard}
        onClose={goHome}
        closeLabel="Ir a mi panel"
        highlightUserId={highlightUserId}
        celebrate
        actions={
          <ShareLinkButton
            url={shareUrl}
            message={rankingShareMessage(shareUrl, activeSeason?.name)}
            title="Ranking de la temporada — Jóvenes Modelia"
          />
        }
      />
    </div>
  );
};

const RankingSharePage: React.FC = () => (
  <SeasonProvider>
    <div className="brand-skin">
      <RankingShareContent />
    </div>
  </SeasonProvider>
);

export default RankingSharePage;
