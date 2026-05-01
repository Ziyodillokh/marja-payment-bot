# Course Admin — Frontend

Onlayn kurs sotuvchi botning admin paneli. Backend (NestJS + Prisma) bilan
JWT orqali bog'lanadi. **Linear / Vercel / Notion** uslubidagi minimalistik
dizayn — bo'sh joy ko'p, nozik bordurlar, deyarli oq fon.

## Texnologiyalar

- **Next.js 14+** (App Router, RSC bilan birga)
- **TypeScript** strict
- **Tailwind CSS** + custom design tokens
- **shadcn/ui** style components (Radix UI primitives'lar bilan)
- **TanStack Query** — server state
- **Zustand** — client state
- **React Hook Form + Zod** — formalar va validatsiya
- **Recharts** — chartlar
- **Axios** — HTTP client
- **date-fns** — sana
- **Lucide React** — iconlar
- **Sonner** — toast notification
- **next-themes** — light/dark

## Tayyor sahifalar

| Sahifa                       | Holat       |
|------------------------------|-------------|
| `/login`                     | ✅ to'liq    |
| `/dashboard`                 | ✅ to'liq    |
| `/users` + `/users/[id]`     | ✅ to'liq    |
| `/payments` + `/payments/[id]` | ✅ to'liq (approve/reject dialog bilan) |
| `/content`                   | ✅ to'liq (welcome video upload, text, karta, narx, kanal) |
| `/broadcasts`                | ✅ ro'yxat + yangi yaratish (live preview bilan) |
| `/auto-messages`             | ✅ ro'yxat + toggle/delete |
| `/auto-messages/[id]`        | 🚧 forma keyingi versiyada |
| `/statistics`                | ✅ asosiy ko'rsatkichlar |
| `/settings`                  | ✅ parol o'zgartirish + tema |

## O'rnatish

### 1. Bog'lamlar

```bash
cd admin-panel
npm install
```

### 2. Environment

```bash
cp .env.local.example .env.local
```

`.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 3. Backend ishlamoqda bo'lsin

`../` papkasidagi NestJS bot/backend serverini ishga tushiring (port 3000).

### 4. Dev server

```bash
npm run dev
```

http://localhost:3001 (yoki `next` belgilagan portda) ochiladi.

Default admin: `admin / admin123` (backend seed orqali).

## Loyiha strukturasi

```
src/
├── app/
│   ├── layout.tsx                 # Root layout (Providers + fontlar)
│   ├── page.tsx                   # → /dashboard ga redirect
│   ├── globals.css                # Design tokens (CSS variables)
│   ├── login/page.tsx             # Login sahifa
│   └── (dashboard)/               # Auth-protected route group
│       ├── layout.tsx             # Sidebar + Header layout
│       ├── dashboard/page.tsx
│       ├── users/page.tsx + [id]
│       ├── payments/page.tsx + [id]
│       ├── broadcasts/page.tsx + new/
│       ├── auto-messages/page.tsx + [id]
│       ├── content/page.tsx
│       ├── statistics/page.tsx
│       └── settings/page.tsx
├── components/
│   ├── ui/                        # shadcn-style primitives
│   ├── layout/                    # Sidebar, Header
│   ├── shared/                    # DataTable, StatusBadge, ...
│   ├── dashboard/                 # StatCard + chartlar
│   ├── payments/                  # PaymentActionDialog
│   ├── content/                   # SettingSection
│   └── providers/                 # QueryProvider, ThemeProvider
├── lib/
│   ├── api.ts                     # Axios + endpointlar
│   ├── auth.ts                    # Token storage (localStorage + cookie)
│   ├── utils.ts                   # cn(), formatPrice, getInitials, ...
│   └── queries/                   # TanStack Query hooks
├── stores/auth.store.ts           # Zustand
├── types/index.ts                 # Backend bilan mos types
└── middleware.ts                  # Cookie-based auth redirect
```

## Dizayn falsafasi

- **Ranglar**: deyarli qora (#111827) accent, juda nozik border (#E5E7EB), ozgina kulrang fon (#FAFAFA).
- **Tipografiya**: Inter (UI), JetBrains Mono (raqam/ID/file_id).
  Sarlavhalar `tracking-tighter` + `font-semibold` (700 emas).
- **Bo'sh joy**: card padding 24px, hover faqat 60% alpha bg-subtle.
- **Animatsiyalar**: 150ms ease-out, active scale-[0.98]. Boshqa hech narsa.
- **Skeleton**: shimmer animation muddat davomida.
- **Empty states**: hech qachon bo'sh sahifa qoldirmaydi.

## Auth flow

1. `/login` → `POST /api/auth/login` → token olish.
2. Token localStorage va cookie ga yoziladi.
3. Cookie ni `middleware.ts` o'qiydi va `/login` dan tashqari hamma yo'lni
   himoya qiladi.
4. Axios interceptor har bir requestga `Authorization: Bearer {token}` qo'shadi.
5. 401 javobida → `/login?expired=1` ga redirect.

## Build

```bash
npm run build
npm run start
```
