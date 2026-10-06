import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import StatusScreen, {
  statusPrimaryBtn,
  statusSecondaryBtn,
} from '../components/StatusScreen';

const NotFound: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();
  const homePath =
    authService.getUserInfo()?.role_name === 'Young role' ? '/dashboard' : '/admin';
  // Solo ofrecer "Volver" si se llegó navegando dentro de la app
  const canGoBack = window.history.state?.idx > 0;

  return (
    <StatusScreen
      code="404"
      eyebrow="Página no encontrada"
      title="Aquí no hay nada"
      description={
        <>
          <p className="m-0">
            Puede que el enlace esté mal escrito o que la página ya no exista.
          </p>
          <code className="mt-3 inline-block max-w-full truncate rounded-full border border-sand-200 bg-white px-3.5 py-1 font-mono text-[13px] text-cocoa-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70">
            {location.pathname}
          </code>
        </>
      }
      actions={
        <>
          {isAuthenticated ? (
            <button type="button" onClick={() => navigate(homePath)} className={statusPrimaryBtn}>
              Ir a mi panel
            </button>
          ) : (
            <button type="button" onClick={() => navigate('/')} className={statusPrimaryBtn}>
              Ir al inicio
            </button>
          )}
          {canGoBack ? (
            <button type="button" onClick={() => navigate(-1)} className={statusSecondaryBtn}>
              Volver atrás
            </button>
          ) : (
            !isAuthenticated && (
              <button type="button" onClick={() => navigate('/login')} className={statusSecondaryBtn}>
                Iniciar sesión
              </button>
            )
          )}
        </>
      }
      verse={{
        text: 'Gozaos conmigo, porque he encontrado mi oveja que se había perdido.',
        reference: 'Lucas 15:6',
      }}
    />
  );
};

export default NotFound;
