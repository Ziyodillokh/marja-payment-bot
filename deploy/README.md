# Deploy → Production server

Mavjud katta loyihaga teng bo'lgan server'ga **xavfsiz**, **izolatsiyalangan**
deploy. Hech narsa boshqa loyihaga halaqit bermaydi.

## Izolatsiya strategiyasi

| Resurs | Qiymat | Izoh |
|---|---|---|
| 📁 Papka | `/opt/marja-bot/` | Sizning `/var/www/`, `/srv/` ga teging |
| 🐘 Postgres | Docker konteyner `marja-postgres`, port `15432` | Tizim postgres'ga teging, faqat `127.0.0.1` ga bog'langan |
| 🔴 Redis | Docker konteyner `marja-redis`, port `16379` | Faqat lokal |
| 🤖 Bot | PM2 nomi `marja-bot`, port `3500` | Polling mode (nginx kerak emas) |
| 🎨 Admin | PM2 nomi `marja-admin`, port `3501` | `http://IP:3501` orqali kirish |

Hech qanday tizim servis o'zgartirilmaydi (nginx, postgres, vb).

---

## 🌐 Domen + SSL ulash (deploy'dan keyin)

`deploy-server.sh`'dan SO'NG, domen ulash uchun:

### Variant A — PowerShell (bir komanda)

```powershell
cd C:\Users\user\Desktop\yangibot!\deploy
.\setup-domain.ps1 -Domain "sessiya.marjagroup.uz" -Email "you@example.com"
```

### Variant B — Server ichida

```bash
ssh root@62.171.184.14
git -C /opt/marja-bot pull   # eng so'nggi skriptlar uchun
DOMAIN=sessiya.marjagroup.uz EMAIL=you@example.com \
  bash /opt/marja-bot/deploy/setup-domain.sh
```

⚠️ **Avval DNS sozlang**: `sessiya.marjagroup.uz` → A record → `62.171.184.14`

Skript:
1. nginx + certbot o'rnatadi (yo'q bo'lsa)
2. Faqat sizning domeniz uchun config (`/etc/nginx/sites-available/marja-admin`) — boshqa saytlarga teng emas
3. Let's Encrypt SSL (`certbot --nginx`, avtomatik renewal)
4. Admin panelni `NEXT_PUBLIC_API_URL=https://DOMAIN/api` bilan rebuild
5. nginx reverse proxy: `/` → admin (3501), `/api/*` → bot (3500)

Tugagach: **`https://sessiya.marjagroup.uz`** ochiladi.

---

## Variant 1 — Bir komanda (eng oson) 🚀

PowerShell'ni **Administrator** sifatida oching, loyiha papkasiga o'ting:

```powershell
cd C:\Users\user\Desktop\yangibot!\deploy
.\one-shot-deploy.ps1
```

