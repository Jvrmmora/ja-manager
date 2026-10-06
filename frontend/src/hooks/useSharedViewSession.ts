import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest, removeAuthToken } from '../services/api';
import { buildLoginRedirect } from '../utils/loginUrl';

/**
 * Vistas compartidas por WhatsApp (/ranking, /cumpleanos): si el token guardado
 * ya no es válido, limpia la sesión y manda al login, que luego regresa a esta
 * misma URL. Devuelve true cuando la sesión está confirmada.
 */
export const useSharedViewSession = (): boolean => {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest('auth/profile', { method: 'GET' })
      .then(response => {
        if (!active) return;
        if (response.status === 401 || response.status === 403) {
          removeAuthToken();
          window.dispatchEvent(new Event('userInfoUpdated'));
          navigate(buildLoginRedirect(location.pathname + location.search), {
            replace: true,
          });
          return;
        }
        setReady(true);
      })
      .catch(() => {
        // Sin red: dejar que la vista muestre su propio error
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
    // Solo al montar: la verificación es por visita
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ready;
};
