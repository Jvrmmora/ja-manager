import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ROUTES, SITE_URL, DEFAULT_IMAGE } from './src/seo/config';

/**
 * Prerender ligero: genera un index.html por ruta pública con el <head> (title,
 * description, canonical, Open Graph, Twitter) ya resuelto. No usa navegador
 * headless — sólo reemplaza etiquetas en el HTML construido — así que es rápido
 * y no falla en CI. El cuerpo de la SPA se hidrata normalmente al cargar.
 *
 * Objetivo: que Google y los scrapers sociales (WhatsApp, Facebook, LinkedIn,
 * que no ejecutan JS) vean los metadatos correctos de /register y /login, no
 * los genéricos de la home.
 */
function prerenderMeta(): Plugin {
  return {
    name: 'prerender-meta',
    apply: 'build',
    closeBundle() {
      const outDir = join(process.cwd(), 'dist');
      let template: string;
      try {
        template = readFileSync(join(outDir, 'index.html'), 'utf8');
      } catch {
        this.warn('prerender-meta: no se encontró dist/index.html, se omite');
        return;
      }

      const esc = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

      for (const route of ROUTES) {
        if (!route.prerender || route.path === '/') continue;

        const canonical = `${SITE_URL}${route.path}`;
        const title = esc(route.title);
        const description = esc(route.description);
        const robots = route.noindex
          ? 'noindex, nofollow'
          : 'index, follow';

        const html = template
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
          .replace(
            /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/>/,
            `<meta name="description" content="${description}" />`
          )
          .replace(
            /<meta\s+name="robots"\s+content="[\s\S]*?"\s*\/>/,
            `<meta name="robots" content="${robots}" />`
          )
          .replace(
            /<link\s+rel="canonical"\s+href="[\s\S]*?"\s*\/>/,
            `<link rel="canonical" href="${canonical}" />`
          )
          .replace(
            /<meta\s+property="og:url"\s+content="[\s\S]*?"\s*\/>/,
            `<meta property="og:url" content="${canonical}" />`
          )
          .replace(
            /<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/>/,
            `<meta property="og:title" content="${title}" />`
          )
          .replace(
            /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/>/,
            `<meta property="og:description" content="${description}" />`
          )
          .replace(
            /<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/>/,
            `<meta name="twitter:title" content="${title}" />`
          )
          .replace(
            /<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/>/,
            `<meta name="twitter:description" content="${description}" />`
          )
          .replace(
            /<meta\s+property="og:image"\s+content="[\s\S]*?"\s*\/>/,
            `<meta property="og:image" content="${DEFAULT_IMAGE}" />`
          );

        const target = join(outDir, route.path.replace(/^\//, ''), 'index.html');
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, html);
        this.info(`prerender-meta: ${route.path} -> ${target}`);
      }

      // sitemap.xml siempre fresco a partir de las rutas indexables
      const today = new Date().toISOString().slice(0, 10);
      const indexable = ROUTES.filter(r => !r.noindex);
      const urls = indexable
        .map(r => {
          const priority = r.path === '/' ? '1.0' : '0.8';
          const changefreq = r.path === '/' ? 'weekly' : 'monthly';
          return `  <url>\n    <loc>${SITE_URL}${r.path === '/' ? '/' : r.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
        })
        .join('\n');
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
      writeFileSync(join(outDir, 'sitemap.xml'), sitemap);
      this.info('prerender-meta: sitemap.xml generado');
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), prerenderMeta()],
  clearScreen: false,
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'react-vendor': ['react', 'react-dom'],
          // Router separado (usado en todas las páginas)
          'react-router': ['react-router-dom'],
          // HTTP y utilidades
          utils: ['axios', 'luxon'],
          // Animaciones (framer-motion es pesado ~160kb)
          animations: ['framer-motion', 'canvas-confetti'],
          // QR y Scanner
          'qr-tools': ['qrcode.react', 'qr-scanner'],
          // HTML to Canvas
          canvas: ['html2canvas'],
          // Icons
          icons: ['@heroicons/react'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0', // Escuchar en todas las interfaces
    port: 3000,
    allowedHosts: ['localhost', '.ngrok.io', '.ngrok-free.app', '.ngrok.app'],
    proxy: {
      '/api': {
        target: 'http://localhost:4500', // Proxy al backend local
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(
              'Received Response from the Target:',
              proxyRes.statusCode,
              req.url
            );
          });
        },
      },
    },
  },
});