Skript so'raydi:
- Server paroli (SSH va SCP uchun)
- Bot token (BotFather'dan)
- Storage chat ID (ixtiyoriy)

Va o'zi:
1. `deploy-server.sh` ni serverga yuklaydi
2. SSH orqali ishga tushiradi
3. Hammasini avtomatik qiladi

**Tugagandan keyin**: http://IP:3501 → login `admin / admin123`

---

## Variant 2 — Qo'lda 3 ta komandada

### A. SCP — skriptni serverga yuklash

```powershell
# Windows PowerShell yoki bash
cd C:\Users\user\Desktop\yangibot!\deploy
scp deploy-server.sh root@62.171.184.14:/tmp/
```

(Server paroli so'raladi)

### B. SSH

```powershell
ssh root@62.171.184.14
```

### C. Server ichida ishga tushirish

```bash
# Bot token va boshqa qiymatlarni env sifatida bering:
export BOT_TOKEN='8069821457:AAEo4QrcItU-9XUWNfvFCVGptg3PjxY8YZE'
export BOT_USERNAME='marja_sessiyabot'
export STORAGE_CHAT_ID=''   # ixtiyoriy

# Deploy
bash /tmp/deploy-server.sh
```

Skript barcha bosqichlarni ko'rsatib turadi:
1. Server tekshirish (port band emasmi)
2. Node 20 + Docker + PM2 o'rnatish (yo'q bo'lsa)
3. Repo klon qilish
4. `.env` yaratish
5. Postgres + Redis konteynerlari
6. Bot build + PM2 start
7. Admin panel build + PM2 start
8. PM2 startup (reboot bo'lganda avtomatik ishga tushadi)

Tugagach: **`http://62.171.184.14:3501`** ga kirib login qiling.

---

## Yangilash (re-deploy)

Kodni yangilash uchun — qaytadan shu skriptni ishga tushiring:

```bash
ssh root@62.171.184.14
bash /opt/marja-bot/deploy/deploy-server.sh
# yoki tezroq:
cd /opt/marja-bot && git pull && npm ci && npm run build && cd admin-panel && npm ci && npm run build && cd .. && pm2 restart all
```

`.env` saqlanib qoladi (qayta yaratilmaydi).

---

## Server ichida foydali komandalar

```bash
pm2 list                       # ikkala servis holati
pm2 logs marja-bot             # bot loglari
pm2 logs marja-admin           # admin panel loglari
pm2 monit                      # real-time monitor
pm2 restart marja-bot          # qayta ishga tushirish
pm2 restart marja-admin

docker ps | grep marja         # konteynerlar
docker logs marja-postgres
docker logs marja-redis

cd /opt/marja-bot
nano .env                      # konfiguratsiya o'zgartirish
pm2 restart all                # o'zgarishlardan keyin

# DB ga to'g'ridan-to'g'ri kirish
docker exec -it marja-postgres psql -U marja -d marja_bot
```

---

## To'liq olib tashlash (rollback)

Agar deploy noto'g'ri ketsa va hammasini olib tashlash kerak bo'lsa:

```bash
pm2 delete marja-bot marja-admin
pm2 save

cd /opt/marja-bot
docker compose -f docker-compose.prod.yml down -v   # konteyner + ma'lumotlar

cd /
rm -rf /opt/marja-bot
```

Boshqa hech qanday tizim resursi (nginx, host postgres) tegmaydi.

---

## Telegram tomondagi sozlash

Deploy tugagach (yoki `.env`'da BOT_TOKEN'ni to'g'rilangan bo'lsa):

1. **Bot**: BotFather → `/setprivacy` → **Disable** (diskussiya guruhi uchun)
2. **Yopiq kanal**: bot'ni admin qiling
3. **Admin guruh** (cheklar tushadi): bot admin
4. **Diskussiya guruhi** (izoh/reaksiya ballari uchun): bot admin
5. Admin panel → **Kontent** → barcha settings'ni to'ldiring (kanal_id, admin_group_id, va h.k.)

---

## Webhook rejimiga o'tish (kelajakda)

Hozirgi deploy **polling mode**'da (nginx kerak emas). Productionda webhook
ishonchliroq:

```bash
# 1. Domen → IP'ni serverga DNS qiling: bot.example.com
# 2. nginx reverse proxy'ni o'zingiz qo'shing (boshqa loyihangizdagiga teng)
# 3. .env ni yangilang:
nano /opt/marja-bot/.env
# BOT_MODE=webhook
# BOT_WEBHOOK_URL=https://bot.example.com/bot/webhook
# BOT_WEBHOOK_SECRET=<random_string>
pm2 restart marja-bot
```

---

## Xavfsizlik checklist

- [ ] `.env` huquqlari `chmod 600` (avtomatik o'rnatildi)
- [ ] Default admin paroli o'zgartirildi (`admin / admin123` → kuchli parol)
- [ ] Bot token productionda alohida (test bot'ning tokenini ishlatmang)
- [ ] DB paroli random (avtomatik generatsiya qilindi)
- [ ] JWT_SECRET random (avtomatik)
- [ ] Postgres/Redis faqat `127.0.0.1` (firewall rules-ga ehtiyoj yo'q)
- [ ] Server SSH paroli o'zgartirildi (yoki SSH key bilan almashtirildi)
