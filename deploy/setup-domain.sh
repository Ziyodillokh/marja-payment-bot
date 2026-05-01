#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
#  marja-payment-bot — Domen + SSL ulash
# ════════════════════════════════════════════════════════════════════
#
#  Bu skript:
#    1. nginx o'rnatadi (yo'q bo'lsa)
#    2. Domen uchun nginx config yaratadi (alohida fayl, boshqa
#       sayt config'larga teng)
#    3. Let's Encrypt SSL sertifikat oladi (certbot)
#    4. HTTPS uchun configni avtomatik yangilaydi
#    5. Admin panelda NEXT_PUBLIC_API_URL ni yangilab qayta build qiladi
#    6. Avtomatik renewal sertifikat (certbot timer)
#
#  Foydalanish:
#    DOMAIN ENV bilan:
#      DOMAIN=sessiya.marjagroup.uz EMAIL=admin@example.com bash setup-domain.sh
#
#    Yoki interactive:
#      bash setup-domain.sh
#
#  TALABLAR:
#    - DNS A record DOMAIN → server IP allaqachon sozlangan bo'lishi kerak
#    - Server'da port 80 va 443 ochiq (firewall)
#    - Avval deploy-server.sh ishga tushirilgan bo'lishi kerak (admin panel
#      port 3501'da, bot port 3500'da ishlayotgan bo'lsin)
# ════════════════════════════════════════════════════════════════════

set -euo pipefail

# ──────────── KONFIGURATSIYA ────────────

APP_DIR="/opt/marja-bot"
APP_NAME="marja"
BOT_PORT="3500"
ADMIN_PORT="3501"

# DOMAIN va EMAIL — env'dan yoki interactive
DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"

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

# ──────────── 1. INPUT ────────────

step "1/7 Tekshirish"
require_root

if [ -z "$DOMAIN" ]; then
  read -rp "Domen kiriting (masalan: sessiya.marjagroup.uz): " DOMAIN
fi
if [ -z "$DOMAIN" ]; then
  fail "Domen majburiy"
fi

if [ -z "$EMAIL" ]; then
  read -rp "Email (Let's Encrypt notification uchun): " EMAIL
fi
if [ -z "$EMAIL" ]; then
  fail "Email majburiy (Let's Encrypt talabi)"
fi

ok "Domen: $DOMAIN"
ok "Email: $EMAIL"

# Loyiha papkasini tekshirish
if [ ! -d "$APP_DIR" ]; then
  fail "$APP_DIR topilmadi. Avval deploy-server.sh ishga tushiring."
fi

# Bot va admin servislarini tekshirish
if ! pm2 describe ${APP_NAME}-bot >/dev/null 2>&1; then
  warn "PM2'da ${APP_NAME}-bot topilmadi"
fi
if ! pm2 describe ${APP_NAME}-admin >/dev/null 2>&1; then
  warn "PM2'da ${APP_NAME}-admin topilmadi"
fi

# ──────────── 2. DNS TEKSHIRUVI ────────────

step "2/7 DNS tekshiruvi"

SERVER_IP=$(curl -s4 ifconfig.me 2>/dev/null || curl -s4 icanhazip.com 2>/dev/null || echo "")
if [ -z "$SERVER_IP" ]; then
  warn "Server IP'sini aniqlab bo'lmadi (DNS tekshiruvi o'tkazilmaydi)"
else
  ok "Server IP: $SERVER_IP"

  # DNS resolution
  RESOLVED_IP=$(getent hosts "$DOMAIN" 2>/dev/null | awk '{print $1}' | head -1 || echo "")
  if [ -z "$RESOLVED_IP" ]; then
    fail "DOMEN ($DOMAIN) DNS'da topilmadi. A record sozlanmagan."
  fi
  ok "DNS: $DOMAIN → $RESOLVED_IP"

  if [ "$RESOLVED_IP" != "$SERVER_IP" ]; then
    warn "DNS IP ($RESOLVED_IP) bu server IP'siga ($SERVER_IP) mos kelmaydi!"
    warn "Cloudflare proxy yoqilgan bo'lishi mumkin (orange cloud) — bu OK bo'lishi mumkin"
    read -rp "Davom etamizmi? [y/N]: " CONFIRM
    if [ "${CONFIRM,,}" != "y" ]; then
      fail "Bekor qilindi"
    fi
  fi
fi

# ──────────── 3. NGINX O'RNATISH ────────────

step "3/7 nginx tekshirish"

if ! command -v nginx >/dev/null 2>&1; then
  yellow "  → nginx o'rnatilmoqda..."
  apt-get update -qq
  apt-get install -y -qq nginx >/dev/null
  ok "nginx o'rnatildi"
else
  ok "nginx mavjud ($(nginx -v 2>&1 | grep -oP 'nginx/\K[\d.]+'))"
fi

# Nginx ishlamoqdami
if ! systemctl is-active --quiet nginx; then
  systemctl start nginx
fi
systemctl enable nginx >/dev/null 2>&1
ok "nginx ishlamoqda"

# ──────────── 4. CERTBOT O'RNATISH ────────────

step "4/7 Certbot tekshirish"

if ! command -v certbot >/dev/null 2>&1; then
  yellow "  → certbot o'rnatilmoqda..."
  apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
  ok "certbot o'rnatildi"
else
  ok "certbot mavjud"
fi

# ──────────── 5. NGINX CONFIG ────────────

step "5/7 Nginx konfiguratsiyasi"

NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}-admin"
NGINX_LINK="/etc/nginx/sites-enabled/${APP_NAME}-admin"

