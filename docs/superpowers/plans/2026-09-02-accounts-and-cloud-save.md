# Student Accounts + Cloud Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional email/password accounts with cloud-synced plans (via
a new Node/TypeScript/Postgres backend), plus a no-account export/import
fallback — without disturbing the existing `localStorage`-only flow for
anonymous users.

**Architecture:** A new `/server` Express API (JWT-cookie auth, two
Postgres tables) deployed as a second Coolify app in the same monorepo.
The frontend gains a thin sync layer (`auth.ts`, `cloudSync.ts`, a
`reconcilePlans` pure function, an `AuthContext`) that only activates once
a user is logged in; `localStorage` remains the source of truth otherwise.

**Tech Stack:** Backend: Node.js, TypeScript, Express, `pg`, Node's
built-in `crypto.scrypt` (no native password-hashing dependency —
avoids Alpine/musl native-binding build risk), `jsonwebtoken`,
`express-rate-limit`, vitest + supertest. Frontend: existing
Vite/React/TS/vitest stack, no new frontend dependencies.

**Spec:** `docs/superpowers/specs/2026-09-02-accounts-and-cloud-save-design.md`

## Global Constraints

- No ORM and no migration framework — raw parameterized `pg` queries via
  a thin `repo.ts`, one idempotent SQL migration file run at startup.
- Password hashing via Node's built-in `crypto.scrypt` (salted, constant-time
  compare) — no `argon2`/`bcrypt` native dependency.
- Auth cookie: httpOnly, `Secure`, `SameSite=Lax`, 30-day expiry.
- CORS locked to the exact frontend origin via an env var, `credentials: true`.
- No password-reset flow, no OAuth/social login — out of scope per spec.
- Automated backend tests never require a real running Postgres — the
  repo layer takes its `pg.Pool` as an explicit parameter so route tests
  can mock the repo module; the real database is only exercised by manual
  verification after deployment (Task 11).
- The existing anonymous `localStorage` flow must keep working unchanged
  when no one is logged in — every frontend task in this plan is additive.

---

### Task 1: Backend scaffold

**Files:**
- Create: `server/package.json`, `server/tsconfig.json`, `server/vitest.config.ts`, `server/Dockerfile`
- Create: `server/src/app.ts`, `server/src/server.ts`
- Test: `server/src/app.test.ts`

**Interfaces:**
- Produces: `createApp(): express.Express` (default export or named export
  from `server/src/app.ts`) — a factory so tests can build a fresh app
  instance without binding a port. `GET /health` returns `200 { status: "ok" }`.

- [ ] **Step 1: Initialize the backend package**

`server/package.json`:
```json
{
  "name": "wim-planer-api",
  "version": "0.0.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "cookie-parser": "^1.4.6",
    "pg": "^8.12.0",
    "jsonwebtoken": "^9.0.2",
    "express-rate-limit": "^7.4.0"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "tsx": "^4.16.2",
    "vitest": "^2.0.5",
    "supertest": "^7.0.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/cookie-parser": "^1.4.7",
    "@types/pg": "^8.11.6",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/supertest": "^6.0.2",
    "@types/node": "^22.5.0"
  }
}
```

`server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

`server/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
});
```

Run `npm install` inside `server/`.

- [ ] **Step 2: Write the app factory and health check**

`server/src/app.ts`:
```ts
import express from "express";

export function createApp(): express.Express {
  const app = express();
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  return app;
}
```

`server/src/server.ts`:
```ts
import { createApp } from "./app";

const PORT = Number(process.env.PORT) || 3000;
const app = createApp();
app.listen(PORT, () => {
  console.log(`wim-planer-api listening on :${PORT}`);
});
```

- [ ] **Step 3: Write the failing test, then verify it passes**

`server/src/app.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app";

