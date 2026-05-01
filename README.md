# CourseBot — Onlayn kurs sotuvchi Telegram bot

Production-ready NestJS + grammY + Prisma + BullMQ asosida qurilgan onlayn kurs sotish boti.
Foydalanuvchidan telefon va to'lov chekini qabul qiladi, admin tasdiqlagandan keyin yopiq
Telegram kanalga avtomatik qo'shadi. Bot keyinchalik yaratiladigan admin panel bilan
**bir xil backend** va **bir xil PostgreSQL DB** ishlatadi.

## Texnologiyalar

- **Node.js (LTS)** + **TypeScript** (strict)
- **NestJS** — modulli arxitektura
- **grammY** — Telegram bot framework
- **Prisma** ORM + **PostgreSQL**
- **Redis** + **BullMQ** — broadcast queue va auto-message cron
- **JWT + bcrypt** — admin panel auth
- **class-validator** + **class-transformer** — DTO validatsiya

## Loyiha strukturasi

```
src/
├── main.ts                  # NestJS bootstrap
├── app.module.ts            # Root module
├── prisma/                  # PrismaService
├── bot/                     # grammY bot, handlerlar, keyboard'lar, middleware
├── users/                   # Users domain service
├── payments/                # Payments domain service
├── settings/                # Settings KV service
├── broadcast/               # Mass message + BullMQ processor
├── auto-messages/           # Cron-style xabarlar + processor
├── api/                     # REST API (admin panel uchun)
│   ├── auth/                # JWT login + guards
│   ├── users/
│   ├── payments/
│   ├── settings/
│   ├── broadcasts/
│   ├── auto-messages/
│   ├── dashboard/
│   └── admin/
└── common/                  # Enums, guards, decorators, utils
prisma/
├── schema.prisma
└── seed.ts
```

## O'rnatish

### 1. Talablar

