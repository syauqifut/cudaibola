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
- **Navigation bar tanggal** di bagian paling atas (sebelum grup kompetisi pertama): tombol "←"
  dan "→" (font-mono, sama styling dengan tombol sekunder) mengapit label tanggal yang sedang
  ditampilkan (font-sans, contoh: "Hari ini, 25 Jun" / "26 Jun"). Default saat halaman dibuka:
  hari ini. Lihat SPEC.md bagian 5b untuk aturan navigasinya.
- Match dikelompokkan per kompetisi. Tiap grup punya header: badge nama kompetisi (background
  `ink`, teks `pitch-green`, font-mono) + label round di sebelahnya (font-sans, lebih kecil).
- Urutan grup: kompetisi dengan match live duluan tampil paling atas (lihat
  `lib/server/matches/grouping.ts`) — **HANYA berlaku saat tanggal yang ditampilkan adalah hari
  ini**; saat user navigasi ke tanggal lain via prev/next, urutan grup murni berdasar
  `priorityOrder` dari tabel `competitions` tanpa live-pinning (karena match di tanggal lain
  tidak mungkin live saat ini).
- Dalam satu grup, tiap match adalah baris di dalam satu kartu kompetisi (bukan kartu
  per-match terpisah) — lihat mockup match list, semua match satu kompetisi berbagi satu
  border kartu, dipisah garis horizontal `border-bottom: 3px solid ink` antar baris.
- Tiap baris match adalah area yang bisa diklik (membuka popup detail match), dengan badge di
  ujung kanan yang menunjukkan state: `TEBAK` (hijau, belum kickoff), `TERKUNCI` (kuning, live
  tapi belum ada hasil poin), `+N POIN` (ink bg + teks kuning, sudah selesai & sudah dihitung).
- Kalau tanggal yang dipilih tidak punya match sama sekali (cek SPEC.md & rules edge case soal
  empty state), tampilkan pesan "Tidak ada pertandingan di tanggal ini" alih-alih halaman
  kosong — tetap tampilkan nav bar tanggal supaya user bisa lanjut geser ke tanggal lain.
- Tombol/akses ke leaderboard ditaruh di bagian atas halaman ini (misal floating button atau
  item di header), karena leaderboard adalah popup, bukan halaman.

### 2. Popup leaderboard
- Dibuka dari halaman utama, menutupi halaman dengan overlay gelap di belakangnya.
- Header popup: badge "KLASEMEN PREDIKSI" (background `ink`, teks `card-yellow`) **+ label
  season aktif** di sebelahnya (font-mono, kecil, contoh: "2026 Q3") — supaya jelas ini bukan
  akumulasi all-time. Lihat SPEC.md bagian 5a.
- List ranking, satu baris per user: nomor urut (font-mono) + nickname (font-sans) + total
  poin (font-mono, paling besar) — total poin ini SELALU dalam scope season aktif yang
  ditampilkan di header, bukan akumulasi sepanjang waktu.
- Peringkat 1 di-highlight background `card-yellow`.
- Baris milik user yang sedang membuka app (cocokkan `userId` dari localStorage) di-highlight
  background `pitch-green`, disertai label "(kamu)" di belakang nickname — supaya gampang
  ditemukan tanpa scroll, terlepas dari posisi rankingnya.
- Baris di luar 3 besar boleh sedikit di-fade (opacity ~0.6-0.7) untuk menjaga fokus visual ke
  top performer, KECUALI baris milik user sendiri yang tetap full opacity meski rank-nya rendah.
- Arsip season sebelumnya BOLEH menyusul di iterasi berikutnya (misal dropdown pilih season di
  header popup) — tidak wajib di MVP pertama, cukup tampilkan season aktif dulu (lihat
  `.cursor/rules/20-domain-rules.mdc` bagian Season).

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

## Interaksi & animasi (hover, active, focus)

Token sebelumnya (warna, border, shadow) cuma mendefinisikan **state diam**. Bagian ini
mengunci **state interaksi** — ini bagian yang paling sering dilupakan dan paling penting untuk
neo-brutalism, karena di sinilah karakter "brutal" benar-benar kerasa.

**Prinsip dasar: animasi brutalism itu KASAR/FISIK, bukan halus.** Salah kalau dieksekusi
seperti animasi UI modern biasa (fade lembut, ease-in-out panjang, scale subtle). Yang benar:
pergerakan singkat yang mensimulasikan benda fisik tebal (kertas/papan) yang ditekan atau
diangkat — durasi pendek, tanpa easing kompleks.

