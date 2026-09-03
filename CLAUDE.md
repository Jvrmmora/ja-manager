# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**JA Manager** — a youth-group management platform for a church (Jóvenes Modelia Bogotá). Monorepo: `backend/` (Express + TypeScript REST API on MongoDB) and `frontend/` (React 18 + Vite SPA). Beyond the CRUD of "jóvenes" it also runs QR attendance, a points/streak gamification system tied to seasons, a public landing page with an admin CMS, birthday claims, Excel import/export, and a registration-request approval flow.

The codebase is **Spanish-language**: comments, log messages, commit messages, and many identifiers are in Spanish. Match that.

## Commands

Run from the repo root unless noted. There is **no npm workspace setup** — root scripts `cd` into `backend/`/`frontend/`, and each package has its own `node_modules` that must be installed separately.

```bash
npm run dev            # backend + frontend concurrently
npm run dev:backend    # nodemon src/index.ts        (port 4500)
npm run dev:frontend   # vite                        (port 3000, proxies /api -> localhost:4500)
npm run build          # build:backend then build:frontend
npm run lint           # eslint backend + frontend
npm run lint:fix       # eslint --fix both
npm run validate       # .husky/validate-build.sh  — full lint + build + docker build, both packages
npm run validate:quick # .husky/validate-quick.sh — lint only, both packages
```

Backend (`cd backend`): `npm run dev` · `npm run build` (clean → `tsc` → copy `src/docs/oas3.yaml` to `dist/docs/`) · `npm start` (runs `dist/index.js`) · `npm run lint` (`eslint src/**/*.ts`) · `npm test` / `npm run test:ci`.

Frontend (`cd frontend`): `npm run dev` · `npm run build` (`tsc -b && vite build`) · `npm run build:azure` (prod build pointed at the Azure backend) · `npm run preview` · `npm run lint` (`eslint .`, flat config `eslint.config.js`) · `npm run gen:icons` (regenera favicons/PWA icons desde `src/assets/logos/logo.png`).

### Tests

Backend uses **Jest + ts-jest** (`backend/jest.config.js`). Test files live next to source as `*.test.ts`; `src/__tests__/setupEnv.ts` seeds env vars so `config/env.ts` doesn't abort. Run a single file with `npx jest src/services/jwtService.test.ts`. Current suites: `jwtService`, `dateUtils`, `rateLimiter` (loginLimiter), `errorHandler`. CI runs `npm run test:ci` on the backend. The frontend has no test suite yet.

Git hooks are still the broader safety net:

- **pre-commit**: `validate-quick.sh` (lint both) + `lint-staged`.
- **pre-push**: `validate-build.sh` — lint + type-compile both packages + `docker compose build`.

## Environment / ports

Ports are inconsistent across contexts — check which one applies:

| Context                        | Backend     | Frontend                   |
| ------------------------------ | ----------- | -------------------------- |
| Local dev (`.env` `PORT=4500`) | 4500        | 3000 (Vite proxies `/api`) |
| Code default if `PORT` unset   | 5000        | —                          |
| Docker Compose                 | `5001:5000` | `80:80`                    |

Backend env (see `backend/.env.example`): validated at boot by **`src/config/env.ts`** — the process exits with a clear message if `MONGODB_URI`, `JWT_SECRET` (≥32 chars), or `CLOUDINARY_*` are missing/weak. Optional: `TOKEN_ALGORITHM` (HS256), `TOKEN_EXP` (default `7d`), `CORS_ORIGIN` (comma-separated; required in prod), `DB_DEBUG`, `LOG_LEVEL`, `SEED_ADMIN_ENABLED`/`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` (opt-in Super Admin seed — never hardcode). Frontend env: `VITE_API_URL` (must include `/api`), `VITE_GA_MEASUREMENT_ID`.

`docker-compose.yml` has **no mongo service** — it expects an external `MONGODB_URI`. Timezone is pinned to `America/Bogota` in both containers. Backend image is multi-stage + non-root + `HEALTHCHECK /api/health`.

Node version is pinned to **20 LTS** across CI, Dockerfiles and `engines`.

## Backend architecture

### Boot sequence (`src/index.ts`)

Routes are **not registered until MongoDB is connected**. `initializeApp()` does: `connectDatabase()` → assert `readyState === 1` → `DatabaseSeeder.runAllSeeders()` → `startBirthdayScheduler()` (node-cron) → `setupRoutes()` → `app.listen()`. If the DB fails, the process exits. Every route group is additionally guarded at request time by `ensureDatabaseConnection`.

