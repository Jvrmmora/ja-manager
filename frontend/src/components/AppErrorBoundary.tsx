import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import StatusScreen, { statusPrimaryBtn, statusSecondaryBtn } from './StatusScreen';

const RELOAD_KEY = 'chunkReloadAt';

/**
 * Tras un despliegue, los archivos JS de la versión anterior dejan de existir:
 * quien tenía la app abierta falla al cargar una página (lazy). Se detecta
 * para recargar y traer la versión nueva.
 */
const isChunkLoadError = (error: unknown): boolean => {
  const message =
    error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
    message
  );
};

interface BoundaryProps {
  children: React.ReactNode;
  /** Al cambiar (otra ruta) se limpia el error y se vuelve a intentar. */
  resetKey: string;
}

interface BoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (isChunkLoadError(error)) {
      // Recarga automática como máximo una vez por minuto (evita bucles)
      try {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        if (Date.now() - last > 60_000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
          return;
        }
      } catch {
        // Sin sessionStorage: se muestra la pantalla con el botón de recargar
      }
    }
    if (import.meta.env.DEV) {
      console.error('Error no controlado en la vista:', error, info.componentStack);
    }
  }

  componentDidUpdate(prevProps: BoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) return <ErrorFallback error={this.state.error} />;
    return this.props.children;
  }
}

const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => {
  const navigate = useNavigate();
  const outdated = isChunkLoadError(error);

  return (
    <StatusScreen
      code="¡Ups!"
      eyebrow={outdated ? 'Hay una versión nueva' : 'Algo salió mal'}
      title={outdated ? 'Actualiza la página' : 'Esta vista falló'}
      description={
        outdated
          ? 'Publicamos cambios mientras tenías la app abierta. Recarga para usar la versión más reciente.'
          : 'Ocurrió un error inesperado. Recarga la página y, si se repite, avísale a un líder.'
      }
      actions={
        <>
          <button type="button" onClick={() => window.location.reload()} className={statusPrimaryBtn}>
            Recargar página
          </button>
          <button type="button" onClick={() => navigate('/')} className={statusSecondaryBtn}>
            Ir al inicio
          </button>
        </>
      }
    />
  );
};

/** Captura errores de cualquier página para no dejar la pantalla en blanco. */
const AppErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
};

export default AppErrorBoundary;