# Avval HTTP-only config (certbot keyin SSL qo'shadi)
cat > "$NGINX_CONF" <<NGINXEOF
# marja-payment-bot — admin panel + bot API reverse proxy
# Avtomatik yaratilgan: $(date)
# DOMEN: $DOMAIN

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Let's Encrypt validation uchun
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Backend API — NestJS (port $BOT_PORT)
    location /api/ {
        proxy_pass http://127.0.0.1:$BOT_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Video/rasm upload uchun (50MB)
        client_max_body_size 60M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Admin panel — Next.js (port $ADMIN_PORT)
    location / {
        proxy_pass http://127.0.0.1:$ADMIN_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }
}
NGINXEOF
ok "Config yozildi: $NGINX_CONF"

# Symlink
if [ ! -L "$NGINX_LINK" ]; then
  ln -s "$NGINX_CONF" "$NGINX_LINK"
fi
ok "sites-enabled'ga ulandi"

# Default config'ni o'chirib qo'yish (faqat 80'da ish bo'lsa)
# Lekin ehtiyot bo'lib — boshqa loyihalarga teng emas
# Aslida default konfiguratsiya bo'lsa, bizning server_name darajasi
# tekshiriladi va bizniki ishlatiladi.

# Sintaksisni tekshirish
if ! nginx -t >/dev/null 2>&1; then
  red "  Nginx config xato:"
  nginx -t
  fail "Nginx config sintaksisi noto'g'ri"
fi
ok "Nginx config sintaksisi to'g'ri"

systemctl reload nginx
ok "nginx reload qilindi"

# ──────────── 6. SSL SERTIFIKAT ────────────

step "6/7 Let's Encrypt SSL"

# Certbot avtomatik nginx config'ni yangilaydi va SSL qo'shadi.
# --non-interactive: prompt bermaydi
# --redirect: HTTP → HTTPS avtomatik redirect
# --agree-tos: shartlarga rozilik
# --no-eff-email: EFF'ga email yubormaslik

CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
if [ -d "$CERT_DIR" ]; then
  ok "Sertifikat allaqachon mavjud — yangilanmoqda"
  certbot renew --nginx --quiet || true
else
  yellow "  → Sertifikat olinmoqda..."
  certbot --nginx \
    --non-interactive \
    --agree-tos \
    --no-eff-email \
    --redirect \
    -m "$EMAIL" \
    -d "$DOMAIN" \
    || fail "Certbot fail bo'ldi. DNS to'g'ri sozlanganligini tekshiring."
  ok "SSL sertifikat olindi"
fi

# Avto-renewal timer (Ubuntu/Debian'da package bilan o'rnatiladi)
systemctl enable --now certbot.timer >/dev/null 2>&1 || true
ok "Avtomatik renewal yoqildi (certbot.timer)"

# ──────────── 7. ADMIN PANELNI YANGILASH ────────────

step "7/7 Admin panel'ni domain bilan rebuild qilish"

ADMIN_DIR="$APP_DIR/admin-panel"
ADMIN_ENV="$ADMIN_DIR/.env.local"

# Yangi NEXT_PUBLIC_API_URL — domain orqali
NEW_API_URL="https://$DOMAIN/api"

if [ -f "$ADMIN_ENV" ]; then
  # mavjud bo'lsa o'zgartirish
  if grep -q "^NEXT_PUBLIC_API_URL=" "$ADMIN_ENV"; then
    sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$NEW_API_URL|" "$ADMIN_ENV"
  else
    echo "NEXT_PUBLIC_API_URL=$NEW_API_URL" >> "$ADMIN_ENV"
  fi
else
  echo "NEXT_PUBLIC_API_URL=$NEW_API_URL" > "$ADMIN_ENV"
fi
ok "NEXT_PUBLIC_API_URL = $NEW_API_URL"

# Admin panelni qayta build qilish (Next.js NEXT_PUBLIC_* ni build paytida bake qiladi)
yellow "  → Admin panel rebuild qilinmoqda..."
cd "$ADMIN_DIR"
npm run build 2>&1 | tail -5
ok "Admin panel build tayyor"

# PM2 restart
pm2 restart ${APP_NAME}-admin >/dev/null 2>&1 || true
ok "${APP_NAME}-admin qayta ishga tushdi"

# ──────────── XULOSA ────────────

echo
green "═════════════════════════════════════════════════════════"
green "  DOMEN + SSL ULANDI"
green "═════════════════════════════════════════════════════════"
echo
cyan "🌐 Admin panel: https://$DOMAIN"
cyan "🔌 Bot API:    https://$DOMAIN/api"
cyan "🔒 SSL:         Let's Encrypt (avto-renewal yoqilgan)"
echo
yellow "📝 Foydali komandalar:"
echo "  certbot certificates                 — sertifikatlar holati"
echo "  certbot renew --dry-run              — renewal test"
echo "  systemctl status nginx               — nginx holati"
echo "  nginx -t                             — config tekshirish"
echo "  tail -f /var/log/nginx/error.log     — xatolarni ko'rish"
echo
cyan "🔄 Webhook rejimga o'tish (ixtiyoriy):"
echo "  nano /opt/marja-bot/.env"
echo "  # BOT_MODE=webhook"
echo "  # BOT_WEBHOOK_URL=https://$DOMAIN/bot/webhook"
echo "  # BOT_WEBHOOK_SECRET=<random>"
echo "  pm2 restart ${APP_NAME}-bot"
echo
green "✅ Brauzerda https://$DOMAIN ni oching!"
