import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../brand-skin.css';
import BirthdayBoardFullscreen from '../components/BirthdayBoardFullscreen';
import { authService } from '../services/auth';
import { getCurrentMonthColombia } from '../utils/dateUtils';
import { parseGroupParam, parseMonthParam } from '../utils/shareUrls';
import { useSharedViewSession } from '../hooks/useSharedViewSession';
import PageLoader from '../components/PageLoader';

// Vista de cumpleaños del mes que se comparte por WhatsApp (requiere sesión).
// /cumpleanos?mes=10&grupo=1 — el joven ve exactamente ese mes y grupo; el
// admin puede seguir navegando entre meses y grupos.
const BirthdaySharePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionReady = useSharedViewSession();
  const month = parseMonthParam(searchParams.get('mes')) ?? getCurrentMonthColombia();
  const group = parseGroupParam(searchParams.get('grupo')) ?? 1;

  const isYoung = authService.getUserInfo()?.role_name === 'Young role';
  const homePath = isYoung ? '/dashboard' : '/admin';

  if (!sessionReady) return <PageLoader />;

  return (
    <div className="brand-skin">
      <BirthdayBoardFullscreen
        isOpen
        onClose={() => navigate(homePath)}
        defaultGroup={group}
        defaultMonth={month}
        {...(isYoung ? { fixedGroup: group, fixedMonth: month } : {})}
      />
    </div>
  );
};

export default BirthdaySharePage;
