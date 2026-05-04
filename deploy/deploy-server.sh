#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
#  marja-payment-bot — Server deploy script
# ════════════════════════════════════════════════════════════════════
#
#  Bu skript SERVER'da ishlaydi (lokalda emas).
#  Mavjud loyihaga halaqit bermaydi — alohida portlar, alohida konteynerlar,
#  alohida papka, "marja-" prefixli barcha resurslar.
#
#  Foydalanish:
#    scp deploy-server.sh root@SERVER:/tmp/
#    ssh root@SERVER
#    bash /tmp/deploy-server.sh
# ════════════════════════════════════════════════════════════════════

set -euo pipefail

# ──────────── KONFIGURATSIYA ────────────

APP_DIR="/opt/marja-bot"
APP_NAME="marja"                        # PM2 prefix, Docker prefix
REPO_URL="https://github.com/Ziyodillokh/marja-payment-bot.git"
NODE_VERSION="20"

# Portlar — boshqa loyihalarga halaqit bermasligi uchun yuqori range
DB_PORT="15432"
REDIS_PORT="16379"
BOT_PORT="3500"
ADMIN_PORT="3501"

# Postgres credentials (faqat shu konteyner uchun, izolatsiyalangan)
DB_NAME="marja_bot"
DB_USER="marja"
DB_PASSWORD=""                          # pastda generatsiya qilinadi

# ──────────── HELPERS ────────────

cyan()  { echo -e "\033[36m$*\033[0m"; }
green() { echo -e "\033[32m$*\033[0m"; }
red()   { echo -e "\033[31m$*\033[0m"; }
yellow(){ echo -e "\033[33m$*\033[0m"; }

step() { echo; cyan "━━━ $* ━━━"; }
ok()   { green "  ✓ $*"; }
warn() { yellow "  ⚠ $*"; }
fail() { red   "  ✗ $*"; exit 1; }

require_root() {
  if [ "$EUID" -ne 0 ]; then
    fail "root sifatida ishga tushiring (sudo bash $0)"
  fi
}

random_password() {
  # openssl rand — pipefail bilan xavfsiz (SIGPIPE muammosi yo'q).
  # 16 byte → 32 hex char (kuchli random).
  openssl rand -hex 16
}