describe("GET /health", () => {
  it("returns 200 ok", async () => {
    const res = await request(createApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
```

Run: `cd server && npm run test` — expect PASS.

- [ ] **Step 4: Dockerfile**

`server/Dockerfile`:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

Verify: `cd server && npm run build` produces `dist/server.js` with no
TypeScript errors. If Docker is available, `docker build -t wim-planer-api-test server` should succeed — do this if the tool is available in your environment, otherwise skip (Task 11 verifies the real deploy).

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/package-lock.json server/tsconfig.json server/vitest.config.ts server/Dockerfile server/src/app.ts server/src/server.ts server/src/app.test.ts
git commit -m "Scaffold the wim-planer-api backend"
```

---

### Task 2: Password hashing and JWT utilities

**Files:**
- Create: `server/src/auth/hash.ts`, `server/src/auth/hash.test.ts`
- Create: `server/src/auth/jwt.ts`, `server/src/auth/jwt.test.ts`

**Interfaces:**
- Produces: `hashPassword(password: string): Promise<string>`,
  `verifyPassword(password: string, stored: string): Promise<boolean>` from
  `hash.ts`; `signToken(payload: {userId: string}, secret: string): string`,
  `verifyToken(token: string, secret: string): {userId: string} | null`
  from `jwt.ts`. Consumed by Task 4's auth routes and middleware.

- [ ] **Step 1: Write the failing tests**

`server/src/auth/hash.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./hash";

describe("password hashing", () => {
  it("produces different hashes for the same password (random salt)", async () => {
    const a = await hashPassword("correct horse battery staple");
    const b = await hashPassword("correct horse battery staple");
    expect(a).not.toBe(b);
  });

  it("verifies a correct password against its own hash", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("wrong password", stored)).toBe(false);
  });
});
```

`server/src/auth/jwt.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./jwt";

describe("jwt", () => {
  it("round-trips a payload", () => {
    const token = signToken({ userId: "abc-123" }, "test-secret");
    expect(verifyToken(token, "test-secret")).toMatchObject({ userId: "abc-123" });
  });

  it("returns null for a token signed with a different secret", () => {
    const token = signToken({ userId: "abc-123" }, "test-secret");
    expect(verifyToken(token, "wrong-secret")).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(verifyToken("not-a-token", "test-secret")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npm run test -- auth` — expect FAIL (modules not found).

- [ ] **Step 3: Implement**

`server/src/auth/hash.ts`:
```ts
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const storedBuf = Buffer.from(hashHex, "hex");
  return derivedKey.length === storedBuf.length && timingSafeEqual(derivedKey, storedBuf);
}
```

`server/src/auth/jwt.ts`:
```ts
import jwt from "jsonwebtoken";

export interface TokenPayload {
  userId: string;
}

export function signToken(payload: TokenPayload, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: "30d" });
}

export function verifyToken(token: string, secret: string): TokenPayload | null {
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npm run test -- auth` — expect PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/auth/hash.ts server/src/auth/hash.test.ts server/src/auth/jwt.ts server/src/auth/jwt.test.ts
git commit -m "Add password hashing and JWT utilities"
```

---

### Task 3: Database migration and repo layer

**Files:**
- Create: `server/migrations/001_init.sql`
- Create: `server/src/db.ts`
- Create: `server/src/repo.ts`, `server/src/repo.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `createPool(connectionString: string): Pool` from `db.ts`;
  `createUser(pool, email, passwordHash): Promise<User>`,
  `findUserByEmail(pool, email): Promise<User | null>`,
  `getSavedPlan(pool, userId, programId): Promise<Record<string, number> | null>`,
  `upsertSavedPlan(pool, userId, programId, plan): Promise<void>` from
  `repo.ts`, where `User = { id: string; email: string; passwordHash: string }`.
  Consumed by Task 4's auth routes and Task 5's plans routes (both mock
  this module in their own tests — no real Postgres needed for any
  automated test in this plan).

- [ ] **Step 1: Write the migration**

`server/migrations/001_init.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_plans (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL,
  plan_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, program_id)
);
```

- [ ] **Step 2: Write db.ts and the migration runner**

`server/src/db.ts`:
```ts
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function createPool(connectionString: string): Pool {
  return new Pool({ connectionString });
}

export async function runMigrations(pool: Pool): Promise<void> {
  const sql = readFileSync(join(__dirname, "..", "migrations", "001_init.sql"), "utf-8");
  await pool.query(sql);
}
```

- [ ] **Step 3: Write the failing repo tests (mocked pool, no real Postgres)**

`server/src/repo.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { createUser, findUserByEmail, getSavedPlan, upsertSavedPlan } from "./repo";

function fakePool(rows: unknown[]): Pool {
  return { query: vi.fn().mockResolvedValue({ rows }) } as unknown as Pool;
}

describe("repo", () => {
  it("createUser inserts and returns the new row", async () => {
    const pool = fakePool([{ id: "u1", email: "a@b.com", passwordHash: "h" }]);
    const user = await createUser(pool, "a@b.com", "h");
    expect(user).toEqual({ id: "u1", email: "a@b.com", passwordHash: "h" });
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO users"), ["a@b.com", "h"]);
  });

  it("findUserByEmail returns null when no row matches", async () => {
    const pool = fakePool([]);
    expect(await findUserByEmail(pool, "nobody@b.com")).toBeNull();
  });

  it("findUserByEmail returns the row when found", async () => {
    const pool = fakePool([{ id: "u1", email: "a@b.com", passwordHash: "h" }]);
    expect(await findUserByEmail(pool, "a@b.com")).toEqual({ id: "u1", email: "a@b.com", passwordHash: "h" });
  });

  it("getSavedPlan returns null when nothing saved", async () => {
    const pool = fakePool([]);
    expect(await getSavedPlan(pool, "u1", "wifo")).toBeNull();
  });

  it("getSavedPlan returns the stored plan_json", async () => {
    const pool = fakePool([{ plan_json: { "CS 500": 1 } }]);
    expect(await getSavedPlan(pool, "u1", "wifo")).toEqual({ "CS 500": 1 });
  });

  it("upsertSavedPlan issues an INSERT ... ON CONFLICT with the plan as a param", async () => {
    const pool = fakePool([]);
    await upsertSavedPlan(pool, "u1", "wifo", { "CS 500": 1 });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT"),
      ["u1", "wifo", { "CS 500": 1 }]
    );
  });
});
```

- [ ] **Step 4: Run to verify failure**

Run: `cd server && npm run test -- repo` — expect FAIL.

- [ ] **Step 5: Implement**

`server/src/repo.ts`:
```ts
import type { Pool } from "pg";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export async function createUser(pool: Pool, email: string, passwordHash: string): Promise<User> {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2)
     RETURNING id, email, password_hash AS "passwordHash"`,
    [email, passwordHash]
  );
  return result.rows[0] as User;
}

export async function findUserByEmail(pool: Pool, email: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT id, email, password_hash AS "passwordHash" FROM users WHERE email = $1`,
    [email]
  );
  return (result.rows[0] as User | undefined) ?? null;
}

export async function getSavedPlan(pool: Pool, userId: string, programId: string): Promise<Record<string, number> | null> {
  const result = await pool.query(
    `SELECT plan_json FROM saved_plans WHERE user_id = $1 AND program_id = $2`,
    [userId, programId]
  );
  return result.rows[0]?.plan_json ?? null;
}

export async function upsertSavedPlan(pool: Pool, userId: string, programId: string, plan: Record<string, number>): Promise<void> {
  await pool.query(
    `INSERT INTO saved_plans (user_id, program_id, plan_json, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id, program_id)
     DO UPDATE SET plan_json = $3, updated_at = now()`,
    [userId, programId, plan]
  );
}
```

- [ ] **Step 6: Run to verify pass**

Run: `cd server && npm run test -- repo` — expect PASS (6 tests).

- [ ] **Step 7: Commit**

```bash
git add server/migrations/001_init.sql server/src/db.ts server/src/repo.ts server/src/repo.test.ts
git commit -m "Add database migration and repo layer"
```

---

### Task 4: Auth middleware and auth routes

**Files:**
- Create: `server/src/auth/middleware.ts`
- Create: `server/src/routes/auth.ts`, `server/src/routes/auth.test.ts`

**Interfaces:**
- Consumes: `hashPassword`/`verifyPassword` (Task 2), `signToken`/`verifyToken`
  (Task 2), `createUser`/`findUserByEmail` (Task 3).
- Produces: `requireAuth(secret: string)` middleware factory (attaches
  `req.userId`, 401s otherwise) from `middleware.ts`; `createAuthRouter(pool, jwtSecret): express.Router`
  from `routes/auth.ts`, mounted at `/api/auth` by Task 6, exposing
  `POST /signup`, `POST /login`, `POST /logout`, `GET /me`.

- [ ] **Step 1: Write the middleware**

`server/src/auth/middleware.ts`:
```ts
import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "./jwt";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(secret: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    const token = req.cookies?.token as string | undefined;
    const payload = token ? verifyToken(token, secret) : null;
    if (!payload) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    req.userId = payload.userId;
    next();
  };
}
```

- [ ] **Step 2: Write the failing route tests**

`server/src/routes/auth.test.ts`:
```ts
import express from "express";
import cookieParser from "cookie-parser";
import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Pool } from "pg";
import { createAuthRouter } from "./auth";
import * as repo from "../repo";
import * as hash from "../auth/hash";

vi.mock("../repo");
vi.mock("../auth/hash");

const SECRET = "test-secret";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/auth", createAuthRouter({} as Pool, SECRET));
  return app;
}

describe("POST /api/auth/signup", () => {
  it("creates a user and sets a cookie", async () => {
    vi.mocked(hash.hashPassword).mockResolvedValue("hashed");
    vi.mocked(repo.createUser).mockResolvedValue({ id: "u1", email: "a@b.com", passwordHash: "hashed" });

    const res = await request(buildApp()).post("/api/auth/signup").send({ email: "a@b.com", password: "supersecret" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ email: "a@b.com" });
    expect(res.headers["set-cookie"]?.[0]).toContain("token=");
  });

  it("rejects a password shorter than 8 characters", async () => {
    const res = await request(buildApp()).post("/api/auth/signup").send({ email: "a@b.com", password: "short" });
    expect(res.status).toBe(400);
  });

  it("returns 409 when the email is already registered", async () => {
    vi.mocked(hash.hashPassword).mockResolvedValue("hashed");
    vi.mocked(repo.createUser).mockRejectedValue(Object.assign(new Error("dup"), { code: "23505" }));

    const res = await request(buildApp()).post("/api/auth/signup").send({ email: "a@b.com", password: "supersecret" });
    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials and sets a cookie", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue({ id: "u1", email: "a@b.com", passwordHash: "hashed" });
    vi.mocked(hash.verifyPassword).mockResolvedValue(true);

    const res = await request(buildApp()).post("/api/auth/login").send({ email: "a@b.com", password: "supersecret" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: "a@b.com" });
    expect(res.headers["set-cookie"]?.[0]).toContain("token=");
  });

  it("returns 401 for an unknown email", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(null);
    const res = await request(buildApp()).post("/api/auth/login").send({ email: "nobody@b.com", password: "supersecret" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for a wrong password", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue({ id: "u1", email: "a@b.com", passwordHash: "hashed" });
    vi.mocked(hash.verifyPassword).mockResolvedValue(false);
    const res = await request(buildApp()).post("/api/auth/login").send({ email: "a@b.com", password: "wrong" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 with no cookie", async () => {
    const res = await request(buildApp()).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the cookie and returns 204", async () => {
    const res = await request(buildApp()).post("/api/auth/logout");
    expect(res.status).toBe(204);
    expect(res.headers["set-cookie"]?.[0]).toContain("token=;");
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `cd server && npm run test -- routes/auth` — expect FAIL.

- [ ] **Step 4: Implement**

`server/src/routes/auth.ts`:
```ts
import { Router } from "express";
import type { Pool } from "pg";
import { hashPassword, verifyPassword } from "../auth/hash";
import { signToken } from "../auth/jwt";
import { requireAuth } from "../auth/middleware";
import { createUser, findUserByEmail } from "../repo";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createAuthRouter(pool: Pool, jwtSecret: string): Router {
  const router = Router();

  router.post("/signup", async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!isValidEmail(email) || typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Invalid email or password (min 8 characters)" });
      return;
    }
    try {
      const passwordHash = await hashPassword(password);
      const user = await createUser(pool, email, passwordHash);
      const token = signToken({ userId: user.id }, jwtSecret);
      res.cookie("token", token, COOKIE_OPTIONS);
      res.status(201).json({ email: user.email });
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        res.status(409).json({ error: "Email already registered" });
        return;
      }
      res.status(500).json({ error: "Signup failed" });
    }
  });

  router.post("/login", async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!isValidEmail(email) || typeof password !== "string") {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }
    const user = await findUserByEmail(pool, email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const token = signToken({ userId: user.id }, jwtSecret);
    res.cookie("token", token, COOKIE_OPTIONS);
    res.status(200).json({ email: user.email });
  });

  router.post("/logout", (_req, res) => {
    res.clearCookie("token", COOKIE_OPTIONS);
    res.status(204).send();
  });

  router.get("/me", requireAuth(jwtSecret), async (req, res) => {
    res.status(200).json({ email: (req as { userEmail?: string }).userEmail ?? "" });
  });

  return router;
}
```

Note on `/me`: `requireAuth` only attaches `req.userId`, not the email.
Fetching the email requires a lookup — extend `requireAuth` or do a
`findUserByEmail`-style lookup by id here. Since `repo.ts` (Task 3) has
no `findUserById`, add one now:

In `server/src/repo.ts`, add:
```ts
export async function findUserById(pool: Pool, id: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT id, email, password_hash AS "passwordHash" FROM users WHERE id = $1`,
    [id]
  );
  return (result.rows[0] as User | undefined) ?? null;
}
```

And implement `/me` using it:
```ts
  router.get("/me", requireAuth(jwtSecret), async (req, res) => {
    const userId = (req as AuthedRequestLike).userId as string;
    const user = await findUserById(pool, userId);
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    res.status(200).json({ email: user.email });
  });
```
(Add `import { findUserById } from "../repo";` and `import type { AuthedRequest as AuthedRequestLike } from "../auth/middleware";`
to the top of the file, and add one more mocked-repo test for `/me` returning `200 { email }` when `requireAuth` passes and `findUserById` resolves a user — construct a valid cookie in the test via `signToken({userId: "u1"}, SECRET)` and set it with `.set("Cookie", ...)`.)

- [ ] **Step 5: Run to verify pass**

Run: `cd server && npm run test -- routes/auth repo` — expect PASS (repo
tests gain the `findUserById` case; auth route tests all pass, 8 total).

- [ ] **Step 6: Commit**

```bash
git add server/src/auth/middleware.ts server/src/routes/auth.ts server/src/routes/auth.test.ts server/src/repo.ts server/src/repo.test.ts
git commit -m "Add auth middleware and signup/login/logout/me routes"
```

---

### Task 5: Plans routes

**Files:**
- Create: `server/src/routes/plans.ts`, `server/src/routes/plans.test.ts`

**Interfaces:**
- Consumes: `requireAuth` (Task 4), `getSavedPlan`/`upsertSavedPlan` (Task 3).
- Produces: `createPlansRouter(pool, jwtSecret): express.Router`, mounted
  at `/api/plans` by Task 6, exposing `GET /:programId`, `PUT /:programId`
  (both behind `requireAuth`).

- [ ] **Step 1: Write the failing tests**

`server/src/routes/plans.test.ts`:
```ts
import express from "express";
import cookieParser from "cookie-parser";
import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Pool } from "pg";
import { createPlansRouter } from "./plans";
import { signToken } from "../auth/jwt";
import * as repo from "../repo";

vi.mock("../repo");

const SECRET = "test-secret";
const cookie = `token=${signToken({ userId: "u1" }, SECRET)}`;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/plans", createPlansRouter({} as Pool, SECRET));
  return app;
}

describe("GET /api/plans/:programId", () => {
  it("returns 401 with no auth cookie", async () => {
    const res = await request(buildApp()).get("/api/plans/wifo");
    expect(res.status).toBe(401);
  });

  it("returns 404 when nothing is saved", async () => {
    vi.mocked(repo.getSavedPlan).mockResolvedValue(null);
    const res = await request(buildApp()).get("/api/plans/wifo").set("Cookie", cookie);
    expect(res.status).toBe(404);
  });

  it("returns the saved plan", async () => {
    vi.mocked(repo.getSavedPlan).mockResolvedValue({ "CS 500": 1 });
    const res = await request(buildApp()).get("/api/plans/wifo").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ plan: { "CS 500": 1 } });
  });
});

describe("PUT /api/plans/:programId", () => {
  it("returns 401 with no auth cookie", async () => {
    const res = await request(buildApp()).put("/api/plans/wifo").send({ plan: {} });
    expect(res.status).toBe(401);
  });

  it("upserts the plan and returns 200", async () => {
    vi.mocked(repo.upsertSavedPlan).mockResolvedValue(undefined);
    const res = await request(buildApp()).put("/api/plans/wifo").set("Cookie", cookie).send({ plan: { "CS 500": 1 } });
    expect(res.status).toBe(200);
    expect(repo.upsertSavedPlan).toHaveBeenCalledWith({}, "u1", "wifo", { "CS 500": 1 });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npm run test -- routes/plans` — expect FAIL.

- [ ] **Step 3: Implement**

`server/src/routes/plans.ts`:
```ts
import { Router } from "express";
import type { Pool } from "pg";
import { requireAuth, type AuthedRequest } from "../auth/middleware";
import { getSavedPlan, upsertSavedPlan } from "../repo";

export function createPlansRouter(pool: Pool, jwtSecret: string): Router {
  const router = Router();
  router.use(requireAuth(jwtSecret));

  router.get("/:programId", async (req: AuthedRequest, res) => {
    const plan = await getSavedPlan(pool, req.userId as string, req.params.programId);
    if (!plan) {
      res.status(404).json({ error: "No saved plan" });
      return;
    }
    res.status(200).json({ plan });
  });

  router.put("/:programId", async (req: AuthedRequest, res) => {
    const { plan } = req.body ?? {};
    if (typeof plan !== "object" || plan === null) {
      res.status(400).json({ error: "plan must be an object" });
      return;
    }
    await upsertSavedPlan(pool, req.userId as string, req.params.programId, plan);
    res.status(200).json({ ok: true });
  });

  return router;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npm run test -- routes/plans` — expect PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/plans.ts server/src/routes/plans.test.ts
git commit -m "Add plans routes (get/save saved plan)"
```

---

### Task 6: Wire the full app, rate limiting, migrations at startup

**Files:**
- Modify: `server/src/app.ts`
- Modify: `server/src/server.ts`
- Test: `server/src/app.test.ts` (extend)

**Interfaces:**
- Consumes: `createAuthRouter` (Task 4), `createPlansRouter` (Task 5),
  `createPool`/`runMigrations` (Task 3).
- Produces: `createApp(pool: Pool, jwtSecret: string, frontendOrigin: string): express.Express`
  — signature changes from Task 1's zero-arg version; this is the final
  signature Task 11's deployment relies on indirectly (via `server.ts`
  reading env vars).

- [ ] **Step 1: Update createApp's signature and wiring**

`server/src/app.ts`:
```ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import type { Pool } from "pg";
import { createAuthRouter } from "./routes/auth";
import { createPlansRouter } from "./routes/plans";

export function createApp(pool: Pool, jwtSecret: string, frontendOrigin: string): express.Express {
  const app = express();

  app.use(cors({ origin: frontendOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 });
  app.use("/api/auth", authLimiter, createAuthRouter(pool, jwtSecret));
  app.use("/api/plans", createPlansRouter(pool, jwtSecret));

  return app;
}
```

- [ ] **Step 2: Update server.ts to build the pool, run migrations, and pass real config**

`server/src/server.ts`:
```ts
import { createApp } from "./app";
import { createPool, runMigrations } from "./db";

const PORT = Number(process.env.PORT) || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

if (!DATABASE_URL || !JWT_SECRET || !FRONTEND_ORIGIN) {
  throw new Error("DATABASE_URL, JWT_SECRET, and FRONTEND_ORIGIN must be set");
}

async function main() {
  const pool = createPool(DATABASE_URL as string);
  await runMigrations(pool);
  const app = createApp(pool, JWT_SECRET as string, FRONTEND_ORIGIN as string);
  app.listen(PORT, () => {
    console.log(`wim-planer-api listening on :${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Update app.test.ts for the new signature, add one full-flow integration test**

Replace `server/src/app.test.ts` with:
```ts
import express from "express";
import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Pool } from "pg";
import { createApp } from "./app";
import * as repo from "./repo";
import * as hash from "./auth/hash";

vi.mock("./repo");
vi.mock("./auth/hash");

const SECRET = "test-secret";

function buildApp() {
  return createApp({} as Pool, SECRET, "http://localhost:5173");
}

describe("GET /health", () => {
  it("returns 200 ok", async () => {
    const res = await request(buildApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("full signup -> save plan -> get plan flow", () => {
  it("works end-to-end through the real app instance", async () => {
    const app = buildApp();

    vi.mocked(hash.hashPassword).mockResolvedValue("hashed");
    vi.mocked(repo.createUser).mockResolvedValue({ id: "u1", email: "a@b.com", passwordHash: "hashed" });

    const signupRes = await request(app).post("/api/auth/signup").send({ email: "a@b.com", password: "supersecret" });
    expect(signupRes.status).toBe(201);
    const cookieHeader = signupRes.headers["set-cookie"][0] as string;
    const cookie = cookieHeader.split(";")[0];

    vi.mocked(repo.upsertSavedPlan).mockResolvedValue(undefined);
    const putRes = await request(app).put("/api/plans/wifo").set("Cookie", cookie).send({ plan: { "CS 500": 1 } });
    expect(putRes.status).toBe(200);

    vi.mocked(repo.getSavedPlan).mockResolvedValue({ "CS 500": 1 });
    const getRes = await request(app).get("/api/plans/wifo").set("Cookie", cookie);
    expect(getRes.status).toBe(200);
    expect(getRes.body).toEqual({ plan: { "CS 500": 1 } });
  });
});
```

- [ ] **Step 4: Run full backend suite**

Run: `cd server && npm run test` — expect PASS (all suites). Run
`cd server && npm run build` — expect clean TypeScript build.

- [ ] **Step 5: Commit**

```bash
git add server/src/app.ts server/src/server.ts server/src/app.test.ts
git commit -m "Wire the full backend app: CORS, rate limiting, migrations at startup"
```

---

### Task 7: Frontend auth and cloud-sync API clients

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/auth.test.ts`
- Create: `src/lib/cloudSync.ts`, `src/lib/cloudSync.test.ts`

**Interfaces:**
- Consumes: `Plan` type from `src/data/types.ts`.
- Produces: `signup`, `login`, `logout`, `getCurrentUser`, type `AuthUser`
  from `auth.ts`; `fetchCloudPlan`, `saveCloudPlan` from `cloudSync.ts`.
  Both read `import.meta.env.VITE_API_URL`. Consumed by Task 8's
  `AuthContext` and `ProgramPlanner` wiring.

- [ ] **Step 1: Write the failing tests**

`src/lib/auth.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, login, logout, signup } from "./auth";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => fetchMock.mockReset());

describe("auth client", () => {
  it("signup posts credentials with credentials: include and returns the user", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ email: "a@b.com" }) });
    const user = await signup("a@b.com", "password123");
    expect(user).toEqual({ email: "a@b.com" });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/auth/signup");
    expect(opts.credentials).toBe("include");
    expect(JSON.parse(opts.body)).toEqual({ email: "a@b.com", password: "password123" });
  });

  it("login throws with the server's error message on failure", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: "Invalid email or password" }) });
    await expect(login("a@b.com", "wrong")).rejects.toThrow("Invalid email or password");
  });

  it("getCurrentUser returns null on 401 instead of throwing", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    expect(await getCurrentUser()).toBeNull();
  });

  it("logout posts to the logout endpoint", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    await logout();
    expect(fetchMock.mock.calls[0][0]).toContain("/api/auth/logout");
  });
});
```

`src/lib/cloudSync.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCloudPlan, saveCloudPlan } from "./cloudSync";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => fetchMock.mockReset());

describe("cloudSync", () => {
  it("fetchCloudPlan returns null on 404", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    expect(await fetchCloudPlan("wifo")).toBeNull();
  });

  it("fetchCloudPlan returns the plan on success", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ plan: { "CS 500": 1 } }) });
    expect(await fetchCloudPlan("wifo")).toEqual({ "CS 500": 1 });
  });

  it("saveCloudPlan PUTs the plan with credentials included", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await saveCloudPlan("wifo", { "CS 500": 1 });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/plans/wifo");
    expect(opts.method).toBe("PUT");
    expect(opts.credentials).toBe("include");
    expect(JSON.parse(opts.body)).toEqual({ plan: { "CS 500": 1 } });
  });

  it("saveCloudPlan throws on a non-ok response", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(saveCloudPlan("wifo", {})).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- src/lib/auth src/lib/cloudSync` — expect FAIL.

- [ ] **Step 3: Implement**

`src/lib/auth.ts`:
```ts
const API_URL = import.meta.env.VITE_API_URL as string;

export interface AuthUser {
  email: string;
}

async function parseOrThrow(res: Response): Promise<AuthUser> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body as AuthUser;
}

export async function signup(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseOrThrow(res);
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseOrThrow(res);
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch(`${API_URL}/api/auth/me`, { credentials: "include" });
  if (res.status === 401) return null;
  return parseOrThrow(res);
}
```

`src/lib/cloudSync.ts`:
```ts
import type { Plan } from "../data/types";

const API_URL = import.meta.env.VITE_API_URL as string;

export async function fetchCloudPlan(programId: string): Promise<Plan | null> {
  const res = await fetch(`${API_URL}/api/plans/${programId}`, { credentials: "include" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch cloud plan (${res.status})`);
  const data = await res.json();
  return data.plan as Plan;
}

export async function saveCloudPlan(programId: string, plan: Plan): Promise<void> {
  const res = await fetch(`${API_URL}/api/plans/${programId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error(`Failed to save cloud plan (${res.status})`);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- src/lib/auth src/lib/cloudSync` — expect PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/auth.test.ts src/lib/cloudSync.ts src/lib/cloudSync.test.ts
git commit -m "Add frontend auth and cloud-sync API clients"
```

---

### Task 8: AuthContext, reconcilePlans, and ProgramPlanner sync wiring

**Files:**
- Create: `src/lib/AuthContext.tsx`, `src/lib/AuthContext.test.tsx`
- Create: `src/lib/reconcile.ts`, `src/lib/reconcile.test.ts`
- Modify: `src/components/ProgramPlanner.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `signup`/`login`/`logout`/`getCurrentUser`/`AuthUser` (Task 7),
  `fetchCloudPlan`/`saveCloudPlan` (Task 7).
- Produces: `AuthProvider` (React component), `useAuth(): { user: AuthUser | null; loading: boolean; login; signup; logout }`
  from `AuthContext.tsx`; `reconcilePlans(local: Plan | null, cloud: Plan | null): Plan`
  from `reconcile.ts`. Consumed by Task 9's `AuthWidget` and by
  `ProgramPlanner` (this task).

- [ ] **Step 1: Write and verify reconcile.ts (TDD)**

`src/lib/reconcile.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { reconcilePlans } from "./reconcile";

describe("reconcilePlans", () => {
  it("prefers the cloud plan when one exists", () => {
    expect(reconcilePlans({ "CS 500": 1 }, { "CS 530": 2 })).toEqual({ "CS 530": 2 });
  });

  it("falls back to the local plan when the cloud has nothing", () => {
    expect(reconcilePlans({ "CS 500": 1 }, null)).toEqual({ "CS 500": 1 });
  });

  it("returns an empty plan when neither exists", () => {
    expect(reconcilePlans(null, null)).toEqual({});
  });
});
```

Run: `npm run test -- reconcile` — expect FAIL, then implement:

`src/lib/reconcile.ts`:
```ts
import type { Plan } from "../data/types";

export function reconcilePlans(local: Plan | null, cloud: Plan | null): Plan {
  if (cloud) return cloud;
  if (local) return local;
  return {};
}
```

Run again — expect PASS (3 tests).

- [ ] **Step 2: Write AuthContext**

`src/lib/AuthContext.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, login as apiLogin, logout as apiLogout, signup as apiSignup, type AuthUser } from "./auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    setUser(await apiLogin(email, password));
  };
  const signup = async (email: string, password: string) => {
    setUser(await apiSignup(email, password));
  };
  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
```

`src/lib/AuthContext.test.tsx`:
```tsx
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
import * as authApi from "./auth";

vi.mock("./auth");

afterEach(() => vi.clearAllMocks());

function Probe() {
  const { user, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return <div>{user ? `hello ${user.email}` : "logged out"}</div>;
}

describe("AuthProvider", () => {
  it("shows logged-out state when getCurrentUser resolves null", async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(null);
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText("logged out")).toBeInTheDocument();
  });

  it("shows the user's email when already logged in", async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({ email: "a@b.com" });
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText("hello a@b.com")).toBeInTheDocument();
  });
});
```

Run: `npm run test -- AuthContext` — expect PASS (2 tests).

- [ ] **Step 3: Wire ProgramPlanner to sync when authenticated**

In `src/components/ProgramPlanner.tsx`, add imports:
```ts
import { useAuth } from "../lib/AuthContext";
import { fetchCloudPlan, saveCloudPlan } from "../lib/cloudSync";
import { reconcilePlans } from "../lib/reconcile";
```

Inside the component, after the existing `plan`/`setPlan` state and the
existing `localStorage` save effect, add:
```ts
const { user } = useAuth();

useEffect(() => {
  if (!user) return;
  let cancelled = false;
  fetchCloudPlan(program.id).then((cloud) => {
    if (cancelled) return;
    setPlan((local) => {
      const reconciled = reconcilePlans(local, cloud);
      if (!cloud && Object.keys(reconciled).length > 0) {
        saveCloudPlan(program.id, reconciled).catch(() => {});
      }
      return reconciled;
    });
  });
  return () => {
    cancelled = true;
  };
}, [user, program.id]);

useEffect(() => {
  if (!user) return;
  const timeout = setTimeout(() => {
    saveCloudPlan(program.id, plan).catch(() => {});
  }, 800);
  return () => clearTimeout(timeout);
}, [user, program.id, plan]);
```

- [ ] **Step 4: Wrap App.tsx in AuthProvider**

In `src/App.tsx`, wrap the existing return value:
```tsx
import { AuthProvider } from "./lib/AuthContext";
// ...
return (
  <AuthProvider>
    <div className="app-shell">
      {program ? <ProgramPlanner key={program.id} program={program} /> : <ProgramPicker programs={PROGRAMS} />}
    </div>
  </AuthProvider>
);
```

- [ ] **Step 5: Extend ProgramPlanner.test.tsx to cover the sync effect**

Add to `src/components/ProgramPlanner.test.tsx` (mock `../lib/AuthContext`,
`../lib/cloudSync`):
```tsx
vi.mock("../lib/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../lib/cloudSync");

import { useAuth } from "../lib/AuthContext";
import * as cloudSync from "../lib/cloudSync";

// ... inside a new describe block:
describe("cloud sync", () => {
  it("does not call the cloud API when logged out", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login: vi.fn(), signup: vi.fn(), logout: vi.fn() });
    render(<ProgramPlanner program={WIFO_PROGRAM} />);
    expect(cloudSync.fetchCloudPlan).not.toHaveBeenCalled();
  });

  it("pushes the local plan to the cloud when logged in and the cloud has nothing yet", async () => {
    localStorage.setItem("planner:v2:wifo", JSON.stringify({ "CS 500": 1 }));
    vi.mocked(useAuth).mockReturnValue({ user: { email: "a@b.com" }, loading: false, login: vi.fn(), signup: vi.fn(), logout: vi.fn() });
    vi.mocked(cloudSync.fetchCloudPlan).mockResolvedValue(null);
    vi.mocked(cloudSync.saveCloudPlan).mockResolvedValue(undefined);

    render(<ProgramPlanner program={WIFO_PROGRAM} />);

    await vi.waitFor(() => expect(cloudSync.saveCloudPlan).toHaveBeenCalledWith("wifo", { "CS 500": 1 }));
  });
});
```
(`vi.waitFor` is vitest's async-condition helper; if unavailable in the
installed vitest version, use `@testing-library/react`'s `waitFor` instead
— check which one is already imported elsewhere in the test suite and
match it.)

- [ ] **Step 6: Run the full frontend suite**

Run: `npm run test` — expect PASS across every file. Run `npm run build`
— expect a clean build.

- [ ] **Step 7: Commit**

```bash
git add src/lib/AuthContext.tsx src/lib/AuthContext.test.tsx src/lib/reconcile.ts src/lib/reconcile.test.ts src/components/ProgramPlanner.tsx src/components/ProgramPlanner.test.tsx src/App.tsx
git commit -m "Add AuthContext, reconcilePlans, and wire ProgramPlanner cloud sync"
```

---

### Task 9: AuthWidget component

**Files:**
- Create: `src/components/AuthWidget.tsx`, `src/components/AuthWidget.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 8).
- Produces: `AuthWidget()` component, mounted once in `App.tsx` above the
  picker/planner switch.

- [ ] **Step 1: Write the failing tests**

`src/components/AuthWidget.test.tsx`:
```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthWidget } from "./AuthWidget";
import { useAuth } from "../lib/AuthContext";

vi.mock("../lib/AuthContext", () => ({ useAuth: vi.fn() }));

describe("AuthWidget", () => {
  it("renders nothing while auth state is loading", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: true, login: vi.fn(), signup: vi.fn(), logout: vi.fn() });
    const { container } = render(<AuthWidget />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the signed-in state and calls logout on click", () => {
    const logout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ user: { email: "a@b.com" }, loading: false, login: vi.fn(), signup: vi.fn(), logout });
    render(<AuthWidget />);
    expect(screen.getByText(/a@b.com/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Log out"));
    expect(logout).toHaveBeenCalled();
  });

  it("submits the login form with the entered credentials", () => {
    const login = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login, signup: vi.fn(), logout: vi.fn() });
    render(<AuthWidget />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByText("Log in"));
    expect(login).toHaveBeenCalledWith("a@b.com", "password123");
  });

  it("shows an error message when login rejects", async () => {
    const login = vi.fn().mockRejectedValue(new Error("Invalid email or password"));
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login, signup: vi.fn(), logout: vi.fn() });
    render(<AuthWidget />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByText("Log in"));
    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- AuthWidget` — expect FAIL.

- [ ] **Step 3: Implement**

`src/components/AuthWidget.tsx`:
```tsx
import { useState, type FormEvent } from "react";
import { useAuth } from "../lib/AuthContext";

export function AuthWidget() {
  const { user, loading, login, signup, logout } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;

  if (user) {
    return (
      <div className="auth-widget">
        <span>Signed in as {user.email}</span>
        <button onClick={() => logout()}>Log out</button>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "login") await login(email, password);
      else await signup(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <form className="auth-widget" onSubmit={submit}>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      <button type="submit">{mode === "login" ? "Log in" : "Sign up"}</button>
      <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
        {mode === "login" ? "Need an account?" : "Have an account?"}
      </button>
      {error ? <p className="hint">{error}</p> : null}
    </form>
  );
}
```

- [ ] **Step 4: Mount it in App.tsx**

In `src/App.tsx`, render `<AuthWidget />` once, inside `<AuthProvider>`,
above the `{program ? ... : ...}` switch:
```tsx
<AuthProvider>
  <div className="app-shell">
    <AuthWidget />
    {program ? <ProgramPlanner key={program.id} program={program} /> : <ProgramPicker programs={PROGRAMS} />}
  </div>
</AuthProvider>
```
(add `import { AuthWidget } from "./components/AuthWidget";`)

- [ ] **Step 5: Run to verify pass**

Run: `npm run test -- AuthWidget` — expect PASS (4 tests). Run
`npm run test` for the full suite and `npm run build`.

- [ ] **Step 6: Commit**

```bash
git add src/components/AuthWidget.tsx src/components/AuthWidget.test.tsx src/App.tsx
git commit -m "Add AuthWidget and mount it in App"
```

---

### Task 10: Export/import

**Files:**
- Create: `src/components/ExportImport.tsx`, `src/components/ExportImport.test.tsx`
- Modify: `src/components/ProgramPlanner.tsx`

**Interfaces:**
- Consumes: `Plan` type.
- Produces: `ExportImport({ programId: string; plan: Plan; onImport: (plan: Plan) => void })`,
  mounted in `ProgramPlanner`.

- [ ] **Step 1: Write the failing tests**

`src/components/ExportImport.test.tsx`:
```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExportImport } from "./ExportImport";

describe("ExportImport", () => {
  it("triggers a download with the plan JSON when Download is clicked", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:fake-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<ExportImport programId="wifo" plan={{ "CS 500": 1 }} onImport={vi.fn()} />);
    fireEvent.click(screen.getByText("Download plan"));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it("parses an imported JSON file and calls onImport with its plan", async () => {
    const onImport = vi.fn();
    render(<ExportImport programId="wifo" plan={{}} onImport={onImport} />);

    const file = new File([JSON.stringify({ programId: "wifo", plan: { "CS 530": 2 } })], "wifo-plan.json", { type: "application/json" });
    const input = screen.getByLabelText("Import plan") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await vi.waitFor(() => expect(onImport).toHaveBeenCalledWith({ "CS 530": 2 }));
  });

  it("ignores a malformed JSON file without crashing", async () => {
    const onImport = vi.fn();
    render(<ExportImport programId="wifo" plan={{}} onImport={onImport} />);

    const file = new File(["not json"], "bad.json", { type: "application/json" });
    const input = screen.getByLabelText("Import plan") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await new Promise((r) => setTimeout(r, 50));
    expect(onImport).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- ExportImport` — expect FAIL. If `FileReader`
misbehaves in this project's jsdom (check the actual error — this repo
has hit real jsdom/Node-version surprises before, e.g. `localStorage`),
report DONE_WITH_CONCERNS with the specific failure rather than guessing
around it; don't silently swap in a different file-reading approach
without noting why.

- [ ] **Step 3: Implement**

`src/components/ExportImport.tsx`:
```tsx
import type { ChangeEvent } from "react";
import type { Plan } from "../data/types";

export function ExportImport({
  programId, plan, onImport,
}: {
  programId: string; plan: Plan; onImport: (plan: Plan) => void;
}) {
  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ programId, plan }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${programId}-plan.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data && typeof data.plan === "object" && data.plan !== null) {
          onImport(data.plan as Plan);
        }
      } catch {
        // ignore malformed file
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="export-import">
      <button onClick={handleExport}>Download plan</button>
      <label>
        Import plan
        <input type="file" accept="application/json" aria-label="Import plan" onChange={handleImport} />
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Wire it into ProgramPlanner**

In `src/components/ProgramPlanner.tsx`, import and render it (e.g. near
the `StatsBar`):
```tsx
import { ExportImport } from "./ExportImport";
// ...
<ExportImport programId={program.id} plan={plan} onImport={setPlan} />
```

- [ ] **Step 5: Run to verify pass**

Run: `npm run test -- ExportImport` — expect PASS (3 tests). Run
`npm run test` for the full suite and `npm run build`.

- [ ] **Step 6: Commit**

```bash
git add src/components/ExportImport.tsx src/components/ExportImport.test.tsx src/components/ProgramPlanner.tsx
git commit -m "Add export/import for plans without an account"
```

---

### Task 11: Deploy the backend and wire the frontend to it

**This task is executed by the controller directly (Coolify MCP tool
access + external infrastructure), not dispatched to a subagent
implementer.**

- [ ] **Step 1: Generate a JWT secret**

Generate a random 32-byte hex secret (e.g. `openssl rand -hex 32`, or
Node's `crypto.randomBytes(32).toString("hex")`). Do not commit it
anywhere — it's a Coolify env var only.

- [ ] **Step 2: Create the Postgres database on Coolify**

In the `Side-Projects` project (uuid `dga5nzs9pdoi8zxluia5a3rw`), production
environment (uuid `tdpjlcq5rln0zcuquspe4me1`), server `localhost` (uuid
`ymt1nsys4ypjeqlk8bkz2kr4`): create a standalone Postgres database named
`wim-planer-db`, matching the existing `mytutorium-db` pattern. Record its
internal connection string for Step 4.

- [ ] **Step 3: Create the API application on Coolify**

Create a new application named `wim-planer-api` in the same project/
environment/server, `git_repository` pointing at this same repo
(`BlackSamuron0305/UNI-Mannheim_Master-Planer-WIM`), `git_branch: main`,
`build_pack: dockerfile`, `base_directory: /server` (so it builds from
`server/Dockerfile`, not the frontend's root Dockerfile), `ports_exposes: "3000"`,
domain `https://wim-planer-api.sandouk.net`.

- [ ] **Step 4: Set the API app's environment variables**

`DATABASE_URL` (from Step 2), `JWT_SECRET` (from Step 1), `FRONTEND_ORIGIN=https://wim-planer.sandouk.net`.

- [ ] **Step 5: Deploy the API and verify it's healthy**

Trigger a deploy, wait for it to finish, then `curl -s https://wim-planer-api.sandouk.net/health` — expect `{"status":"ok"}`.

- [ ] **Step 6: Add the frontend's API URL env var and redeploy the frontend**

Set `VITE_API_URL=https://wim-planer-api.sandouk.net` as a build-time env
var on the existing `wim-master-planer` Coolify app (this must be set at
build time since Vite inlines `import.meta.env.*` values during `vite build`
— confirm the variable is marked as a build-time/buildpack variable, not
runtime-only). Redeploy `wim-master-planer`.

- [ ] **Step 7: Manual end-to-end verification**

In a real browser against the live URLs: sign up with a test account,
select a few modules, confirm they persist after a page reload (cloud
round-trip, not just localStorage). Log out, log back in — plan should
still be there. Open the app in a fresh private/incognito window and log
in with the same account — the cloud plan should load (not an empty
plan). Use "Download plan," clear `localStorage`, use "Import plan" with
the downloaded file — confirm the plan is restored. Check the browser
console for errors throughout.

- [ ] **Step 8: Update the ledger and commit any deployment notes**

If anything in Steps 1-7 required a deviation from this task's plan
(different Coolify field names, a build failure needing a fix), record it
in the SDD ledger the same way earlier deployment work in this project
was recorded.
