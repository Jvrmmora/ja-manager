// Entry point para el bake de la landing en build (SSG).
//
// Se compila aparte con `vite build --ssr src/entry-server.tsx --outDir dist-ssr`
// (ver package.json) y el módulo resultante lo importa scripts/prerender-landing.mjs
// para renderizar <LandingPage> a HTML estático con el contenido real de
// /api/landing, en vez de dejar <div id="root"></div> vacío para crawlers y
// primer pintado. No forma parte del bundle que corre en el navegador.
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage, { type LandingData } from './pages/LandingPage';

// Stub mínimo de localStorage para este render en Node. authService y
// ThemeContext lo leen de forma síncrona en el primer render (p.ej. Navbar
// hace useState(() => authService.getUserInfo())), sin guardas — el resto de
// la app siempre corre en el navegador, así que no hace falta tocar ese
// código compartido solo por esto. En el servidor no hay sesión: devolver
// null/no-op es exactamente el comportamiento correcto (visitante anónimo).
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    },
    configurable: true,
  });
}

export function renderLandingPage(data: LandingData): string {
  return renderToStaticMarkup(
    <StaticRouter location="/">
      <ThemeProvider>
        <LandingPage initialData={data} />
      </ThemeProvider>
    </StaticRouter>
  );
}
