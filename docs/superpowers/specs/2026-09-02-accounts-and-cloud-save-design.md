# Student Accounts + Cloud Save — Design Spec

Date: 2026-09-02
Status: Approved for implementation

## Problem

The planner currently persists each program's `Plan` (`Record<moduleCode, semester>`)
to `localStorage` only. A student loses their plan if they switch devices,
clear browser data, or just want a backup. There's no way to save work
without trusting the browser alone.

## Goals

1. Optional accounts (email + password) so a plan syncs across devices.
2. A local-only fallback (export/import as a `.json` file) for anyone who
   doesn't want to sign up — available to everyone, not just anonymous
   users, since it's a cheap universal backup mechanism.
3. Keep `localStorage` as the source of truth for anonymous users — signing
   in only adds a sync layer on top of the existing save path, it doesn't
   replace it.

## Repo layout

Monorepo, matching the existing `mytutorium-api` / `mytutorium-web` pattern
on this Coolify instance (one git repo, two Coolify apps pointed at
different `base_directory` values):

```
/                     # existing frontend (Coolify app: wim-master-planer)
  src/...
  Dockerfile
/server               # new backend (Coolify app: wim-planer-api)
  src/...
  Dockerfile
  migrations/
```

## Data model

Two tables, in a new Postgres database (`wim-planer-db`, provisioned on
the same Coolify server as the existing `mytutorium-db` instances):

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE saved_plans (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL,
  plan_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, program_id)
);
```

`plan_json` stores exactly the frontend's `Plan` type
(`Record<string, number>`) — no relational decomposition of module
selections. The app never needs to query "which students picked module X,"
so a JSON blob matching the client's own type keeps the sync logic
trivial (same shape on both sides, no translation layer).

Migrations: a single idempotent SQL file (`server/migrations/001_init.sql`,
`CREATE TABLE IF NOT EXISTS`) run once on API startup — no migration
framework, two tables don't need one.

## Backend

**Stack:** Node.js + TypeScript + Express, `pg` for Postgres (raw
parameterized queries, no ORM — same reasoning as the migration approach),
`argon2` for password hashing, `jsonwebtoken` for auth tokens,
`express-rate-limit` on the auth endpoints (the app is now public; login/
signup are the natural abuse target, and the limiter is a few lines).

**Auth:** JWT in an httpOnly, `Secure`, `SameSite=Lax` cookie, 30-day
expiry. No server-side session table — stateless verification, nothing to
clean up. No password-reset flow in v1 (per the earlier decision): a
locked-out user signs up again with a different email, or the owner resets
the row directly in Postgres.

**Endpoints:**
```
POST   /api/auth/signup   { email, password } -> 201, sets cookie, { email }
POST   /api/auth/login    { email, password } -> 200, sets cookie, { email }
POST   /api/auth/logout   -> 204, clears cookie
GET    /api/auth/me       -> 200 { email } | 401
GET    /api/plans/:programId  -> 200 { plan } | 404 (no saved plan yet)
PUT    /api/plans/:programId  { plan } -> 200 (upsert)
```
All `/api/plans/*` routes require a valid auth cookie (middleware, 401 if
missing/invalid). Signup rejects a duplicate email with 409. Login rejects
a wrong password/unknown email with 401 (generic message, don't leak which
one was wrong).

**CORS:** locked to the frontend's exact origin
(`https://wim-planer.sandouk.net`, from an env var `FRONTEND_ORIGIN`),
`credentials: true`.

**Env vars** (Coolify, `wim-planer-api` app): `DATABASE_URL`, `JWT_SECRET`
(random, generated at setup time, never committed), `FRONTEND_ORIGIN`.

## Frontend

**New files:**
- `src/lib/auth.ts` — `signup(email, password)`, `login(email, password)`,
  `logout()`, `getCurrentUser()`. All `fetch` calls use
  `credentials: "include"` and hit `import.meta.env.VITE_API_URL`.
- `src/lib/cloudSync.ts` — `fetchCloudPlan(programId)`,
  `saveCloudPlan(programId, plan)`.
- `src/components/AuthWidget.tsx` — login/signup form when logged out;
  "Signed in as `<email>` · Log out" when logged in. Rendered once, near
  the program picker header (visible from both the picker and the
  planner would be nicer, but v1 scope is the picker header only — the
  planner already reads auth state to decide whether to sync).
- `src/components/ExportImport.tsx` — "Download plan" button (serializes
  the current program's `Plan` to a `.json` file via a Blob + temporary
  `<a download>`) and "Import plan" (a file input, parses JSON, replaces
  the current plan state). Works with no account at all.

**Reconciliation on login** (the one real behavioral decision), as a pure,
directly testable function `reconcilePlans(local: Plan | null, cloud: Plan | null): Plan`:
- Cloud has a saved plan for this program → cloud wins, overwrites
  `localStorage`.
- Cloud has nothing yet but local does → push local up to the cloud
  (claims existing anonymous work, nothing lost).
- Neither exists → empty plan, nothing to do.

This runs once, right after login succeeds and before the planner's
regular auto-save effect resumes. After that, every plan change
auto-saves to `localStorage` (unchanged) and, if logged in, debounced-saves
to the cloud via `saveCloudPlan` — same trigger point as today's existing
`useEffect(() => savePlan(...), [plan])`, just with a second sink added
when authenticated.

## Deployment

Two new Coolify resources in the `Side-Projects` project, alongside the
existing `wim-master-planer` app:
- Postgres service `wim-planer-db`.
- App `wim-planer-api`, Dockerfile-based (Node build), `base_directory: /server`,
  domain `wim-planer-api.sandouk.net`.

The frontend app's build gets one new build-time env var,
`VITE_API_URL=https://wim-planer-api.sandouk.net`.

## Testing

- Backend: unit tests (vitest, matching the frontend's existing choice)
  for signup (success, duplicate email), login (success, wrong password,
  unknown email), the auth middleware (valid/missing/invalid token), and
  plan save/load (upsert semantics, 404 on no saved plan).
- Frontend: unit tests for `reconcilePlans` (all three branches above),
  `auth.ts`/`cloudSync.ts` against a mocked `fetch`, and an export→import
  round-trip test (serialize a plan, parse it back, same object).
- Manual: one browser verification pass after deployment — signup, save a
  plan, log out, log back in (plan persists), log in from a "fresh"
  browser context (cloud plan loads), export, clear storage, import
  (plan restored).

## Out of scope

- Password reset / email sending.
- OAuth/social login.
- Any UI styling pass (the whole app is currently unstyled by design-gap,
  tracked separately — the auth widget and export/import controls ship in
  the same unstyled state as everything else, not a regression).
- Rate limiting beyond the auth endpoints.
- Multi-program awareness beyond what already exists — `saved_plans` is
  keyed by `program_id` generically, so the other four WIM programs work
  automatically once they exist, no backend change needed.