`app.set('trust proxy', 1)` (behind Azure/nginx). Global middleware order: `helmet` (HSTS/noSniff/frameguard, CSP off — JSON API) → `compression` → CORS (from `CORS_ORIGIN`) → `timeoutHandler(30s)` → HTTP logging → `express.json({limit:'1mb'})` → `contentTypeValidator` → `jsonErrorHandler`. Error tail: `errorLoggingMiddleware` → `notFoundHandler` → `globalErrorHandler`. `SIGTERM`/`SIGINT` trigger graceful shutdown (close HTTP server → close Mongo); `connectDatabase` retries 5× with backoff before the process exits.

### Auth & authorization (`src/middleware/auth.ts`)

JWT bearer tokens (`Authorization: Bearer <token>`, HS256 pinned on sign+verify, default 7-day expiry via `TOKEN_EXP`). The secret comes from `env.jwtSecret` — no fallback. `authenticateToken` verifies the token, **loads the `Role` document from the DB**, and attaches `req.user` + `req.userRole`. `POST /api/auth/login` is wrapped in `loginLimiter` (`middleware/rateLimiter.ts`): 10/IP + 5/username per 15 min.

**Rate-limiting is in-process** (`Map`s in `rateLimiter.ts`): it resets on restart and does not coordinate across instances. Fine for a single instance; move to a Mongo TTL collection if the backend is scaled out.

`SCOPES` in `middleware/auth.ts` is the **single source of truth** for permissions. Protect a route with:

```ts
router.get(
  '/',
  ...authenticateAndAuthorize('young:read'),
  YoungController.getAllYoung
);
```

`requireScope` checks the string against `req.userRole.scopes`. On every boot, `DatabaseSeeder` **re-grants all of `SCOPES` to the "Super Admin" role** — so adding a key to `SCOPES` automatically gives Super Admin access, but any other role needs its `scopes` array updated explicitly.

Seeded roles: **"Super Admin"** (all scopes) and **"Young role"** (`young:read`, `young:update`, `password:reset`). The seed Super Admin _user_ is only created when `SEED_ADMIN_ENABLED=true` **and** `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` are set (no hardcoded credentials).

### The `Young` model is both the person and the account

`models/Young.ts` is the central entity. One document is simultaneously a youth record (fullName, ageRange, phone, birthday, profileImage, group 1–5, skills) **and** an auth principal (`password`, `role_id`, `role_name`, `placa`). Notes:

- `toJSON` transform maps `_id` → `id` and strips `password`/`__v`. API responses use `id`, not `_id`.
- Password hashed by a `pre('save')` hook (bcrypt, 12 rounds) — never hash manually.
- **Soft delete** via `deletedAt`; spam flagging via `isSpam`. Queries must filter these out where relevant.
- `placa` (nickname/ID badge) format `@MOD[A-Z]{2,4}\d{3}` (e.g. `@MODJAVI001`), auto-generated on save only for Super Admin.
- Referral system: `referredBy` → another `Young._id`.

### Timezone: always use `dateUtils`

The whole app operates in **America/Bogota**. `src/utils/dateUtils.ts` provides Colombia-tz helpers (`getCurrentDateTimeColombia`, `getStartOfDayColombia`, `getStartOfWeekColombia`, `isSaturdayColombia`, `isWithinBirthdayClaimWindow`, …). Use these for all business logic (attendance windows, birthday checks, weekly leaderboard boundaries) — do not use raw `new Date()` for date math.

### Gamification flow

`Season` (exactly one `status: 'ACTIVE'` at a time) → `PointsTransaction` (typed, always bound to a season; `pointsService` singleton falls back to the active season) → aggregated into leaderboards. `Streak` is updated via `streakService.updateStreakOnAttendance`. Attendance: an admin generates a daily `QRCode` (`POST /api/qr/generate`, with optional decaying speed bonus), a young user scans it (`POST /api/attendance/scan`), and `attendanceService.registerAttendanceCore` records attendance + awards points + bumps the streak in one path.

### Other subsystems

