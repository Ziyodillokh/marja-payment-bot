#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
#  SSL diagnostika + avtomatik fix
# ════════════════════════════════════════════════════════════════════
#
#  ERR_CERT_COMMON_NAME_INVALID xatosini tuzatish.
#
#  Sabablar:
#    1. Cloudflare proxy ON (orange cloud) — Cloudflare cert serve qilyapti
#    2. nginx'da default server'da boshqa cert
#    3. Bizning config'imiz xato
#
#  Foydalanish:
#    DOMAIN=sessiya.marjagroup.uz bash deploy/diagnose-ssl.sh
# ════════════════════════════════════════════════════════════════════

set -euo pipefail

DOMAIN="${DOMAIN:-sessiya.marjagroup.uz}"

cyan()  { echo -e "\033[36m$*\033[0m"; }
green() { echo -e "\033[32m$*\033[0m"; }
red()   { echo -e "\033[31m$*\033[0m"; }
yellow(){ echo -e "\033[33m$*\033[0m"; }

step() { echo; cyan "━━━ $* ━━━"; }
ok()   { green "  ✓ $*"; }
warn() { yellow "  ⚠ $*"; }

# ──────────── 1. SERVER'DAN TEKSHIRISH ────────────

step "1. Lokal nginx tekshiruvi"
echo "  Bizning nginx haqiqatan to'g'ri sertifikatni serve qilyaptimi?"
echo

LOCAL_CERT=$(echo | openssl s_client -connect 127.0.0.1:443 -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -subject -issuer 2>/dev/null || echo "FAIL")

if [ "$LOCAL_CERT" = "FAIL" ]; then
  red "  ✗ Server lokalda HTTPS javob bermayapti"
else
  echo "  Server'dan kelgan sertifikat:"
  echo "$LOCAL_CERT" | sed 's/^/    /'

  if echo "$LOCAL_CERT" | grep -q "$DOMAIN"; then
    ok "Lokal nginx TO'G'RI sertifikatni serve qilyapti"
  else
    red "  ✗ Lokal nginx NOTO'G'RI sertifikat bermoqda"
  fi
fi

# ──────────── 2. TASHQI TEKSHIRUV ────────────

step "2. Tashqaridan tekshiruv (DNS orqali)"

EXT_CERT=$(echo | openssl s_client -connect "$DOMAIN":443 -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -subject -issuer 2>/dev/null || echo "FAIL")

if [ "$EXT_CERT" = "FAIL" ]; then
  red "  ✗ $DOMAIN tashqaridan ulanmadi"
else
  echo "  Tashqaridan kelgan sertifikat:"
  echo "$EXT_CERT" | sed 's/^/    /'

  if echo "$EXT_CERT" | grep -qi "cloudflare"; then
    warn "CLOUDFLARE PROXY ON — orange cloud yoqilgan!"
    echo
    echo "  Yechim:"
    echo "  Variant A) Cloudflare dashboard → DNS → orange cloud → kulrang qiling (DNS only)"
    echo "  Variant B) Cloudflare → SSL/TLS → Overview → 'Full' yoki 'Full (strict)' qiling"
  elif echo "$EXT_CERT" | grep -q "$DOMAIN"; then
    ok "Tashqaridan ham TO'G'RI sertifikat keladi"
  else
    red "  ✗ Tashqari boshqa cert beryapti — proxy/CDN bo'lishi mumkin"
  fi
fi

# ──────────── 3. NGINX SERVER BLOCK'LAR ────────────

step "3. nginx server bloklari"

echo "  443 portda tinglovchi configlar:"
grep -rl "listen.*443" /etc/nginx/sites-enabled/ 2>/dev/null | sed 's/^/    /'

echo
echo "  Bizning config (marja-admin):"
if [ -f /etc/nginx/sites-enabled/marja-admin ]; then
  grep -E "listen|server_name|ssl_certificate" /etc/nginx/sites-enabled/marja-admin | sed 's/^/    /'
else
  red "  ✗ Bizning config topilmadi!"
fi

# ──────────── 4. DEFAULT SERVER MUAMMOSI ────────────

step "4. default_server konflikti tekshiruvi"

DEFAULT_SSL=$(grep -rl "listen.*443.*default_server" /etc/nginx/sites-enabled/ 2>/dev/null | grep -v marja-admin || echo "")

if [ -n "$DEFAULT_SSL" ]; then
  warn "Boshqa configda 'default_server' 443 portda:"
  echo "$DEFAULT_SSL" | sed 's/^/    /'
  echo
  echo "  Bu config Server Name Indication (SNI) ishlamaganda javob beradi."
  echo "  Yechim: bizning config'ga ham default_server qo'shish kerak."
else
  ok "Boshqa default_server topilmadi"
fi

# ──────────── 5. AVTOMATIK FIX ────────────

step "5. Avtomatik fix (agar lokal cert to'g'ri bo'lsa)"

if [ -f /etc/nginx/sites-enabled/marja-admin ] && \
   echo "$LOCAL_CERT" | grep -q "$DOMAIN"; then
  ok "Lokal cert to'g'ri — fix kerak emas (muammo CDN tarafda)"
else
  warn "Bizning config'ni majburlab default_server qilamiz..."

  CONFIG=/etc/nginx/sites-enabled/marja-admin

  # Backup
  cp "$CONFIG" "${CONFIG}.bak.$(date +%s)"

  # 443 listen'ga default_server qo'shish (faqat birinchi marta)
  if ! grep -q "listen.*443.*default_server" "$CONFIG"; then
    sed -i 's|listen 443 ssl;|listen 443 ssl default_server;|' "$CONFIG"
    sed -i 's|listen \[::\]:443 ssl ipv6only=on;|listen [::]:443 ssl default_server ipv6only=on;|' "$CONFIG"
    ok "default_server qo'shildi"
  fi

  # Boshqa default_server'larni o'chiramiz (faqat 443'da)
  for f in $(grep -rl "listen.*443.*default_server" /etc/nginx/sites-enabled/ 2>/dev/null | grep -v marja-admin); do
    yellow "  → $f dan default_server olib tashlanmoqda"
    sed -i 's|listen 443 ssl default_server|listen 443 ssl|g' "$f"
    sed -i 's|listen \[::\]:443 ssl default_server|listen [::]:443 ssl|g' "$f"
  done

  # Sintaksis tekshirish
  if nginx -t 2>&1 | tail -2; then
    systemctl reload nginx
    ok "nginx reload qilindi"
  else
    red "nginx config xato — backup'dan tiklang"
  fi
fi

# ──────────── 6. XULOSA ────────────

step "Xulosa"

echo "  Brauzer cache'sini tozalang yoki Incognito'da oching:"
echo "    https://$DOMAIN"
echo
echo "  Agar xato davom etsa:"
echo "    1. DNS'da Cloudflare proxy yoqilganligini tekshiring (orange → grey)"
echo "    2. Yoki Cloudflare → SSL/TLS → 'Full (strict)'"
echo "    3. Brauzer cache: Ctrl+Shift+Delete → SSL cache'ni tozalang"
echo
echo "  Test:"
echo "    curl -vI https://$DOMAIN 2>&1 | grep -E 'subject|issuer'"
