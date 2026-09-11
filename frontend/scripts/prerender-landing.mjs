// Hornea el contenido real de la landing ("/") en dist/index.html después del
// build, usando el bundle SSR generado por `vite build --ssr src/entry-server.tsx`.
//
// Es "best effort" a propósito: si /api/landing no responde (backend F1 frío,
// red caída, etc.) o el bundle SSR no existe, se registra un aviso y SE OMITE
// el bake — nunca se rompe el build. dist/index.html se queda como hoy (CSR
// puro), que es exactamente el comportamiento actual sin este script.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distIndexPath = join(root, 'dist', 'index.html');
const ssrEntryPath = join(root, 'dist-ssr', 'entry-server.js');

// Mismo default que frontend/.env.production — VITE_API_URL no se exporta a
// process.env solo por estar en un .env de Vite, así que si el build corre
// con esa variable seteada en el entorno (CI) la respetamos; si no, caemos al
// backend real.
const API_URL =
  process.env.VITE_API_URL ||
  'https://ja-backend-d7ezd3frhscmd6ck.brazilsouth-01.azurewebsites.net/api';
const FETCH_TIMEOUT_MS = 25_000; // el backend F1 puede tardar en despertar

async function fetchLandingData() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/landing`, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const body = await res.json();
    if (!body?.success || !body?.data) {
      throw new Error('Respuesta sin success/data');
    }
    return body.data;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  if (!existsSync(distIndexPath)) {
    console.warn('[prerender-landing] dist/index.html no existe, se omite.');
    return;
  }
  if (!existsSync(ssrEntryPath)) {
    console.warn(
      '[prerender-landing] dist-ssr/entry-server.js no existe (¿faltó el paso ' +
        '"vite build --ssr"?), se omite el bake de contenido.'
    );
    return;
  }

  let data;
  try {
    data = await fetchLandingData();
  } catch (err) {
    console.warn(
      `[prerender-landing] No se pudo obtener /api/landing (${err.message}). ` +
        'Se omite el bake — la landing sigue funcionando en modo CSR normal.'
    );
    return;
  }

  let renderLandingPage;
  try {
    ({ renderLandingPage } = await import(pathToFileURL(ssrEntryPath).href));
  } catch (err) {
    console.warn(
      `[prerender-landing] No se pudo cargar el bundle SSR (${err.message}). Se omite.`
    );
    return;
  }

  let bodyHtml;
  try {
    bodyHtml = renderLandingPage(data);
  } catch (err) {
    console.warn(
      `[prerender-landing] Error renderizando LandingPage en el servidor (${err.message}). Se omite.`
    );
    return;
  }

  const html = readFileSync(distIndexPath, 'utf8');
  const rootDivMarker = '<div id="root"></div>';

  if (!html.includes(rootDivMarker)) {
    console.warn(
      '[prerender-landing] No se encontró <div id="root"></div> en dist/index.html — ' +
        '¿cambió la plantilla? Se omite el bake para no dejar el HTML inconsistente.'
    );
    return;
  }

  // Escapamos "<" para que un dato con "</script>" (p.ej. texto pegado desde
  // Word en el CMS) no rompa el <script> — técnica estándar de embebido JSON.
  const serialized = JSON.stringify(data).replace(/</g, '\\u003c');
  const dataScript = `<script>window.__LANDING_DATA__ = ${serialized};</script>`;

  const patched = html.replace(
    rootDivMarker,
    `<div id="root">${bodyHtml}</div>\n    ${dataScript}`
  );

  writeFileSync(distIndexPath, patched);
  console.log(
    '[prerender-landing] Contenido de la landing horneado en dist/index.html.'
  );
}

main().catch(err => {
  console.warn(
    `[prerender-landing] Fallo inesperado (${err.message}). Se omite, el build continúa.`
  );
});