- **Landing CMS**: `/api/landing` (public GET, admin write). Models: `LandingContent`, `LandingMedia`, `LandingMeetings`, plus `LandingVisitMetric` / `LandingVisitSummary` for visit analytics. Edited from the `/admin/landing` SPA route.
- **Email**: `services/emailService.ts` with pluggable providers in `services/emailProviders/` (Azure Communication Email).
- **Images**: Cloudinary, uploaded via multer memory storage (`middleware/upload.ts`, `landingUpload.ts`).
- **Import/export**: `xlsx`-based, `/api/import` (`/template`, `/import`, `/export`).
- **API docs**: OpenAPI served at `/api/docs` from `src/docs/oas3.yaml` (dev) or `dist/docs/oas3.yaml` (prod). Health check at `/api/health`.

### Response shape convention

Success: `{ success: true, data, message }`. Error: `{ success: false, error, message }`. The frontend unwraps `result.data`.

### Lint

`backend/.eslintrc.json` is deliberately lenient — `indent`/`quotes`/`semi` off, unused vars are warnings, `no-undef` off. Prettier owns formatting for json/md/yml only.

## Frontend architecture

React 18 + Vite 6 + React Router 6 + Tailwind 3. No component library (Heroicons for icons). TipTap for the landing-CMS rich text editor. `framer-motion` + `canvas-confetti` for gamification animations.

- **Auth state lives in `App.tsx` + `localStorage`**, not a context. Keys: `authToken`, `userRole`, `userInfo`. `App.tsx` listens for `storage` events and a custom `userInfoUpdated` event to re-read the role. The only React contexts are `ThemeContext` and `SeasonContext`.
- **Routing** keys off `userInfo.role_name`: `'Young role'` → `/dashboard`, anything else → `/admin`. `/admin` and `/admin/landing` and `/dashboard` are wrapped in `<ProtectedRoute>`. `/`, `/login`, `/register`, `/attendance/scan`, `/birthday-claim` are public.
- **All pages are `lazy()`-loaded**; the `<Suspense>` fallback and every `if (loading)` branch must render `<PageLoader />` (from `components/PageLoader.tsx`).
- **Two API layers**: `services/api.ts` (low-level `apiRequest` / `apiUpload` fetch wrappers that inject the bearer token) and per-domain service files (`auth.ts`, `pointsService.ts`, `seasonService.ts`, `contactService.ts`) plus many exported helpers in `api.ts` itself. `VITE_API_URL` already contains `/api`; `buildApiUrl` just appends the endpoint. Debug logging is gated behind `import.meta.env.DEV` and never prints the token.
- **Vite manual chunks** are configured in `vite.config.ts` (react-vendor, react-router, animations, qr-tools, …) — keep heavy deps grouped there.
- **SEO**: `src/seo/config.ts` is the single source of truth for per-route title/description/`noindex`. `<RouteSeo>` (mounted in `App.tsx`) applies it at runtime via `react-helmet-async`; the `prerenderMeta` Vite plugin writes `dist/<route>/index.html` with the resolved `<head>` for the `prerender: true` routes (`/register`, `/login`) and regenerates `dist/sitemap.xml` on every build. `staticwebapp.config.json` / `nginx.conf` route `/register` and `/login` to their prerendered files.

### UI standard — public / auth top bars (from `.github/copilot-instructions.md`)

Every public and auth view must match the landing page's width and margins:

```tsx
<div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-3">
    {/* left / right content */}
  </div>
</div>
```

Inner wrapper always `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`. Logo (from `assets/logos/`) + title "Jóvenes Modelia Bogotá" as a button that navigates to `/`. `ThemeToggle` on the right. Dark mode is class-based Tailwind (`dark:` variants) driven by `ThemeContext`.

## Deployment

- **Backend** → Azure Web App `ja-backend` via `.github/workflows/main_ja-backend.yml` on push to `main` (lint → build → docker build → deploy).
- **Frontend** → Azure Static Web Apps via `.github/workflows/azure-static-web-apps-yellow-river-04315080f.yml` on push to `main` and on PRs (lint → `vite build` (runs the prerender plugin) → deploy `frontend/dist`). Security headers + CSP live in `frontend/public/staticwebapp.config.json` (and mirrored in `nginx.conf` for the Docker path).
- `render.yaml` and the Docker Compose stack also exist as alternative / local deployment paths.
- The default branch is `main`; `dev` and `landing-page` branches also exist.

## Ignore

`graphify-out/` is generated output from a code-graph tool — not source.
