import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../brand-skin.css';
import BirthdayBoardFullscreen from '../components/BirthdayBoardFullscreen';
import { authService } from '../services/auth';
import { getCurrentMonthColombia } from '../utils/dateUtils';
import { parseGroupParam, parseMonthParam, parseSemesterParam } from '../utils/shareUrls';
import { useSharedViewSession } from '../hooks/useSharedViewSession';
import PageLoader from '../components/PageLoader';

// Vista de cumpleaños que se comparte por WhatsApp (requiere sesión).
// /cumpleanos?mes=10&grupo=1 o /cumpleanos?semestre=2&grupo=1 (el semestre
// manda si vienen los dos) — el joven ve exactamente ese período y grupo; el
// admin puede seguir navegando entre meses, semestres y grupos.
const BirthdaySharePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionReady = useSharedViewSession();
  const semester = parseSemesterParam(searchParams.get('semestre'));
  const month = parseMonthParam(searchParams.get('mes')) ?? getCurrentMonthColombia();
  const group = parseGroupParam(searchParams.get('grupo')) ?? 1;
  const period = semester ? { defaultSemester: semester } : { defaultMonth: month };
  const fixedPeriod = semester ? { fixedSemester: semester } : { fixedMonth: month };

  const isYoung = authService.getUserInfo()?.role_name === 'Young role';
  const homePath = isYoung ? '/dashboard' : '/admin';

  if (!sessionReady) return <PageLoader />;

  return (
    <div className="brand-skin">
      <BirthdayBoardFullscreen
        isOpen
        onClose={() => navigate(homePath)}
        defaultGroup={group}
        {...period}
        {...(isYoung ? { fixedGroup: group, ...fixedPeriod } : {})}
      />
    </div>
  );
};

export default BirthdaySharePage;
