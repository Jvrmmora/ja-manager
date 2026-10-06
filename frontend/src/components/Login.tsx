import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import ThemeToggle from './ThemeToggle';
import DynamicCredentialInput from './DynamicCredentialInput';
import { useNavigate } from 'react-router-dom';
import { safeReturnUrl } from '../utils/loginUrl';

// Importar la imagen
import logo from '../assets/logos/logo.png';

interface LoginProps {
  onLoginSuccess?: () => void;
  showToast?: (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info'
  ) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();

  // Leer query params para pre-rellenar placa desde QR
  const urlParams = new URLSearchParams(window.location.search);
  const placaFromQR = urlParams.get('placa') || '';
  // Enlaces compartidos (ranking, cumpleaños): volver ahí tras iniciar sesión
  const returnUrl = safeReturnUrl(urlParams.get('returnUrl'));

  const [formData, setFormData] = useState({
    username: placaFromQR,
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCredentialValid, setIsCredentialValid] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError(''); // Limpiar error al escribir
  };

  const handleCredentialChange = (
    value: string,
    meta: { mode: 'email' | 'placa'; isValid: boolean }
  ) => {
    setFormData(prev => ({ ...prev, username: value }));
    setIsCredentialValid(meta.isValid);
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login(formData);

      if (response.success) {
        // Limpiar query params de la URL (ej: ?placa=XYZ) después de login exitoso
        if (window.location.search) {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }

        // Llamar callback de éxito
        if (onLoginSuccess) {
          onLoginSuccess();
        }
        if (returnUrl) {
          navigate(returnUrl, { replace: true });
        }
      }
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const eyeOff = (
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
  );
  const eyeOn = (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  );

  const verse = (compact: boolean) => (
    <figure
      className={`m-0 flex w-full flex-col items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.05] text-center ${
        compact ? 'px-5 py-5' : 'px-8 py-7'
      }`}
    >
      <span className="text-fire -mb-6 font-display text-6xl leading-none" aria-hidden="true">
        “
      </span>
      <blockquote
        className={`m-0 italic leading-relaxed text-white/90 ${compact ? 'text-sm' : 'text-base'}`}
      >
        Esfuérzate y sé valiente. No temas ni desmayes, porque el Señor tu
        Dios estará contigo dondequiera que vayas.
      </blockquote>
      <figcaption className="font-display text-[13px] uppercase tracking-[0.16em] text-brand-amber">
        Josué 1:9
      </figcaption>
    </figure>
  );

  return (
    <div className="min-h-screen flex flex-col bg-cream dark:bg-ink-950">
      <div className="bg-white dark:bg-ink-950 border-b border-sand-200 dark:border-white/10 z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 group"
            aria-label="Volver al inicio"
          >
            <img
              src={logo}
              alt="JA Modelia"
              className="h-9 w-9 object-contain transition-transform group-hover:scale-110"
            />
            <span className="font-display text-lg font-semibold tracking-wide text-cocoa-900 dark:text-white group-hover:text-brand-deep dark:group-hover:text-brand-amber transition-colors">
              Jóvenes Modelia Bogotá
            </span>
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Panel de bienvenida (móvil: franja superior) */}
        <aside className="relative overflow-hidden bg-ink-950 lg:w-[44%] flex items-center justify-center px-6 pt-10 pb-14 lg:p-16">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.34)_0%,rgba(138,28,69,.18)_40%,rgba(20,11,16,0)_68%)] motion-safe:animate-ember" />
          <div className="relative flex w-full max-w-md flex-col items-center gap-5 lg:gap-6 text-center">
            <h1 className="m-0 flex flex-col items-center gap-1 font-display font-bold uppercase">
              <span className="text-[22px] lg:text-[34px] font-medium tracking-wide text-white/85">
                Bienvenido a
              </span>
              <span className="text-fire text-[52px] lg:text-[76px] leading-[0.95]">
                JA Manager
              </span>
            </h1>
            <p className="m-0 text-[15px] lg:text-[17px] leading-relaxed text-white/75">
              Bienvenido a la plataforma que une a los jóvenes adventistas.
              Fortalece tu identidad, participa y comparte con tu familia
              juvenil.
            </p>
            <div className="hidden lg:block w-full pt-2">{verse(false)}</div>
          </div>
        </aside>

        {/* Formulario */}
        <div className="flex-1 flex items-start lg:items-center justify-center px-4 sm:px-6 lg:px-12 pb-10 lg:py-12">
          <div className="-mt-6 lg:mt-0 w-full max-w-md relative">
            <form
              className="flex flex-col gap-5 rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_20px_40px_-24px_rgba(78,15,58,0.35)] sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none dark:border-white/10 dark:bg-ink-900 lg:dark:bg-transparent"
              onSubmit={handleSubmit}
            >
              <div className="flex flex-col gap-1.5 pb-1">
                <h2 className="m-0 font-display text-[32px] lg:text-[44px] font-semibold uppercase leading-none text-cocoa-900 dark:text-white">
                  Iniciar Sesión
                </h2>
                <p className="m-0 text-sm lg:text-base text-cocoa-500 dark:text-white/65">
                  Ingresa tus credenciales para acceder al sistema
                </p>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                  {error}
                </div>
              )}

              <DynamicCredentialInput
                value={formData.username}
                onChange={handleCredentialChange}
                defaultMode="auto"
              />

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-cocoa-700 dark:text-white/85 mb-2"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="field-brand h-[52px] pr-14"
                    placeholder="Ingresa tu contraseña"
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-xl text-cocoa-400 hover:text-cocoa-700 dark:text-white/50 dark:hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {showPassword ? eyeOff : eyeOn}
                    </svg>
                  </button>
                </div>
              </div>

              <label
                htmlFor="remember-me"
                className="flex items-center gap-2.5 text-[15px] text-cocoa-600 dark:text-white/75"
              >
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-[18px] w-[18px] rounded accent-brand-ember"
                />
                Recordarme
              </label>

              <button
                type="submit"
                disabled={loading || !isCredentialValid}
                className="btn-fire h-14 w-full text-base disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/register')}
                className="self-center text-sm font-semibold text-brand-deep hover:text-brand-wine dark:text-brand-amber transition-colors"
              >
                ¿No tienes cuenta? Regístrate aquí
              </button>
            </form>

            <div className="lg:hidden mt-6 rounded-[22px] bg-ink-950 p-1">{verse(true)}</div>

            <p className="mt-6 text-center text-xs text-cocoa-500 dark:text-white/45">
              Sistema de Gestión de Jóvenes © {new Date().getFullYear()} by
              Jamomodev
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