check_port_free() {
  local port="$1"
  # Bizning konteynerimiz allaqachon shu portni ishlatayotgan bo'lsa — OK (re-deploy)
  if docker ps --format '{{.Names}}\t{{.Ports}}' 2>/dev/null \
       | grep -E "^marja-.*:${port}->" >/dev/null; then
    return 0
  fi
  # Listener PID'ini ss orqali olamiz
  local pid
  pid="$(ss -tlnp 2>/dev/null \
           | grep ":${port}\b" \
           | grep -oP 'pid=\K[0-9]+' \
           | head -n1 || true)"
  if [ -z "$pid" ]; then
    return 0  # hech kim listen qilmayapti
  fi
  # Listener'ning ishchi katalogi bizning APP_DIR ichidami? Agar shunday bo'lsa,
  # bu bizning PM2 jarayonimiz (marja-bot yoki marja-admin) — re-deploy uchun OK.
  local cwd
  cwd="$(readlink "/proc/${pid}/cwd" 2>/dev/null || true)"
  case "$cwd" in
    "$APP_DIR"|"$APP_DIR"/*) return 0 ;;
  esac
  return 1
}

# ──────────── 1. PREREQUISITES ────────────

step "1/8 Server tekshirish"
require_root

if [ ! -f /etc/os-release ]; then
  fail "Operatsion tizim noma'lum"
fi
. /etc/os-release
ok "OS: $PRETTY_NAME"

# Tekshirish: portlar bo'shmi
for port in "$DB_PORT" "$REDIS_PORT" "$BOT_PORT" "$ADMIN_PORT"; do
  if check_port_free "$port"; then
    ok "Port ${port} bo'sh"
  else
    fail "Port ${port} band — boshqa port tanlang yoki band servisni to'xtating"
  fi
done

# ──────────── 2. PAKETLAR ────────────

step "2/8 Asosiy paketlar"

# apt-get update — faqat biror paket o'rnatish kerak bo'lsa chaqiramiz.
APT_UPDATED=false
apt_update_once() {
  if [ "$APT_UPDATED" = "false" ]; then
    apt-get update -qq
    APT_UPDATED=true
  fi
}

install_if_missing() {
  if ! command -v "$1" >/dev/null 2>&1; then
    apt_update_once
    yellow "  → $2 o'rnatilmoqda..."
    apt-get install -y -qq "$2" >/dev/null
    ok "$2 o'rnatildi"
  else
    ok "$1 mavjud"
  fi
}

install_if_missing curl curl
install_if_missing git git
install_if_missing wget wget

# Node.js
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | grep -oP '\d+' | head -1)" -lt 20 ]; then
  yellow "  → Node.js ${NODE_VERSION} o'rnatilmoqda..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
  ok "Node.js $(node -v) o'rnatildi"
else
  ok "Node.js $(node -v) mavjud"
fi

# Docker
if ! command -v docker >/dev/null 2>&1; then
  yellow "  → Docker o'rnatilmoqda..."
  curl -fsSL https://get.docker.com | sh >/dev/null 2>&1
  systemctl enable --now docker >/dev/null
  ok "Docker o'rnatildi"
else
  ok "Docker $(docker --version | grep -oP '\d+\.\d+' | head -1) mavjud"
fi

# Docker Compose plugin
if ! docker compose version >/dev/null 2>&1; then
  apt_update_once
  yellow "  → Docker Compose plugin o'rnatilmoqda..."
  apt-get install -y -qq docker-compose-plugin >/dev/null
  ok "Docker Compose plugin o'rnatildi"
else
  ok "Docker Compose mavjud"
fi

# PM2
if ! command -v pm2 >/dev/null 2>&1; then
  yellow "  → PM2 o'rnatilmoqda..."
  npm install -g pm2 >/dev/null 2>&1
  ok "PM2 o'rnatildi"
else
  ok "PM2 $(pm2 -v) mavjud"
fi

# ──────────── 3. KOD ────────────

step "3/8 Kod yuklash"

if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch --all --quiet
  git reset --hard origin/main --quiet
  ok "Kod yangilandi (git pull)"
else
  rm -rf "$APP_DIR"
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --quiet "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
  ok "Kod klon qilindi"
fi

# ──────────── 3b. CHANGE DETECTION (smart skip) ────────────
# Avvalgi muvaffaqiyatli deploy SHA'sini cache'dan o'qiymiz va git diff bilan
# nima o'zgarganini aniqlaymiz. O'zgarmagan qismlar uchun npm ci / build / prisma
# qadamlari skip qilinadi.
#
# Majburiy to'liq deploy uchun: FORCE=true bash deploy/deploy-server.sh

CACHE_DIR="$APP_DIR/.deploy-cache"
mkdir -p "$CACHE_DIR"
LAST_SHA_FILE="$CACHE_DIR/last-sha"
LAST_SHA="$(cat "$LAST_SHA_FILE" 2>/dev/null || true)"
CURRENT_SHA="$(git rev-parse HEAD)"

NEED_BACKEND_DEPS=true
NEED_BACKEND_BUILD=true
NEED_PRISMA_GEN=true
NEED_SCHEMA_PUSH=true
NEED_ADMIN_DEPS=true
NEED_ADMIN_BUILD=true

if [ "${FORCE:-false}" = "true" ]; then
  warn "FORCE rejimi — barcha qadamlar qayta bajariladi"
elif [ -z "$LAST_SHA" ]; then
  warn "Birinchi deploy — hammasi quriladi"
elif [ ! -d node_modules ] || [ ! -d dist ] || [ ! -d admin-panel/node_modules ] \
     || [ ! -d admin-panel/.next ]; then
  warn "Mavjud build artifaktlari yetishmayapti — hammasi qayta quriladi"
elif [ "$LAST_SHA" = "$CURRENT_SHA" ]; then
  ok "Kod o'zgarmagan ($(echo "$CURRENT_SHA" | cut -c1-7)) — npm/build skip"
  NEED_BACKEND_DEPS=false
  NEED_BACKEND_BUILD=false
  NEED_PRISMA_GEN=false
  NEED_SCHEMA_PUSH=false
  NEED_ADMIN_DEPS=false
  NEED_ADMIN_BUILD=false
else
  CHANGED="$(git diff --name-only "$LAST_SHA" "$CURRENT_SHA" 2>/dev/null || true)"
  changed_match() { echo "$CHANGED" | grep -qE "$1"; }

  # Backend deps faqat package(-lock).json o'zgarsa
  changed_match '^package(-lock)?\.json$' || NEED_BACKEND_DEPS=false
  # Backend build src yoki tsconfig yoki package o'zgarsa, prisma client ham
  changed_match '^(src/|nest-cli\.json|tsconfig.*\.json|package(-lock)?\.json|prisma/schema\.prisma$)' \
    || NEED_BACKEND_BUILD=false
  # Prisma client faqat schema o'zgarsa
  changed_match '^prisma/schema\.prisma$' || NEED_PRISMA_GEN=false
  # DB push faqat schema yoki seed o'zgarsa
  changed_match '^prisma/' || NEED_SCHEMA_PUSH=false
  # Admin deps faqat admin package(-lock) o'zgarsa
  changed_match '^admin-panel/package(-lock)?\.json$' || NEED_ADMIN_DEPS=false
  # Admin build src/public/config o'zgarsa
  changed_match '^admin-panel/(src/|public/|next\.config|tailwind\.config|postcss\.config|tsconfig\.json|package(-lock)?\.json)' \
    || NEED_ADMIN_BUILD=false

  ok "O'zgargan: backend_deps=$NEED_BACKEND_DEPS build=$NEED_BACKEND_BUILD prisma=$NEED_PRISMA_GEN admin_deps=$NEED_ADMIN_DEPS admin_build=$NEED_ADMIN_BUILD"
fi

# ──────────── 4. .env ────────────

step "4/8 Environment konfiguratsiyasi"

ENV_FILE="$APP_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  ok ".env mavjud — saqlanmoqda (qayta yaratilmaydi)"
  # DB_PASSWORD ni o'qib olamiz, mavjud konteyner bilan mos bo'lishi uchun
  DB_PASSWORD=$(grep -oP '(?<=postgresql://[^:]+:)[^@]+(?=@)' "$ENV_FILE" || echo "")
  if [ -z "$DB_PASSWORD" ]; then DB_PASSWORD=$(random_password); fi
else
  yellow "  → .env yaratilmoqda..."
  DB_PASSWORD=$(random_password)
  JWT_SECRET=$(random_password)$(random_password)

  # Bot token va boshqa muhim qiymatlar — interactive yoki env'dan
  : "${BOT_TOKEN:=PASTE_BOT_TOKEN_HERE}"
  : "${BOT_USERNAME:=marja_sessiyabot}"
  : "${STORAGE_CHAT_ID:=}"

  cat > "$ENV_FILE" <<ENVEOF
# Auto-generated by deploy-server.sh
NODE_ENV=production
PORT=$BOT_PORT

DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME?schema=public

REDIS_HOST=localhost
REDIS_PORT=$REDIS_PORT
REDIS_PASSWORD=

BOT_TOKEN=$BOT_TOKEN
BOT_USERNAME=$BOT_USERNAME
BOT_MODE=polling

STORAGE_CHAT_ID=$STORAGE_CHAT_ID

JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
ENVEOF
  chmod 600 "$ENV_FILE"
  ok ".env yaratildi"

  if [ "$BOT_TOKEN" = "PASTE_BOT_TOKEN_HERE" ]; then
    warn ".env'da BOT_TOKEN va BOT_USERNAME ni tekshiring va to'g'rilang!"
    warn "  nano $ENV_FILE"
  fi
fi

# ──────────── 5. DOCKER (Postgres + Redis) ────────────

step "5/8 Docker konteynerlari"

cat > "$APP_DIR/docker-compose.prod.yml" <<DOCKEREOF
services:
  postgres:
    image: postgres:16-alpine
    container_name: ${APP_NAME}-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: $DB_USER
      POSTGRES_PASSWORD: $DB_PASSWORD
      POSTGRES_DB: $DB_NAME
    ports:
      - "127.0.0.1:${DB_PORT}:5432"   # faqat lokal — tashqaridan ko'rinmaydi
    volumes:
      - ${APP_NAME}-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $DB_USER"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    container_name: ${APP_NAME}-redis
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "127.0.0.1:${REDIS_PORT}:6379"
    volumes:
      - ${APP_NAME}-redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  ${APP_NAME}-postgres-data:
  ${APP_NAME}-redis-data:
DOCKEREOF

cd "$APP_DIR"
docker compose -f docker-compose.prod.yml up -d
ok "Postgres ($DB_PORT) va Redis ($REDIS_PORT) ishga tushdi"

# Postgres tayyor bo'lishini kutish
yellow "  → DB tayyor bo'lishini kutish..."
for i in $(seq 1 30); do
  if docker exec ${APP_NAME}-postgres pg_isready -U "$DB_USER" >/dev/null 2>&1; then
    ok "Postgres tayyor"
    break
  fi
  sleep 1
done

# ──────────── 6. BOT BACKEND ────────────

step "6/8 Bot backend (NestJS)"

cd "$APP_DIR"

if [ "$NEED_BACKEND_DEPS" = "true" ]; then
  npm ci --silent 2>&1 | tail -3 || true
  ok "Bog'lamlar o'rnatildi"
else
  ok "Bog'lamlar o'zgarmagan — skip"
fi

if [ "$NEED_PRISMA_GEN" = "true" ]; then
  npm run prisma:generate >/dev/null 2>&1
  ok "Prisma client generatsiya qilindi"
else
  ok "Prisma schema o'zgarmagan — generate skip"
fi

if [ "$NEED_SCHEMA_PUSH" = "true" ]; then
  npx prisma db push --accept-data-loss --skip-generate >/dev/null 2>&1
  ok "Schema sinxronlandi"
  # Seed faqat schema/prisma o'zgarganda — yangi defaultlar uchun.
  npm run prisma:seed 2>&1 | tail -3
  ok "Seed bajarildi"
else
  ok "DB schema o'zgarmagan — push/seed skip"
fi

if [ "$NEED_BACKEND_BUILD" = "true" ]; then
  npm run build >/dev/null 2>&1
  ok "TypeScript build"
else
  ok "Backend src o'zgarmagan — build skip"
fi

# ──────────── 7. ADMIN PANEL ────────────

step "7/8 Admin panel (Next.js)"

cd "$APP_DIR/admin-panel"

if [ "$NEED_ADMIN_DEPS" = "true" ]; then
  npm ci --silent 2>&1 | tail -3 || true
  ok "Admin panel bog'lamlari"
else
  ok "Admin bog'lamlari o'zgarmagan — skip"
fi

# .env.local — har safar yoziladi (mazmuni doim bir xil, lekin yo'qolmasin)
# Relative URL — brauzer admin panel ochilgan domen orqali API ga ulanadi.
# nginx /api/* ni backend'ga proxy qiladi.
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=/api
EOF

if [ "$NEED_ADMIN_BUILD" = "true" ]; then
  if ! npm run build; then
    fail "Admin panel build muvaffaqiyatsiz tugadi (yuqoridagi xatoga qarang)"
  fi
  ok "Admin panel build"
else
  ok "Admin src o'zgarmagan — build skip"
fi

# ──────────── 8. PM2 ────────────

step "8/8 PM2 servislar"

cd "$APP_DIR"

cat > ecosystem.config.cjs <<PMEOF
// Auto-generated PM2 config — marja-bot servislar
module.exports = {
  apps: [
    {
      name: '${APP_NAME}-bot',
      cwd: '$APP_DIR',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '$APP_DIR/logs/bot-error.log',
      out_file: '$APP_DIR/logs/bot-out.log',
      time: true,
    },
    {
      name: '${APP_NAME}-admin',
      cwd: '$APP_DIR/admin-panel',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p $ADMIN_PORT',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '$APP_DIR/logs/admin-error.log',
      out_file: '$APP_DIR/logs/admin-out.log',
      time: true,
    },
  ],
};
PMEOF

mkdir -p logs

# Smart restart:
# - Agar service'ning kodi o'zgargan bo'lsa, reload qilamiz (zero-downtime).
# - Agar mavjud bo'lmasa, yangidan ishga tushiramiz.
# - Agar online bo'lsa va o'zgarmagan bo'lsa, tegmaymiz.

pm2_status() {
  pm2 jlist 2>/dev/null \
    | grep -oE "\"name\":\"$1\"[^}]*\"status\":\"[^\"]+\"" \
    | grep -oE '"status":"[^"]+"' \
    | cut -d'"' -f4 \
    || echo "missing"
}

reload_or_start() {
  local name="$1"
  local need_restart="$2"
  local status
  status="$(pm2_status "$name")"

  if [ "$status" = "online" ]; then
    if [ "$need_restart" = "true" ]; then
      pm2 reload "$name" --update-env >/dev/null
      ok "$name reload (yangi kod)"
    else
      ok "$name online — tegmaymiz"
    fi
  else
    # missing/stopped/errored — yangi config bilan ishga tushiramiz
    pm2 delete "$name" >/dev/null 2>&1 || true
    pm2 start ecosystem.config.cjs --only "$name" >/dev/null
    ok "$name ishga tushdi"
  fi
}

reload_or_start "${APP_NAME}-bot" "$NEED_BACKEND_BUILD"
reload_or_start "${APP_NAME}-admin" "$NEED_ADMIN_BUILD"

pm2 save >/dev/null
ok "PM2 holati saqlandi"

# Reboot bo'lganda avtomatik ishga tushadigan qilish (faqat birinchi marta)
if ! systemctl is-enabled pm2-root >/dev/null 2>&1; then
  pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
  ok "PM2 systemd avtorun yoqildi"
fi

# ──────────── DEPLOY SHA SAQLASH ────────────
# Faqat hammasi muvaffaqiyatli bo'lgandan keyin yozamiz, shunda keyingi deploy
# diff'ni shu nuqtadan boshlab hisoblaydi.
echo "$CURRENT_SHA" > "$LAST_SHA_FILE"

# ──────────── XULOSA ────────────

echo
green "═════════════════════════════════════════════════════════"
green "  DEPLOY MUVAFFAQIYATLI"
green "═════════════════════════════════════════════════════════"
echo
cyan "📂 Loyiha papkasi:    $APP_DIR"
cyan "🤖 Bot API:          http://localhost:$BOT_PORT/api"
cyan "🎨 Admin panel:      http://$(curl -s ifconfig.me 2>/dev/null || echo 'IP'):$ADMIN_PORT"
cyan "🐘 Postgres:         localhost:$DB_PORT (faqat lokal)"
cyan "🔴 Redis:            localhost:$REDIS_PORT (faqat lokal)"
echo
cyan "👤 Login:           admin / admin123  (BIRINCHI LOGINDA O'ZGARTIRING!)"
echo
yellow "📝 Foydali komandalar:"
echo "  pm2 list                    — servislar holati"
echo "  pm2 logs ${APP_NAME}-bot     — bot loglari"
echo "  pm2 logs ${APP_NAME}-admin   — panel loglari"
echo "  pm2 restart ${APP_NAME}-bot  — qayta ishga tushirish"
echo "  pm2 monit                   — real-time monitor"
echo
yellow "🔄 Yangilash uchun:"
echo "  cd $APP_DIR && git pull && bash deploy/deploy-server.sh"
echo "  (faqat o'zgargan qismlar qayta quriladi — tezroq)"
echo
yellow "🔁 Hammasini majburiy qayta qurish kerak bo'lsa:"
echo "  FORCE=true bash deploy/deploy-server.sh"
echo
if [ "${BOT_TOKEN:-}" = "PASTE_BOT_TOKEN_HERE" ] || [ -z "$(grep '^BOT_TOKEN=' "$ENV_FILE" | cut -d= -f2)" ]; then
  red "⚠️  ENVIRONMENT TO'LDIRILMAGAN!"
  red "    nano $ENV_FILE  — BOT_TOKEN, BOT_USERNAME, STORAGE_CHAT_ID to'ldiring"
  red "    pm2 restart ${APP_NAME}-bot"
fi
