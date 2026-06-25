# DESIGN.md — Design system (neo-brutalism, tema sepak bola)

Dokumen ini adalah sumber kebenaran untuk semua keputusan visual. Token di sini SUDAH DIKUNCI
hasil diskusi dengan user — jangan diubah, ditambah ramp warna baru, atau "diperhalus" tanpa
konfirmasi eksplisit. Tujuannya supaya tiap komponen yang dibuat di sesi Cursor berbeda-beda
tetap konsisten satu sama lain.

## Filosofi arah desain

Neo-brutalism, tapi elemen visualnya diturunkan dari dunia sepak bola nyata — bukan brutalism
generik ala landing page SaaS/indie product. Referensi konkret: papan skor LED stadion, kartu
kuning/merah wasit, garis kapur lapangan, kertas catatan skor manual.

Signature element aplikasi ini: kartu pertandingan yang dirender seperti papan skor LED —
border tebal solid, shadow offset keras (tanpa blur), angka skor besar dalam font monospace,
dan badge status yang mengambil warna dari kartu wasit.

## Token warna (FINAL)

| Nama token       | Hex       | Asal/makna                          | Dipakai untuk |
|------------------|-----------|--------------------------------------|---------------|
| `ink`            | `#0D0D0D` | Tinta/garis lapangan                 | Semua border, teks utama, header gelap |
| `pitch-white`    | `#F5F1E8` | Kertas catatan skor, off-white       | Background halaman |
| `surface`        | `#FFFDF8` | Kertas lebih putih dari pitch-white  | Background kartu/popup |
| `pitch-green`    | `#39FF6A` | Rumput / sorotan "live"              | Status live, tombol aksi utama (submit, tebak) |
| `card-yellow`    | `#FFD400` | Kartu kuning wasit                   | Badge "terkunci", highlight peringkat 1, badge poin +1 |
| `card-red`       | `#FF3B30` | Kartu merah wasit                    | Hanya untuk state error/salah — TIDAK dipakai untuk poin (skema poin tidak ada minus, lihat SPEC.md bagian 4) |

Aturan penggunaan warna (jangan dilanggar):
- **Hijau (`pitch-green`) = "live" dan "bisa beraksi"** (tombol submit, badge "tebak di sini").
  Jangan pakai hijau untuk hal lain.
- **Kuning (`card-yellow`) = status terkunci/diam atau pencapaian** (badge "terkunci", badge
  poin yang didapat, highlight juara di leaderboard). Bukan warna peringatan/bahaya.
- **Merah (`card-red`) = HANYA untuk error teknis** (gagal submit, validasi gagal). Karena skema
  poin tidak ada nilai minus, merah tidak pernah dipakai untuk menampilkan hasil prediksi.
- **Ink (`#0D0D0D`) dipakai sebagai border di hampir semua elemen** — ini elemen paling konsisten
  di seluruh app, jangan diganti warna lain atau dihilangkan demi "kelihatan lebih clean".

Semua token warna harus didefinisikan di `tailwind.config.ts` (lihat bagian Tailwind di bawah),
bukan ditulis hex langsung berulang-ulang di tiap komponen.

## Tipografi

Dua role font:
- **Sans** — untuk nama tim, label, body text, copy UI. Pakai font sans yang tegas/geometris
  (contoh: `Inter` atau `Archivo` — pilih satu, jangan campur). Weight yang dipakai: 500
  (medium) untuk hampir semua teks UI, 400 hanya untuk teks sekunder/caption panjang.
- **Mono** — KHUSUS untuk angka: skor pertandingan, menit berjalan, jam kickoff, poin di
  leaderboard, input skor di form prediksi. Pakai font monospace (contoh: `JetBrains Mono` atau
  `IBM Plex Mono`). Ini bukan estetika semata — mono membuat angka selalu align rapi di tabel
  dan list, dan memperkuat kesan "papan skor digital".

Aturan: kalau sebuah angka itu data dari pertandingan (skor, menit, poin), HARUS pakai
font-mono. Kalau itu label/nama (nama tim, nama kompetisi, nickname), pakai font-sans.

