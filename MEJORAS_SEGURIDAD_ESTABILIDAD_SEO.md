# Mejoras de seguridad, estabilidad y SEO

Fecha: 2026-09-01 · Plan: `~/.claude/plans/partitioned-skipping-aho.md`

Resumen de los cambios aplicados y de las **acciones manuales pendientes** (tuyas).

---

## 🔴 Acciones manuales requeridas (hazlas antes o justo después de desplegar)

1. **Rotar la contraseña comprometida.**
   El seeder tenía hardcodeada una credencial real (email + contraseña) que sigue
   en el historial de git (commits `e882ffb`, `98fb155`, `74f514f` — `git show 74f514f:backend/src/seeders/DatabaseSeeder.ts`).
   Cambia esa contraseña en **todos** los sitios donde la hayas reutilizado.
   - Opcional, si quieres borrarla del historial: `git filter-repo --replace-text` o BFG,
     seguido de `git push --force` (coordina con cualquier colaborador; rehacer forks/clones).

2. **`JWT_SECRET` fuerte en producción.** El `.env` local actual tiene un secreto corto.
   Genera uno y ponlo en las variables de entorno de Azure (backend):

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

   Al rotarlo, **todas las sesiones activas se invalidan** (los usuarios vuelven a iniciar sesión).

3. **Variables de entorno del backend en Azure.** Ahora son obligatorias y el arranque
   falla si faltan: `MONGODB_URI`, `JWT_SECRET` (obligatorio; si mide <32 solo avisa, no bloquea), `CLOUDINARY_CLOUD_NAME`,
   `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Define también `CORS_ORIGIN` con el
   dominio real del frontend (coma-separado si hay varios). Opcional: `TOKEN_EXP` (def. `7d`).

4. **Semilla de Super Admin (si la necesitas).** Ya no se crea sola. Para crearla una vez:
   `SEED_ADMIN_ENABLED=true`, `SEED_ADMIN_EMAIL=...`, `SEED_ADMIN_PASSWORD=...` en el entorno.
   Luego puedes volver a poner `SEED_ADMIN_ENABLED=false`.

5. **Google Search Console.** Reenvía `https://jovenesmodelia.com/sitemap.xml`
   (ahora se regenera en cada build) y usa "Inspección de URL → Solicitar indexación"
   para `/` y `/register`.

6. **Caché de scrapers sociales.** Tras el primer deploy, pasa `/`, `/register` y `/login`
   por el [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) → "Scrape Again".

7. **`og-image.jpg`.** Sigue siendo el logo redimensionado. Si quieres una imagen de
   compartición con texto, edítala (1200×630) o ajusta `frontend/scripts/generate-og-image.js`.

8. **Follow-up de dependencias.** `react-router-dom` tiene un aviso de seguridad
   (open redirect / hydration) cuyo arreglo está en **React Router 7** (cambio mayor).
   Planifícalo aparte. `sharp` ya se actualizó a 0.35.

---

## ✅ Seguridad (backend)

| Cambio                                                                                                                | Archivo                                                     |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `helmet` + `compression` ahora **sí se aplican** (antes estaban instalados pero sin usar). HSTS, noSniff, frameguard. | `src/index.ts`                                              |
| `app.set('trust proxy', 1)` — `req.ip` y los rate-limiters fiables detrás de Azure/nginx                              | `src/index.ts`                                              |
| **Rate-limit en `/api/auth/login`** (10/IP + 5/usuario por 15 min) — antes no había                                   | `src/middleware/rateLimiter.ts`, `src/routes/authRoutes.ts` |
| `JWT_SECRET` sin fallback débil; algoritmo `HS256` fijado en firma **y** verificación                                 | `src/services/jwtService.ts`, `src/config/env.ts`           |
| Validación de entorno al arrancar (aborta con mensaje claro)                                                          | `src/config/env.ts` (nuevo)                                 |
| Credenciales hardcodeadas del seeder → variables `SEED_ADMIN_*` opt-in                                                | `src/seeders/DatabaseSeeder.ts`                             |
| `mongoose.set('debug')` solo en dev o con `DB_DEBUG=true` (antes: siempre)                                            | `src/config/database.ts`                                    |
| Verificación de _magic bytes_ en subida de imágenes (no fiarse del mimetype del cliente)                              | `src/middleware/upload.ts`                                  |
| Límite de body JSON 10 MB → 1 MB (los archivos van por multipart)                                                     | `src/index.ts`                                              |
| `console.*` que filtraban estado de auth → `logger`                                                                   | `auth.ts`, `authController.ts`, `cloudinary.ts`             |

