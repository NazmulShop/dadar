# Dadar Shop API — Cloudflare Workers

Hono + D1 + KV (+ optional R2 / Durable Objects) backend for Dadar Shop.
This is the **only** backend in this project — there is no separate
Express/Render service.

The frontend (`artifacts/dadar-shop`) is not part of this package — it only
needs `VITE_API_URL` pointed at the deployed Worker origin at build time.

## Deploy target (already configured)

`wrangler.toml` in this directory is pre-filled with real, already-created
Cloudflare resources for this project:

- Worker name: `dadar-shop`
- D1 database: `dadar_shop` (binding `DB`)
- KV namespaces: `SESSIONS_KV`, `RATE_KV`
- `APP_URL` / `CORS_ORIGIN`: `https://dadar-shop.shop-io.workers.dev`

If you are deploying this to a **different** Cloudflare account than the
one these resources were created in, you'll need to replace the
`database_id` / KV `id` values with your own (`wrangler d1 create dadar_shop`,
`wrangler kv namespace create SESSIONS_KV`, etc.) before deploying —
otherwise leave `wrangler.toml` untouched.

## What's in this project

| File / dir                            | Purpose                                                                |
|---------------------------------------|------------------------------------------------------------------------|
| `wrangler.toml`                       | Bindings (D1 `DB`, KV `SESSIONS_KV` / `RATE_KV`, optional R2 `UPLOADS`, optional DO `ADMIN_HUB`) + cron |
| `migrations/`                         | Full SQLite schema (25 tables) — `wrangler d1 migrations apply`        |
| `src/index.ts`                        | Hono entry point (`main` in `wrangler.toml`) — CORS, body cap, route mounting, cron `scheduled()` |
| `src/env.ts`                          | `Env` (`DB`, `SESSIONS_KV`, `RATE_KV`, `APP_URL`, `CORS_ORIGIN`, + optional fields) + `Variables` types — re-exported from `src/index.ts` too |
| `src/db/schema.ts`, `src/db/index.ts` | Drizzle SQLite schema + per-request `getDb(env)`                       |
| `src/lib/`                            | `cors`, `ids`, `hash`, `jwt`, `session` (KV-backed), `otpService` (shared 6-digit OTP issue/verify, used by register + login + admin_login + forgot_password), `email` (Brevo via fetch), `superAdmin`, `rateLimit`, `activityLog`, `r2`, `broadcast`, `health`, `startup` |
| `src/middleware/auth.ts`              | `requireAuth` / `requireAdmin` / `requireSuperAdmin` / `optionalAuth`  |
| `src/routes/`                         | `health`, `auth`, `uploads` (R2 or D1 fallback), `admin`, `admin-management`, `support`, `account`, `ws` |
| `src/do/AdminHub.ts`                  | Hibernatable WebSocket DO + 15s health alarm (paid plan only)          |
| `setup.sh`                            | One-command interactive deploy script for CLI use (creates D1/KV, sets secrets, deploys) |
| `.dev.vars.example`                   | Template for local `wrangler dev` secrets                              |

## OTP system (shared & reusable)

There is exactly **one** OTP implementation in this codebase —
`src/lib/otpService.ts` — used by every flow that needs a one-time code:

- User registration (`type = "register"`, stored as `email_verify`)
- Admin login verification (`type = "admin_login"`)
- Passwordless OTP login (`type = "otp_login"`)
- Forgot-password (`type = "forgot_password"`)

Every OTP row carries `target` (email), `code`, `type`, `expiresAt`, `used`.
Verification always filters on `type` at the database query level — an OTP
issued for one purpose can never be consumed in another context, even if
the 6-digit code happens to collide.

Timing (uniform across every type):

- **Expiry: 2 minutes** from issuance.
- **Resend cooldown: 2 minutes** — a new OTP for the same `(email, type)`
  pair cannot be requested again until the previous one's 2-minute window
  has fully elapsed. There is no bypass anywhere, including the admin
  "resend code" button.
- **Single-use** — consuming an OTP immediately marks it `used`; issuing a
  new one for the same `(email, type)` deletes any previous unused row.

On top of the per-target cooldown, every OTP-send and OTP-verify route is
also rate-limited per IP (`src/lib/rateLimit.ts`, KV-backed) — 10 sends and
20 verify attempts per 15 minutes — so a single IP can't cycle through many
different email addresses to route around the per-target cooldown, and code
guessing is bounded independently of the OTP's own 2-minute lifetime.

## Admin login flow & routes

There are exactly two roles: **Normal User** and **Admin**. The Admin
account is the single email configured via `ADMIN_EMAIL` (alias:
`SUPER_ADMIN_EMAIL`) — this check is always server-side; the client never
supplies or influences a role/`isAdmin` flag.

- **Registration**: `POST /api/auth/register` with `email === ADMIN_EMAIL`
  is treated as an admin registration candidate. It goes through the same
  `register`-type OTP flow as a normal user; after OTP verification, the
  account must additionally supply `ADMIN_SECRET_KEY` (alias:
  `SUPER_ADMIN_SECRET_KEY`, compared in constant time) before it is
  actually promoted to Admin.
- **Login**: `POST /api/auth/login` with `email === ADMIN_EMAIL` never logs
  in directly — it returns a short-lived ticket instead of a session and
  emails an `admin_login`-type OTP. The client then completes:
  1. `POST /api/auth/admin-login/verify-otp` (alias: `POST /api/auth/admin/verify-otp`)
  2. `POST /api/auth/admin-login/verify-secret` (alias: `POST /api/auth/admin/verify-secret`)

  Only after both succeed is a real session created. The `/admin-login/...`
  paths are what the bundled frontend calls; the `/admin/...` paths are
  identical aliases (same handler function, registered twice) provided for
  any client that expects the literal `/admin/verify-otp` /
  `/admin/verify-secret` naming.
