#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
#  SSL fix — marja-admin nginx config'ini to'liq HTTPS bilan qayta yozadi
# ════════════════════════════════════════════════════════════════════
#
#  Sabab: setup-domain.sh boshida HTTP-only config yozgan, va certbot --nginx
#  qayta ishga tushganda SSL directiva qo'shmagan (renew rejimida).
#
#  Yechim: sertifikat MAVJUD bo'lsa, configni to'liq SSL bilan qayta yozamiz.
#  default_server orqali sessiya.marjagroup.uz uchun bizning cert'imiz
#  beriladi. marjagroup.uz so'rovlari esa o'z config'iga ketadi (SNI).
#
#  Foydalanish:
#    DOMAIN=sessiya.marjagroup.uz bash deploy/fix-ssl.sh
# ════════════════════════════════════════════════════════════════════

set -euo pipefail

DOMAIN="${DOMAIN:-sessiya.marjagroup.uz}"
APP_NAME="${APP_NAME:-marja}"
BOT_PORT="${BOT_PORT:-3500}"
ADMIN_PORT="${ADMIN_PORT:-3501}"

cyan()  { echo -e "\033[36m$*\033[0m"; }
green() { echo -e "\033[32m$*\033[0m"; }
red()   { echo -e "\033[31m$*\033[0m"; }
yellow(){ echo -e "\033[33m$*\033[0m"; }

step() { echo; cyan "━━━ $* ━━━"; }
ok()   { green "  ✓ $*"; }

# 1. Sertifikat mavjudligini tekshirish
step "1. Sertifikat tekshiruvi"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
if [ ! -f "$CERT_DIR/fullchain.pem" ] || [ ! -f "$CERT_DIR/privkey.pem" ]; then
  red "  ✗ Sertifikat topilmadi: $CERT_DIR"
  red "    Avval setup-domain.sh ni ishga tushiring"
  exit 1
fi
ok "Sertifikat: $CERT_DIR"

# 2. Configni qayta yozish
step "2. Nginx configni to'liq SSL bilan qayta yozish"

CONFIG="/etc/nginx/sites-available/${APP_NAME}-admin"
[ -f "$CONFIG" ] && cp "$CONFIG" "${CONFIG}.bak.$(date +%s)"

cat > "$CONFIG" <<NGINXEOF
# marja-payment-bot — admin panel + API
# Avtomatik (fix-ssl.sh): $(date)

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Let's Encrypt renewal validation uchun
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS — asosiy server
# default_server: 443'ga kelgan har qanday SNI-mos kelmagan so'rov
# bizning cert'imizni oladi. SNI bilan kelgan marjagroup.uz so'rovi
# o'z config'iga ketadi (server_name match).
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    http2 on;

    server_name $DOMAIN;

    ssl_certificate     $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Bot API → NestJS (port $BOT_PORT)
    location /api/ {
        proxy_pass http://127.0.0.1:$BOT_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        client_max_body_size 60M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Admin panel → Next.js (port $ADMIN_PORT)
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
ok "Config qayta yozildi"

# Symlink (force — mavjud bo'lsa qayta yaratadi)
LINK="/etc/nginx/sites-enabled/${APP_NAME}-admin"
ln -sf "$CONFIG" "$LINK"
ok "sites-enabled symlink"

# Let's Encrypt qo'shimcha SSL fayllari (certbot tomonidan yaratilgan)
if [ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
  yellow "  → options-ssl-nginx.conf topilmadi, yuklaymiz..."
  curl -fsSL https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/src/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
    -o /etc/letsencrypt/options-ssl-nginx.conf
fi
if [ ! -f /etc/letsencrypt/ssl-dhparams.pem ]; then
  yellow "  → ssl-dhparams.pem yaratilmoqda (1-2 daqiqa)..."
  openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048 2>/dev/null
fi

# 3. Boshqa configlardan default_server'ni olib tashlash (konflikt oldini olish)
step "3. Boshqa default_server'larni topish"

OTHER_DEFAULTS=$(grep -rl "listen.*443.*default_server" /etc/nginx/sites-enabled/ 2>/dev/null | grep -v "${APP_NAME}-admin" || true)
if [ -n "$OTHER_DEFAULTS" ]; then
  for f in $OTHER_DEFAULTS; do
    yellow "  → $f dan default_server olib tashlanmoqda"
    cp "$f" "${f}.bak.$(date +%s)"
    sed -i 's|listen 443 ssl default_server|listen 443 ssl|g' "$f"
    sed -i 's|listen \[::\]:443 ssl default_server|listen [::]:443 ssl|g' "$f"
  done
  ok "Boshqa default_server'lar olib tashlandi"
else
  ok "Boshqa default_server topilmadi"
fi

# 4. Sintaksis tekshirish
step "4. Nginx sintaksis"
if ! nginx -t 2>&1 | tail -3; then
  red "  ✗ Sintaksis xato — backup'dan tiklash kerak"
  exit 1
fi
ok "Sintaksis to'g'ri"

systemctl reload nginx
ok "nginx reload"

# 5. Tekshiruv
step "5. Sertifikat tekshiruvi"
sleep 1

LOCAL_CERT=$(echo | openssl s_client -connect 127.0.0.1:443 -servername "$DOMAIN" 2>/dev/null \
              | openssl x509 -noout -subject 2>/dev/null || echo "FAIL")

echo "  $LOCAL_CERT"

if echo "$LOCAL_CERT" | grep -q "$DOMAIN"; then
  green ""
  green "  ✓✓✓ TUZATILDI — endi to'g'ri sertifikat beryapti!"
  green ""
  cyan "  Brauzer Incognito'da oching:"
  cyan "    https://$DOMAIN"
else
  red "  ✗ Hali ham noto'g'ri — qo'shimcha tekshiruv kerak:"
  red "    nginx -T | grep -A20 sessiya"
fi
