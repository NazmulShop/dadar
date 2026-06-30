#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  Dadar Shop — Cloudflare Worker One-Click Deploy Script
#  চালানোর নিয়ম:  bash setup.sh   (run from inside artifacts/api-worker)
#  আগে দরকার:     Node.js + pnpm install (from repo root) + wrangler login
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✗]${NC} $*" >&2; exit 1; }

# Use the workspace-local wrangler (installed as a devDependency) so this
# script works without any global npm/bun install.
WRANGLER=(pnpm exec wrangler)

# ─── wrangler check ───────────────────────────────────────────────────────────
"${WRANGLER[@]}" --version >/dev/null 2>&1 || error "wrangler not found. Run 'pnpm install' from the repo root first."
info "wrangler found: $("${WRANGLER[@]}" --version 2>&1 | head -1)"

echo ""
echo -e "${CYAN}══════════════════════════════════════════════${NC}"
echo -e "${CYAN}   Dadar Shop — Cloudflare Worker Setup       ${NC}"
echo -e "${CYAN}══════════════════════════════════════════════${NC}"
echo ""

# ─── Step 1: D1 Database ──────────────────────────────────────────────────────
info "Step 1/7 — Creating D1 database 'dadar-shop'..."
D1_OUT=$("${WRANGLER[@]}" d1 create dadar-shop 2>&1) || true
echo "$D1_OUT"

DB_ID=$(echo "$D1_OUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2 || true)
if [ -z "$DB_ID" ]; then
  warn "Could not auto-detect database_id. The database may already exist."
  warn "Run: pnpm exec wrangler d1 list   to find your database_id"
  read -rp "$(echo -e ${YELLOW}Paste your D1 database_id here:${NC} )" DB_ID
fi
success "D1 database_id: $DB_ID"

# ─── Step 2: KV Namespaces ────────────────────────────────────────────────────
info "Step 2/7 — Creating KV namespaces..."

SESSIONS_OUT=$("${WRANGLER[@]}" kv:namespace create SESSIONS_KV 2>&1) || true
echo "$SESSIONS_OUT"
SESSIONS_ID=$(echo "$SESSIONS_OUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2 || true)

RATE_OUT=$("${WRANGLER[@]}" kv:namespace create RATE_KV 2>&1) || true
echo "$RATE_OUT"
RATE_ID=$(echo "$RATE_OUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2 || true)

if [ -z "$SESSIONS_ID" ]; then
  warn "Could not auto-detect SESSIONS_KV id."
  warn "Run: pnpm exec wrangler kv:namespace list   to find it"
  read -rp "$(echo -e ${YELLOW}Paste SESSIONS_KV namespace id:${NC} )" SESSIONS_ID
fi
if [ -z "$RATE_ID" ]; then
  warn "Could not auto-detect RATE_KV id."
  read -rp "$(echo -e ${YELLOW}Paste RATE_KV namespace id:${NC} )" RATE_ID
fi

success "SESSIONS_KV id: $SESSIONS_ID"
success "RATE_KV id:     $RATE_ID"

# ─── Step 3: Update wrangler.toml ────────────────────────────────────────────
info "Step 3/7 — Updating wrangler.toml with generated IDs..."

TOML="wrangler.toml"

# Replace D1 database_id placeholder
sed -i.bak "s|database_id = \"REPLACE_WITH_YOUR_D1_DATABASE_ID\"|database_id = \"$DB_ID\"|g" "$TOML"
# Replace KV id placeholders
sed -i.bak "s|id = \"REPLACE_WITH_SESSIONS_KV_ID\"|id = \"$SESSIONS_ID\"|g" "$TOML"
sed -i.bak "s|id = \"REPLACE_WITH_RATE_KV_ID\"|id = \"$RATE_ID\"|g" "$TOML"
rm -f "$TOML.bak"

success "wrangler.toml updated."

# ─── Step 4: APP_URL and CORS_ORIGIN ─────────────────────────────────────────
info "Step 4/7 — Configuring URLs..."
echo ""
echo -e "  Your Worker URL হবে: ${YELLOW}https://<your-worker-name>.<your-cf-subdomain>.workers.dev${NC}"
echo -e "  এটা deploy করার পরে পাবেন। এখন একটা domain দিন (বা পরে manually সেট করুন):"
echo ""
read -rp "$(echo -e ${YELLOW}APP_URL \(e.g. https://api.dadar.shop or press Enter to skip\):${NC} )" APP_URL_VAL
read -rp "$(echo -e ${YELLOW}CORS_ORIGIN \(e.g. https://dadar.shop or press Enter to skip\):${NC} )" CORS_VAL

if [ -n "$APP_URL_VAL" ]; then
  sed -i.bak "s|APP_URL = \"https://your-worker-subdomain.workers.dev\"|APP_URL = \"$APP_URL_VAL\"|g" "$TOML"
  rm -f "$TOML.bak"
  success "APP_URL set to: $APP_URL_VAL"
fi
if [ -n "$CORS_VAL" ]; then
  sed -i.bak "s|CORS_ORIGIN = \"https://your-frontend-domain.com\"|CORS_ORIGIN = \"$CORS_VAL\"|g" "$TOML"
  rm -f "$TOML.bak"
  success "CORS_ORIGIN set to: $CORS_VAL"
fi

# ─── Step 5: JWT Secret ───────────────────────────────────────────────────────
info "Step 5/7 — Setting JWT_SECRET..."
JWT_SECRET=$(node -e "const c=require('crypto');process.stdout.write(c.randomBytes(32).toString('hex'))" 2>/dev/null || \
             python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || \
             cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 64 | head -1)

echo "$JWT_SECRET" | "${WRANGLER[@]}" secret put JWT_SECRET
success "JWT_SECRET set."

# ─── Step 6: Run D1 Migration ─────────────────────────────────────────────────
info "Step 6/7 — Running database migration..."
"${WRANGLER[@]}" d1 migrations apply DB --remote
success "Migration applied."

# ─── Step 7: Deploy ───────────────────────────────────────────────────────────
info "Step 7/7 — Deploying Worker..."
"${WRANGLER[@]}" deploy

echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✓ Dadar Shop Worker deployed successfully!  ${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo ""
echo -e "  Next steps:"
echo -e "  1. Copy the Worker URL from above"
echo -e "  2. Set VITE_API_URL in your frontend build to that URL"
echo -e "  3. If you updated APP_URL/CORS_ORIGIN, run: ${YELLOW}pnpm exec wrangler deploy${NC} again"
echo ""
