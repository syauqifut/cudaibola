# Struktur folder — Aplikasi Prediksi Bola

Prinsip utama: Next.js dipakai sebagai **runtime**, bukan sebagai tempat nulis business logic.
Folder `lib/server/` isinya kode backend murni (tidak ada JSX, tidak import React) — jadi kalau besok
mau dipisah jadi service sendiri, tinggal "angkat" folder itu, ganti pintu masuknya saja.

```
prediksi-bola/
├── app/                              # Routing & UI (Next.js App Router)
│   ├── (public)/
│   │   ├── page.tsx                  # Halaman utama: match list grouped by competition
│   │   └── leaderboard/
│   │       └── page.tsx
│   │
│   ├── match/
│   │   └── [matchId]/
│   │       └── page.tsx              # Detail match + form submit prediksi
│   │
│   ├── api/                          # "Pintu masuk" tipis ke lib/server
│   │   ├── matches/
│   │   │   └── route.ts              # GET /api/matches -> panggil lib/server/matches
│   │   ├── predictions/
│   │   │   └── route.ts              # POST /api/predictions -> panggil lib/server/predictions
│   │   └── cron/
│   │       └── sync-matches/
│   │           └── route.ts          # Dipanggil scheduler, panggil lib/server/sync
│   │
│   ├── layout.tsx
│   └── globals.css
│
├── lib/
│   ├── server/                       # ===== BACKEND MURNI, no React/JSX di sini =====
│   │   ├── matches/
│   │   │   ├── service.ts            # getTodayMatches(), getMatchById() — business logic
│   │   │   ├── repository.ts         # query Prisma/Drizzle ke tabel matches
│   │   │   └── grouping.ts           # logic groupBy competition + sorting (live > liga > waktu)
│   │   │
│   │   ├── predictions/
│   │   │   ├── service.ts            # submitPrediction() — validasi deadline, simpan poin
│   │   │   ├── repository.ts         # query ke tabel predictions
│   │   │   └── scoring.ts            # hitung poin: exact score, hasil benar, salah
│   │   │
│   │   ├── leaderboard/
│   │   │   ├── service.ts            # getLeaderboard()
│   │   │   └── repository.ts
│   │   │
│   │   ├── sync/
│   │   │   ├── service.ts            # syncMatchesFromProvider() — dipanggil cron
│   │   │   └── highlightly-client.ts  # wrapper fetch ke Highlightly Football API
│   │   │
│   │   └── auth/
│   │       └── session.ts            # helper ambil current user di server
│   │
│   ├── db/
│   │   ├── schema.ts                  # Drizzle schema (atau schema.prisma kalau pakai Prisma)
│   │   └── client.ts                   # koneksi database (singleton)
│   │
│   └── shared/
│       ├── types.ts                   # tipe yang dipakai FE & BE (Match, Prediction, dst)
│       └── constants.ts               # SCORING_RULES, COMPETITION_PRIORITY, dst
│
├── components/                        # ===== FRONTEND MURNI =====
│   ├── match-list/
│   │   ├── CompetitionGroup.tsx
│   │   ├── MatchCard.tsx
│   │   └── LiveBadge.tsx
│   ├── prediction/
│   │   ├── PredictionForm.tsx
│   │   └── PointsSummary.tsx
│   └── ui/                            # button, card, dst (kalau pakai shadcn/ui taruh sini)
│
├── drizzle/                            # migration files (kalau pakai Drizzle)
├── .env.local
├── next.config.ts
└── package.json
```

## Kenapa dipisah begini

- **`lib/server/*/service.ts`** — ini "otak" backend kamu. Isinya function biasa (async function,
  bukan React). Bisa di-unit-test tanpa perlu spin up Next.js server sama sekali
  (`import { submitPrediction } from '@/lib/server/predictions/service'` lalu test langsung).

- **`lib/server/*/repository.ts`** — satu-satunya layer yang nyentuh database. Kalau besok ganti
  Prisma ke Drizzle (atau sebaliknya), cuma file-file ini yang berubah, service.ts tetap sama.

- **`app/api/.../route.ts`** — sengaja dibuat SUPER tipis. Isinya cuma: parse request, panggil
  service, return response. Contoh isi `app/api/predictions/route.ts`:

  ```ts
  import { submitPrediction } from '@/lib/server/predictions/service';

  export async function POST(req: Request) {
    const body = await req.json();
    const result = await submitPrediction(body);
    return Response.json(result);
  }
  ```

  Kalau suatu saat kamu BENERAN mau pisah jadi backend sendiri (Express/Nest/Hono), kamu tinggal:
  1. Copy folder `lib/server/` ke project baru
  2. Bikin controller baru yang manggil function yang sama
  3. FE Next.js kamu tinggal ganti base URL fetch-nya

  Effort pindahnya kecil karena logic-nya dari awal sudah independen dari Next.js.

- **`components/`** — murni UI, tidak pernah import dari `lib/server/` langsung. Kalau butuh data,
  lewat Server Component yang panggil service, atau lewat fetch ke `app/api/`.

## Aturan simpel biar gak campur aduk

1. File di `lib/server/` **tidak boleh** ada `'use client'` atau import dari `components/`.
2. File di `components/` **tidak boleh** import langsung dari `lib/db/` atau `lib/server/*/repository.ts`.
3. Kalau Server Component butuh data, panggil `service.ts` langsung (boleh, karena Server Component
   jalan di server). Kalau Client Component butuh data, lewat `fetch('/api/...')`.
4. Satu service.ts = satu domain (matches, predictions, leaderboard, sync) — jangan digabung jadi
   satu file besar "backend.ts".