- A normal user's `/login` always returns a session directly — no OTP, no
  secret key.

## Status

| Area                                          | State |
|------------------------------------------------|-------|
| Schema (25 tables)                              | ✅ |
| Auth (register/login/logout/me/OTP/verify-email/forgot/reset) | ✅ |
| Uploads                                         | ✅ R2-backed; auto-falls back to D1 storage (~750KB cap) when R2 isn't configured |
| Health endpoints + cron                         | ✅ |
| WebSocket admin hub                             | ✅ hibernatable Durable Object (requires Workers Paid — see below) |
| Super Admin bootstrap                           | ✅ timing-safe secret compare, rate-limited, single-use |
| KV-backed sessions + revocation tombstone       | ✅ |
| KV-backed bootstrap rate limiter                | ✅ |
| Admin / admin-management / support routes       | ✅ |
| Startup validation                              | ✅ flags missing bindings/secrets and leftover placeholder URLs in logs |

Only remaining 501: `POST /auth/send-otp` with `channel: "phone"` is not
implemented (no SMS provider wired up). Email OTP is fully functional.

## Free plan vs. paid plan

This Worker is designed to run entirely on Cloudflare's **free plan** using
only D1 + KV. Two pieces are optional, paid-tier upgrades:

- **R2** (image uploads) — without it, uploads are stored directly in D1
  (capped at ~750KB/image). Uncomment the `[[r2_buckets]]` block in
  `wrangler.toml` once you're on Workers Paid for larger, CDN-backed storage.
- **Durable Objects** (`ADMIN_HUB`, live admin WebSocket feed) — without it,
  `GET /api/admin/ws` returns `503`. Everything else works normally.
  Uncomment the `[[durable_objects.bindings]]` block once you're on Workers
  Paid.

## Deploy via Cloudflare Dashboard (recommended — this project's setup)

No GitHub Actions, no CI secrets. Cloudflare builds and deploys directly
from your GitHub repo:

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages** → **Create application** →
   **Import a repository** → select this repo.
3. Set:
   - **Root directory:** `artifacts/api-worker`
   - **Build command:** *(leave blank)*
   - **Deploy command:** `npm run deploy`
4. Add the one required secret before deploying: Workers & Pages → your
   Worker → **Settings** → **Variables and Secrets** → add `JWT_SECRET`
   (type **Secret**, ≥32 random characters).
5. **Save and Deploy.** Every future `git push` redeploys automatically.

See the root [`README.md`](../../README.md) for the full walkthrough
(including deploying the frontend as a second Worker).

## First-time deploy via CLI (alternative to the dashboard)

The fastest path is the interactive script, which creates the D1 database
and KV namespaces (if they don't already exist), writes their IDs into
`wrangler.toml`, generates a `JWT_SECRET`, runs migrations, and deploys:

```bash
# From the repo root (installs the whole pnpm workspace, once)
pnpm install

cd artifacts/api-worker
bash setup.sh
```

To do it manually instead:

```bash
cd artifacts/api-worker

# 1. (skip if reusing the resources already configured in wrangler.toml)
pnpm exec wrangler d1 create dadar_shop                  # paste database_id into wrangler.toml
pnpm exec wrangler kv namespace create SESSIONS_KV       # paste id into wrangler.toml
pnpm exec wrangler kv namespace create RATE_KV           # paste id into wrangler.toml

# 2. Secrets
pnpm exec wrangler secret put JWT_SECRET                 # required, >= 32 chars (openssl rand -hex 32)
pnpm exec wrangler secret put BREVO_API_KEY              # optional — OTP emails log to console when absent
pnpm exec wrangler secret put SENDER_EMAIL               # optional — "Name <email>" OTPs are sent from (alias: BREVO_FROM_EMAIL)
pnpm exec wrangler secret put ADMIN_EMAIL                # optional, only for the one-time admin bootstrap (alias: SUPER_ADMIN_EMAIL)
pnpm exec wrangler secret put ADMIN_SECRET_KEY           # optional, >= 16 chars, only for bootstrap (alias: SUPER_ADMIN_SECRET_KEY)
pnpm exec wrangler secret put INTERNAL_BROADCAST_SECRET  # required only if ADMIN_HUB is enabled

# 3. (skip if reusing the APP_URL/CORS_ORIGIN already set in wrangler.toml)

# 4. Apply DB schema
pnpm exec wrangler d1 migrations apply DB --remote

# 5. Deploy
pnpm exec wrangler deploy
```

After deploy:

```bash
curl https://dadar-shop.shop-io.workers.dev/api/healthz
# → {"status":"ok"}
```

## Frontend wiring

Set `VITE_API_URL=https://dadar-shop.shop-io.workers.dev` (or your
custom domain) at build time for `artifacts/dadar-shop`. The WebSocket URL
is automatically derived from the same origin by the existing `useAdminWS`
hook.

## Local development

```bash
pnpm install   # from repo root, once
cd artifacts/api-worker
cp .dev.vars.example .dev.vars   # then fill in real values
pnpm exec wrangler dev
```

`wrangler dev` uses the `[env.dev.vars]` block in `wrangler.toml` for
`APP_URL`/`CORS_ORIGIN` overrides, and reads secrets from `.dev.vars`
(gitignored, never committed).