## ✅ Seguridad (frontend / hosting)

- Cabeceras añadidas en `staticwebapp.config.json` **y** `nginx.conf`:
  `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`.
- CSP endurecida: `default-src 'self'`, `script-src` acotado (antes `https:` global);
  `frame-ancestors 'none'`. _(Se mantiene `'unsafe-eval'` en `script-src` por compatibilidad
  con el escáner QR; probar a quitarlo más adelante.)_
- `frontend/src/services/api.ts` y `App.tsx`: los `console.log` (incluido uno que imprimía
  los primeros 20 chars del token) ahora van detrás de `import.meta.env.DEV`.
- Eliminado `frontend/public/.htaccess` (Apache; el hosting es Azure SWA/nginx — era código muerto).

## ✅ Estabilidad

- **Suite de tests** (Jest + ts-jest): `jwtService`, `dateUtils`, `rateLimiter`, `errorHandler`
  (16 tests). CI del backend ahora corre `npm run test:ci`.
- Apagado controlado ante `SIGTERM`/`SIGINT` (cierra servidor HTTP → cierra Mongo) +
  handlers de `unhandledRejection` / `uncaughtException`.
- `connectDatabase` reintenta 5× con backoff antes de terminar el proceso.
- `/api/health` devuelve **503** si la BD no está lista (antes siempre 200).
- **Dockerfile del backend**: multi-stage, `USER node` (no root), `HEALTHCHECK`, `.dockerignore`
  (antes: single-stage, root, `COPY . .` metía `.git` y `.env`).
- `docker-compose.yml`: healthcheck + `depends_on: service_healthy` + volumen de logs.
- Node unificado a **20 LTS** (CI, Dockerfiles, `engines`). Antes: CI 22 / Docker 20.

## ✅ SEO

- **Metadatos por ruta** vía `src/seo/config.ts` + `<RouteSeo>` (react-helmet-async).
- **Prerender** de `/register` y `/login` en el build (`vite.config.ts` → `prerenderMeta`):
  cada una tiene su `<title>`/`description`/OG propios en el HTML estático → previews sociales
  correctas y mejor indexación. Sin navegador headless (rápido, sin flakiness en CI).
- **`sitemap.xml` se regenera** en cada build con `lastmod` actual (antes: fijo en 2024, 3 URLs).
- **`robots.txt`** actualizado (bloquea rutas privadas; quitado `/_next/` irrelevante).
- **Iconos PWA reales**: 192, 512, maskable-512, apple-touch-icon 180, favicon.svg/.ico.
  El `manifest.json` declaraba 192/512 apuntando a un PNG de 32 (fallaba Lighthouse).
  Regenerar: `cd frontend && npm run gen:icons`.
- `index.html`: quitado cruft (`keywords`, `revisit-after`, `language`), `preconnect` a
  Google Fonts, `<noscript>` con contenido, JSON-LD `Organization` con dirección de Bogotá,
  `theme-color` para modo oscuro.
- Redirección canónica de host: mover a la config del dominio/CDN (el `.htaccess` que lo
  hacía era inerte).

---

## Verificación rápida

```bash
# Backend
cd backend && npm run lint && npm test && npm run build

# Frontend (genera dist/register/index.html, dist/login/index.html, dist/sitemap.xml)
cd frontend && npm run lint && npm run build
grep '<title>' dist/register/index.html   # -> "Únete a Jóvenes Modelia..."
cat dist/sitemap.xml

# Docker
docker compose build && docker compose up   # backend -> healthy
```