## Border, shadow, radius

- **Border**: selalu solid, **3px** untuk kartu/popup utama, **2px** untuk elemen kecil (badge,
  input field). Warna border selalu `ink` (`#0D0D0D`), kecuali badge yang sengaja kontras
  (lihat contoh kode di bawah).
- **Border-radius: 0 di seluruh app.** Ini bagian dari bahasa visual neo-brutalism — tidak ada
  sudut membulat sama sekali, termasuk di tombol, input, badge, card.
- **Shadow**: selalu offset keras tanpa blur, format `Npx Npx 0 #0D0D0D`. Gunakan `5px 5px 0`
  untuk kartu/popup besar, `3px 3px 0` untuk tombol dan elemen kecil. JANGAN PERNAH pakai
  `box-shadow` dengan blur radius (itu bukan neo-brutalism, itu shadow biasa).

## Layout aplikasi (3 permukaan, final)

Aplikasi ini hanya punya **1 halaman** ditambah **2 popup**. Jangan menambahkan halaman/route
baru tanpa konfirmasi user (misal halaman profil terpisah, halaman tentang, dst — semua
informasi tambahan masuk ke salah satu dari 3 permukaan ini atau tidak dibuat sama sekali).

### 1. Halaman utama — match list
- Single page, scrollable.
- Match dikelompokkan per kompetisi. Tiap grup punya header: badge nama kompetisi (background
  `ink`, teks `pitch-green`, font-mono) + label round di sebelahnya (font-sans, lebih kecil).
- Urutan grup: kompetisi dengan match live duluan tampil paling atas (lihat
  `lib/server/matches/grouping.ts`), lalu sisanya berdasar `priorityOrder` dari tabel
  `competitions`.
- Dalam satu grup, tiap match adalah baris di dalam satu kartu kompetisi (bukan kartu
  per-match terpisah) — lihat mockup match list, semua match satu kompetisi berbagi satu
  border kartu, dipisah garis horizontal `border-bottom: 3px solid ink` antar baris.
- Tiap baris match adalah area yang bisa diklik (membuka popup detail match), dengan badge di
  ujung kanan yang menunjukkan state: `TEBAK` (hijau, belum kickoff), `TERKUNCI` (kuning, live
  tapi belum ada hasil poin), `+N POIN` (ink bg + teks kuning, sudah selesai & sudah dihitung).
- Tombol/akses ke leaderboard ditaruh di bagian atas halaman ini (misal floating button atau
  item di header), karena leaderboard adalah popup, bukan halaman.

### 2. Popup leaderboard
- Dibuka dari halaman utama, menutupi halaman dengan overlay gelap di belakangnya.
- Header popup: badge "KLASEMEN PREDIKSI" (background `ink`, teks `card-yellow`).
- List ranking, satu baris per user: nomor urut (font-mono) + nickname (font-sans) + total
  poin (font-mono, paling besar).
- Peringkat 1 di-highlight background `card-yellow`.
- Baris milik user yang sedang membuka app (cocokkan `userId` dari localStorage) di-highlight
  background `pitch-green`, disertai label "(kamu)" di belakang nickname — supaya gampang
  ditemukan tanpa scroll, terlepas dari posisi rankingnya.
- Baris di luar 3 besar boleh sedikit di-fade (opacity ~0.6-0.7) untuk menjaga fokus visual ke
  top performer, KECUALI baris milik user sendiri yang tetap full opacity meski rank-nya rendah.

### 3. Popup detail match
Dua state berbeda, tergantung `status` match (lihat schema.ts):

**State A — `status: scheduled` (belum kickoff)**
- Header popup background `pitch-green`, isi: nama kompetisi + babak.
- Tengah: nama kedua tim + jam kickoff (font-mono).
- Form prediksi: dua input angka (skor tim home & away), font-mono besar, dipisah tanda "-".
- Tombol "SUBMIT TEBAKAN" — background `pitch-green`, full width.
- Kalau user sudah pernah submit prediksi untuk match ini, input field terisi otomatis dengan
  prediksi sebelumnya (bisa diedit ulang selama masih `scheduled`).