**Durasi & easing — dikunci, jangan diubah:**
```css
transition: transform 0.1s ease, box-shadow 0.1s ease;
```
0.1s adalah maksimum. JANGAN pakai durasi seperti 0.2s/0.3s yang umum dipakai di UI modern —
itu akan kerasa "lembek", bertentangan dengan karakter brutal yang dituju.

### Tombol (primer & sekunder)

- **Default**: shadow `4px 4px 0 ink`, posisi normal (`translate(0, 0)`).
- **Hover**: shadow membesar jadi `6px 6px 0 ink`, tombol bergerak `translate(-2px, -2px)` —
  efeknya tombol "terangkat", shadow makin kelihatan jelas di belakangnya.
- **Active/pressed (saat diklik, `:active` atau `onmousedown`)**: shadow LANGSUNG hilang total
  (`0 0 0 ink`, alias tidak ada shadow), tombol bergerak `translate(4px, 4px)` — efeknya tombol
  "nempel rata" ke posisi shadow, mensimulasikan ditekan sampai habis. Ini transisi paling
  penting untuk dirasakan "brutal" — jangan dilewatkan demi kesederhanaan kode.
- Tidak ada efek opacity/fade di mana pun pada tombol. Tidak ada scale (`transform: scale(...)`)
  — pergerakannya selalu translate (geser), bukan membesar/mengecil.

```css
/* Pola dasar tombol, terapkan di semua varian (primer/sekunder) */
.btn-brutal {
  box-shadow: 4px 4px 0 var(--ink);
  transform: translate(0, 0);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.btn-brutal:hover {
  box-shadow: 6px 6px 0 var(--ink);
  transform: translate(-2px, -2px);
}
.btn-brutal:active {
  box-shadow: 0 0 0 var(--ink);
  transform: translate(4px, 4px);
}
```

### Baris match (di dalam kartu kompetisi, match list)

- **Default**: background transparan/`surface`.
- **Hover**: background langsung berganti SOLID ke `pitch-green` (TIDAK di-fade, harus instan
  atau maksimum transisi warna 0.1s) — ini menandakan baris itu bisa diklik untuk buka popup
  detail. Tambahkan juga `transform: translateX(3px)` supaya kerasa "nyangkut"/grippy, bukan
  hover pasif biasa.
- JANGAN pakai efek hover yang umum dipakai di list modern (subtle background-secondary,
  opacity sedikit turun, dst) — kontras warna penuh adalah bagian dari bahasa visual ini.

### Input skor (form prediksi)

- **Default**: border 3px `ink`, tidak ada shadow.
- **Focus**: munculkan shadow `3px 3px 0 card-yellow` secara instan (transisi box-shadow 0.1s).
  Sengaja pakai kuning (bukan warna focus ring biru standar browser) — konsisten dengan makna
  warna kuning sebagai "perhatian/aktif" di seluruh DESIGN.md.
- Set `outline: none` di base style (karena sudah diganti dengan shadow kuning di atas), tapi
  pastikan shadow focus ini tetap muncul jelas untuk keperluan aksesibilitas — jangan
  dihilangkan sama sekali tanpa pengganti.

### Badge & elemen statis lain (TIDAK butuh interaksi)

Badge (`TEBAK`, `TERKUNCI`, `+N POIN`) TIDAK diberi hover/active state — badge ini murni
informatif, bukan elemen yang bisa diklik sendiri (klik terjadi di level baris match, bukan di
badge-nya). Jangan tambahkan transition/hover effect ke badge demi "konsistensi" — itu cuma
menambah noise visual tanpa fungsi.

### Implementasi di Tailwind

Karena transisi ini dipakai berulang di banyak komponen (tombol primer, sekunder, baris match),
definisikan sebagai utility class custom di `tailwind.config.ts` atau `globals.css`, jangan
tulis inline style berulang di tiap komponen:

```css
/* globals.css */
.interactive-brutal {
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
```

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
- JANGAN memakai transisi/animasi halus bergaya UI modern (durasi 0.2s+, ease-in-out panjang,
  fade, scale) di elemen interaktif mana pun. Semua transisi dikunci di 0.1s, lihat bagian
  "Interaksi & animasi" — termasuk saat "kelihatan lebih smooth kalau durasinya ditambah".
- JANGAN biarkan tombol/elemen interaktif tanpa state hover dan active. Setiap tombol baru yang
  dibuat WAJIB punya ketiga state (default, hover, active) sesuai pola di bagian "Interaksi &
  animasi" — ini bukan elemen opsional/polish, ini bagian dari definisi komponen.