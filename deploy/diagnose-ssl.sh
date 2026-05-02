#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
#  SSL diagnostika + avtomatik fix v2
# ════════════════════════════════════════════════════════════════════
#
#  ERR_CERT_COMMON_NAME_INVALID xatosini tuzatish.
#  Boshqa loyiha (marjagroup.uz) sessiya subdomeniga javob beryapti.
#
#  Foydalanish:
#    DOMAIN=sessiya.marjagroup.uz bash deploy/diagnose-ssl.sh
# ════════════════════════════════════════════════════════════════════

# IMPORTANT: set -e YO'Q — diagnostika davomida grep bo'sh bo'lsa ham davom etsin
set -uo pipefail

DOMAIN="${DOMAIN:-sessiya.marjagroup.uz}"

cyan()  { echo -e "\033[36m$*\033[0m"; }
green() { echo -e "\033[32m$*\033[0m"; }
red()   { echo -e "\033[31m$*\033[0m"; }
yellow(){ echo -e "\033[33m$*\033[0m"; }

step() { echo; cyan "━━━ $* ━━━"; }
ok()   { green "  ✓ $*"; }
warn() { yellow "  ⚠ $*"; }

# ──────────── 1. CERT TEKSHIRISH ────────────

step "1. Sertifikat tekshiruvi"
echo "  Server lokal nginx'idan:"

LOCAL_CERT=$(echo | openssl s_client -connect 127.0.0.1:443 -servername "$DOMAIN" 2>/dev/null \
              | openssl x509 -noout -subject -issuer 2>/dev/null || echo "FAIL")

if [ "$LOCAL_CERT" = "FAIL" ]; then
  red "  ✗ HTTPS javob bermayapti"
else
  echo "$LOCAL_CERT" | sed 's/^/    /'
  if echo "$LOCAL_CERT" | grep -q "$DOMAIN"; then
    ok "TO'G'RI sertifikat"
    NGINX_CORRECT=true
  else
    red "  ✗ NOTO'G'RI sertifikat — boshqa server block javob beryapti"
    NGINX_CORRECT=false
  fi
fi

# ──────────── 2. BARCHA SERVER BLOK'LAR ────────────

step "2. Barcha nginx server bloklari (server_name + listen)"

# nginx -T butun config'ni dumps qiladi (include'lar bilan)
echo
echo "  Quyidagi config fayllarda 'sessiya' yoki 'marjagroup' uchraydigan joylar:"
nginx -T 2>/dev/null | awk '
  /# configuration file/ { file=$NF; sub(/:$/,"",file) }
  /server_name/ {
    if (match($0, /server_name[[:space:]]+([^;]+);/, arr)) {
      print "    [" file "]"
      print "      server_name: " arr[1]
    }
  }
  /listen/ {
    if (match($0, /listen[[:space:]]+([^;]+);/, arr)) {
      print "      listen: " arr[1]
    }
  }
' | head -60

# ──────────── 3. BIZNING CONFIG MAVJUDLIGI ────────────

step "3. Bizning marja-admin config tekshiruvi"

OUR_CONFIG="/etc/nginx/sites-enabled/marja-admin"

if [ -f "$OUR_CONFIG" ]; then
  ok "Mavjud: $OUR_CONFIG"
  echo
  echo "  Tarkibi (faqat muhim qatorlar):"
  grep -E "^[[:space:]]*(listen|server_name|ssl_certificate)" "$OUR_CONFIG" | sed 's/^/    /'
else
  red "  ✗ $OUR_CONFIG topilmadi!"
  red "  setup-domain.sh ni qaytadan ishga tushiring"
  exit 1
fi

# ──────────── 4. KONFLIKT TEKSHIRUVI ────────────

step "4. Konflikt qiladigan server bloklarni topish"

echo "  marjagroup.uz uchun config'lar (boshqa loyihangiz):"
CONFLICTING=$(nginx -T 2>/dev/null | grep -B5 "server_name.*marjagroup\.uz" \
              | grep "configuration file" | awk '{print $NF}' | sed 's/:$//' \
              | grep -v marja-admin | sort -u)

if [ -n "$CONFLICTING" ]; then
  echo "$CONFLICTING" | sed 's/^/    /'

  echo
  echo "  default_server'lar:"
  nginx -T 2>/dev/null | grep -B3 "listen.*default_server" \
    | grep "configuration file" | awk '{print $NF}' | sed 's/:$//' \
    | sort -u | sed 's/^/    /'
else
  yellow "  Konflikt config topilmadi (marjagroup.uz alohida joyda)"
fi

# ──────────── 5. AVTOMATIK FIX ────────────

step "5. Avtomatik fix"

# Yechim: bizning configga http2 + default_server qo'shamiz
# Shunda IP-darajadagi default block o'rniga bizniki ishga tushadi.

cp "$OUR_CONFIG" "${OUR_CONFIG}.bak.$(date +%s)"
yellow "  → Backup: ${OUR_CONFIG}.bak.*"

# `listen 443 ssl;` → `listen 443 ssl default_server;` (bitta marta)
# Faqat hali default_server qo'shilmagan bo'lsa
if ! grep -q "listen.*443.*default_server" "$OUR_CONFIG"; then
  sed -i 's|^\([[:space:]]*\)listen 443 ssl;|\1listen 443 ssl default_server;|' "$OUR_CONFIG"
  sed -i 's|^\([[:space:]]*\)listen \[::\]:443 ssl ipv6only=on;|\1listen [::]:443 ssl default_server ipv6only=on;|' "$OUR_CONFIG"
  ok "default_server qo'shildi (443'da bizning config birinchi javob beradi)"
fi

# Boshqa configlardan default_server'ni olib tashlamaymiz — boshqa loyihaga halaqit beradi.
# Faqat bizniki qo'shamiz. SNI orqali to'g'ri match bo'lsa ishlaydi.

# Sintaksis tekshirish
if nginx -t 2>&1 | grep -q "syntax is ok"; then
  systemctl reload nginx
  ok "nginx reload qilindi"
else
  red "  ✗ nginx config xato — backup'dan tiklang:"
  red "      cp ${OUR_CONFIG}.bak.* $OUR_CONFIG"
  nginx -t
  exit 1
fi

# ──────────── 6. QAYTA TEKSHIRUV ────────────

step "6. Fix natijasi"

NEW_CERT=$(echo | openssl s_client -connect 127.0.0.1:443 -servername "$DOMAIN" 2>/dev/null \
            | openssl x509 -noout -subject 2>/dev/null || echo "FAIL")

if echo "$NEW_CERT" | grep -q "$DOMAIN"; then
  green "  ✓ Endi nginx TO'G'RI sertifikat beryapti!"
  green "    $NEW_CERT"
else
  red "  ✗ Hali ham noto'g'ri:"
  red "    $NEW_CERT"
  echo
  echo "  Qo'shimcha qadamlar:"
  echo "  1. Brauzer cache tozalang yoki Incognito'da oching:"
  echo "       https://$DOMAIN"
  echo "  2. SNI ishlatmaydigan eski client (curl)'da tekshiring:"
  echo "       curl -vI --resolve $DOMAIN:443:127.0.0.1 https://$DOMAIN"
fi

echo
yellow "🌐 Brauzer cache (CHROME):"
echo "    chrome://net-internals/#sockets → Flush socket pools"
echo "    yoki Ctrl+Shift+N (Incognito) — toza sessiya"