**State B — `status: live` atau `finished`**
- Header popup background `ink` (gelap), isi: badge "LIVE · [menit]'" (teks `pitch-green`) atau
  "FT" kalau sudah selesai.
- Tengah: nama tim + skor besar font-mono, dipisahkan tanda "-" yang lebih kecil/redup.
- Bagian "Jalannya gol" — list scorer + menit, font-sans untuk nama, font-mono untuk menit.
  **Bagian ini OPSIONAL**: tampilkan kalau data event tersedia dari provider, sembunyikan
  section ini sama sekali (jangan tampilkan "tidak ada data") kalau kosong. Jangan menganggap
  bagian ini wajib ada — lihat SPEC.md, ini sama perlakuannya dengan keputusan skip line-up.
- Bagian bawah: tebakan user (read-only, font-sans untuk skor) + badge status di kanan:
  - `TERKUNCI` (background `card-yellow`) kalau match masih `live`/belum dihitung poinnya
  - `+N POIN` (background `ink`, teks `card-yellow`) kalau match `finished` dan `pointsEarned`
    sudah terisi
- Form input tidak muncul sama sekali di state ini — read-only total, tidak ada tombol submit
  yang di-disable (lebih baik disembunyikan daripada ditampilkan abu-abu).

## Komponen kecil — aturan konsisten

- **Badge** selalu: font-mono, font-size 10-11px, padding `2-4px 8-10px`, border 2px solid
  `ink`, border-radius 0.
- **Tombol primer** (submit, aksi utama): background `pitch-green`, border 3px `ink`, shadow
  `3px 3px 0 ink`, font-mono.
- **Tombol sekunder** (misal "lihat leaderboard" kalau ditaruh sebagai tombol, bukan icon):
  background `surface`/`pitch-white`, border + shadow sama seperti tombol primer.
- **Input angka** (skor prediksi): width tetap kecil (~46px), height ~42px, text-align center,
  font-mono ukuran besar (18px), border 3px `ink`, border-radius 0.

## Tailwind config — token yang harus didefinisikan

Tambahkan ke `tailwind.config.ts` (jangan tulis hex berulang di komponen):

```ts
theme: {
  extend: {
    colors: {
      ink: '#0D0D0D',
      'pitch-white': '#F5F1E8',
      surface: '#FFFDF8',
      'pitch-green': '#39FF6A',
      'card-yellow': '#FFD400',
      'card-red': '#FF3B30',
    },
    fontFamily: {
      sans: ['Inter', 'sans-serif'],       // atau Archivo — pilih satu, konsisten
      mono: ['JetBrains Mono', 'monospace'],
    },
    borderRadius: {
      none: '0px',
      DEFAULT: '0px',                       // override default Tailwind jadi 0 di seluruh app
    },
    boxShadow: {
      brutal: '5px 5px 0 #0D0D0D',
      'brutal-sm': '3px 3px 0 #0D0D0D',
    },
  },
}
```

Lalu pakai class `shadow-brutal` / `shadow-brutal-sm` di komponen, bukan menulis
`box-shadow: ...` inline berulang-ulang.

## Larangan eksplisit (supaya tidak drift dari rencana)

- JANGAN menambahkan gradient di mana pun.
- JANGAN menambahkan border-radius selain 0, di komponen apa pun, termasuk saat "kelihatan lebih
  modern kalau dibulatkan sedikit" — itu bukan keputusan yang diminta.
- JANGAN menambahkan halaman/route baru (profil, about, settings, dst) di luar 3 permukaan yang
  sudah ditentukan tanpa konfirmasi user.
- JANGAN menampilkan line-up pemain di mana pun di MVP — ini sudah diputuskan untuk di-skip
  (lihat SPEC.md).
- JANGAN memakai warna merah (`card-red`) untuk merepresentasikan hasil prediksi salah/poin
  rendah. Skema poin tidak punya nilai minus; merah hanya untuk error teknis aplikasi.