- Node.js 20+ (LTS)
- Docker + Docker Compose (PostgreSQL + Redis uchun)
- Telegram bot token ([@BotFather](https://t.me/BotFather))

### 2. Bog'lamlarni o'rnatish

```bash
npm install
```

### 3. .env faylini sozlash

```bash
cp .env.example .env
```

`.env` ichidagi qiymatlarni to'ldiring:
- `BOT_TOKEN` — BotFather'dan olgan token
- `BOT_USERNAME` — bot username (`@`siz)
- `STORAGE_CHAT_ID` — bot a'zo bo'lgan privat kanal/guruh (file_id olish uchun)
- `JWT_SECRET` — kuchli random string

### 4. Postgres va Redis'ni ishga tushirish

```bash
docker-compose up -d
```

### 5. Migration va seed

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

Seed default admin (`admin / admin123`) va default settings'larni yaratadi.

### 6. Botni ishga tushirish

```bash
# development (long polling)
npm run start:dev

# production
npm run build
npm run start:prod
```

### 7. Telegram'da sozlash

Bot ishga tushgandan keyin:
1. Bot'ni admin guruhga qo'shing va admin qiling.
2. Bot'ni yopiq kanalga qo'shing va admin qiling (foydalanuvchilarni qo'sha olishi uchun).
3. Admin paneldan (yoki bevosita DB'da) `Setting`'larni to'ldiring:
   - `admin_group_id` — chek tushadigan guruh chat_id (`-100...`)
   - `channel_id` — yopiq kanal chat_id (`-100...`)
   - `channel_invite_link` — kanalning umumiy invite linki (zaxira uchun)
   - `card_number`, `card_holder`, `course_price`
   - `welcome_text`, `welcome_video_file_id`

## Foydali komandalar

```bash
npm run start:dev          # watch mode
npm run prisma:studio      # Prisma Studio (DB GUI)
npm run prisma:migrate     # yangi migration
npm run db:reset           # DB ni reset qilib seed
```

## Gamifikatsiya

Bot foydalanuvchilarni jalb qilish va ishtirokini rag'batlantirish uchun ball
tizimi bilan jihozlangan.

### Ballar nima uchun beriladi

| Aksiya | Ball | Trigger |
|---|---|---|
| Referral start bossa | +10 | Referrer'ga, faqat YANGI user uchun |
| Referral kursni sotib olsa (APPROVED) | +50 | Referrer'ga, idempotent |
| Diskussiya guruhida izoh yozsa | +10 | Min uzunlik va kuniga limit bilan |
| Diskussiya guruhida reaksiya bossa | +10 | (user, message) bo'yicha umrida 1 marta |

Ball qiymatlari va anti-spam parametrlari `Setting` jadvalida — admin
panel orqali real vaqtda o'zgartiriladi:

- `points_per_referral_start`, `points_per_referral_purchase`
- `points_per_comment`, `points_per_reaction`
- `min_comment_length`, `max_comments_per_day`
- `gamification_enabled` — `false` bo'lsa, hech qanday ball berilmaydi
- `discussion_group_id` — diskussiya guruhi chat_id

### Bot komandalari

```
/start ref_<userId>    — referral linki orqali kirish
/balance, /points      — balans, reyting, referral linkim
/top, /leaderboard     — TOP-10 reyting + sizning o'rningiz
/referral              — referral linki + statistika
```

### Telegram'da sozlash

1. **BotFather**:
   - `/setprivacy` → Disable (yoki bot guruhda admin bo'lsa shart emas)
2. **Diskussiya guruhi**:
   - Yopiq kanalga discussion guruh ulang.
   - Bot'ni guruhga qo'shing va admin qiling.
   - `Setting.discussion_group_id` ga guruh chat_id'ni yozing.
3. **Reaksiyalar**: Bot Telegram Bot API 7.0+ bilan ishlaydi (grammY ≥ 1.20),
   `allowed_updates` ga `message_reaction` avtomatik qo'shilgan.

### Anti-fraud

- O'z-o'ziga referral qila olmaydi (telegramId solishtir).
- Referral faqat **yangi** foydalanuvchi uchun (mavjud user qayta `/start`
  bossa, `ref_` parametri e'tiborsiz qoladi).
- `REFERRAL_PURCHASE` PostgreSQL unique constraint orqali idempotent
  (`(userId, type, relatedUserId)`).
- Comment uchun min uzunlik va kuniga limit.
- Reaksiya uchun `(userId, chatId, messageId)` unique — toggle spam'ni
  oldini oladi (ball qaytarilmaydi).

### Yangi API endpointlar

| Method | Path | Tavsifi |
|---|---|---|
| GET | `/api/leaderboard?limit=100` | Top foydalanuvchilar |
| GET | `/api/users/:id/points-history?type=&page=&limit=` | Ball tarixi |
| GET | `/api/users/:id/referrals` | Foydalanuvchi jalb qilganlar |
| POST | `/api/users/:id/adjust-points` | `{ amount, reason }` — admin qo'lda |
| GET | `/api/referrals/top?limit=20` | Eng faol referrerlar |
| GET | `/api/gamification/stats?from=&to=` | Umumiy gamifikatsiya stats |

### Migration

```bash
npm run prisma:migrate -- --name add_gamification
npm run prisma:seed   # yangi default settings
```

## Webhook rejimi

Productionda webhook ishlatish uchun `.env`:

```env
BOT_MODE=webhook
BOT_WEBHOOK_URL=https://example.com/bot/webhook
BOT_WEBHOOK_SECRET=some-strong-random-string
```

## API endpointlari

Barcha `/api/*` endpointlar JWT bilan himoyalangan (login bundan mustasno).

```
POST   /api/auth/login
GET    /api/users
GET    /api/users/:id
GET    /api/users/stats
GET    /api/payments
GET    /api/payments/:id
POST   /api/payments/:id/approve
POST   /api/payments/:id/reject
GET    /api/payments/stats
GET    /api/settings
PUT    /api/settings/:key
POST   /api/settings/upload-video
GET    /api/broadcasts
POST   /api/broadcasts
GET    /api/broadcasts/:id
DELETE /api/broadcasts/:id
GET    /api/auto-messages
POST   /api/auto-messages
PUT    /api/auto-messages/:id
DELETE /api/auto-messages/:id
GET    /api/dashboard/stats
PUT    /api/admin/me/password
```

# marja-payment-bot
