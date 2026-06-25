# SPEC.md — Aplikasi Prediksi Bola (poin, bukan uang asli)

Dokumen ini adalah kontrak kebutuhan. Kalau ada bagian kode yang bertentangan dengan dokumen
ini, dokumen ini yang menang. Update dokumen ini dulu sebelum mengubah perilaku besar di kode.

## 1. Apa aplikasi ini

Web app untuk tebak-tebakan skor pertandingan sepak bola antar teman/komunitas, menggunakan
**poin virtual** sebagai skor, bukan uang asli.

Kompetisi yang dicakup (FINAL, daftar tertutup — lihat bagian 1a untuk aturan menambah):
1. FIFA World Cup 2026
2. Premier League (Inggris)
3. La Liga (Spanyol)
4. Bundesliga (Jerman)
5. Serie A (Italia)
6. Ligue 1 (Prancis)

## 1a. Daftar kompetisi tertutup — jangan menambah tanpa konfirmasi

Sync job HANYA mengambil data untuk 6 kompetisi di atas. Ini bukan keterbatasan teknis,
melainkan keputusan scope yang sengaja dibuat sempit:
- Membatasi jumlah kompetisi membuat budget request harian ke Highlightly (100/hari di free
  tier) lebih terkontrol dan mudah dihitung.
- Daftar `providerCompetitionId` untuk keenam liga ini WAJIB disimpan sebagai konstanta
  eksplisit (lihat `.cursor/rules/20-domain-rules.mdc` bagian "Daftar liga"), bukan
  "ambil semua liga yang tersedia dari API".
- Kalau user ingin menambah kompetisi lain di kemudian hari, itu perubahan scope yang harus
  didiskusikan dulu (perlu dicek dulu budget request harian masih cukup atau tidak).

## 2. Non-goals (PENTING — jangan diimplementasikan)

- ❌ TIDAK ADA uang asli dalam bentuk apa pun: tidak ada top-up, tidak ada withdraw, tidak ada
  payment gateway, tidak ada konversi poin ke nilai apa pun di luar aplikasi.
- ❌ TIDAK ADA fitur "jual/beli" atau transfer poin antar user.
- ❌ TIDAK ADA sistem akun penuh (tidak perlu password reset, email verification, dst) — lihat
  bagian Auth di bawah.
- ❌ TIDAK ADA fitur taruhan terhadap user lain (head-to-head betting). Ini murni "tebak vs hasil
  pertandingan", bukan "tebak vs prediksi orang lain".

Kalau Cursor/AI mengusulkan fitur yang menyentuh salah satu di atas, STOP dan tanya ke user dulu.

## 3. Identitas user — "cache di browser" (BUKAN akun server-side)

Keputusan sadar: tidak ada login form, tidak ada password, tidak ada OAuth.

Mekanisme:
- Saat pertama buka app, user diminta isi **nickname** sekali.
- Sistem generate `userId` (UUID) dan simpan bersama nickname di **localStorage** (atau cookie
  kalau butuh dibaca di server component — pilih cookie httpOnly=false agar bisa dibaca client
  juga, atau gunakan localStorage + kirim userId di setiap request body/header).
- `userId` ini yang jadi foreign key di tabel `predictions` dan muncul di leaderboard.
- TIDAK ADA password, TIDAK ADA validasi keaslian user. Siapa pun yang tahu/menebak `userId`
  bisa submit prediksi atas nama itu (acceptable risk untuk skala pertemanan/komunitas kecil).

Konsekuensi yang harus didokumentasikan di UI (bukan disembunyikan):
- Ganti device/browser atau clear cache = histori & poin hilang, dianggap user baru.
- Tampilkan info kecil di halaman pertama: "Progres kamu tersimpan di browser ini saja."

Implikasi teknis:
- Tidak perlu tabel `users` dengan auth fields. Cukup tabel `users` ringan: `id (uuid)`,
  `nickname`, `created_at`.
- Tidak perlu NextAuth/Auth.js. Cukup util kecil `lib/server/identity/` untuk generate &
  validasi format `userId` dari request.

## 4. Skema poin (FINAL — sudah dikunci, jangan diubah tanpa konfirmasi user)

Per pertandingan, dibandingkan dengan skor akhir resmi:

| Kondisi prediksi                                  | Poin |
|----------------------------------------------------|------|
| Skor ditebak tepat sama (exact score)              | +3   |
| Hasil benar (menang/seri/kalah benar) tapi skor beda | +1 |
| Hasil salah sama sekali                             | 0   |

Tidak ada poin minus. Tidak ada bonus tambahan (multiplier, streak bonus, dst) di MVP — kalau
mau ditambah nanti, itu perubahan scope yang harus didiskusikan dulu.

Definisi "hasil benar": kategori menang-tim-A / seri / menang-tim-B yang ditebak harus cocok
dengan kategori hasil akhir, terlepas dari skor persis.

## 5. Aturan kunci prediksi (lock time)

- Prediksi untuk satu match **terkunci otomatis saat kickoff** (status match berubah dari
  `scheduled` ke `live`).
- Setelah terkunci, user tidak bisa submit atau edit prediksi untuk match itu.
- Validasi lock time WAJIB dilakukan di server (`lib/server/predictions/service.ts`), tidak
  boleh hanya mengandalkan disable button di UI.

## 5a. Season & reset leaderboard (FINAL)

Leaderboard di-scope per **season**, bukan akumulasi selamanya dan bukan per-kompetisi.

- Satu leaderboard gabungan mencakup semua poin dari ke-6 kompetisi (bagian 1), bukan
  leaderboard terpisah per liga.
- Season berdurasi **per-kuartal kalender**: Jan–Mar, Apr–Jun, Jul–Sep, Okt–Des. Tanggal mulai
  & akhir SELALU tetap (1 Januari, 1 April, 1 Juli, 1 Oktober) — tidak dihitung dari kapan app
  pertama dipakai atau dari jadwal liga manapun.
- Saat season berakhir (tanggal kuartal berikutnya dimulai):
  1. Leaderboard season yang berakhir **diarsipkan** — tetap bisa dilihat sebagai "klasemen
     final" season itu, datanya tidak dihapus.
  2. Leaderboard baru dimulai dari nol untuk season berikutnya.
  3. Prediksi dan poin yang sudah ada **tidak dihitung ulang/dipindah** — setiap prediksi selalu
     terikat ke season tempat dia dibuat (lihat kolom `seasonId` di `predictions`, schema.ts).
- Implikasi: total poin all-time tiap user bisa dihitung kalau dibutuhkan (SUM semua season),
  tapi itu bukan tampilan default — default-nya selalu menampilkan season yang sedang aktif.
- Tidak butuh cron job khusus untuk "melakukan reset" — karena season ditentukan murni dari
  tanggal kalender, leaderboard query selalu otomatis menyaring berdasarkan season aktif saat
  itu (lihat DATABASE.md untuk query pattern). "Reset" terjadi natural begitu kuartal berganti,
  tidak ada aksi/migration yang perlu dijalankan manual.

## 5b. Navigasi tanggal (prev/next day) di halaman match list

Homepage tidak lagi terbatas menampilkan "hari ini" saja — ada navigasi tanggal:
- Tombol "←" (hari sebelumnya) dan "→" (hari berikutnya) di bagian atas halaman, dengan label
  tanggal yang sedang ditampilkan di tengah.
- Default saat halaman dibuka: tanggal hari ini (`APP_TIMEZONE`, lihat
  `.cursor/rules/20-domain-rules.mdc` bagian Timezone).
- Match yang masih `live` TETAP hanya tampil di tanggal kickoff-nya yang sebenarnya saat
  navigasi prev/next dipakai — pengecualian "match live selalu tampil di atas" pada bagian 5b
  HANYA berlaku untuk tampilan default "hari ini", bukan saat user sedang melihat tanggal lain.
- Tidak perlu date-picker kalender penuh di MVP — cukup tombol prev/next satu hari per klik.
- Submit prediksi tetap hanya mungkin untuk match yang belum kickoff, terlepas dari tanggal
  mana yang sedang dilihat di UI (validasi lock time tetap di server, lihat bagian 5).

## 6. Fitur inti (urutan implementasi yang disarankan)

1. **Sync data match** dari Highlightly (6 kompetisi di bagian 1 saja) ke database sendiri,
   berjalan via cron job berkala (interval lebih sering saat ada match live).
2. **Match list** di homepage, dikelompokkan per kompetisi, menampilkan status: scheduled (jam
   kickoff) / live (menit + skor live) / finished (FT + skor). Termasuk navigasi prev/next day
   (bagian 5b).
3. **Submit prediksi** — form skor prediksi per match, hanya muncul/aktif kalau match belum
   kickoff.
4. **Scoring otomatis** — saat match selesai (`status: finished`), hitung poin semua prediksi
   untuk match itu sesuai tabel di bagian 4, terikat ke season aktif saat prediksi dibuat.
5. **Leaderboard per-season** — ranking semua `userId` berdasarkan total poin DALAM season
   aktif, urut dari terbesar (bagian 5a).

## 7. Sumber data eksternal

- Provider: **Highlightly Football API** (`https://soccer.highlightly.net`), free tier 100
  request/hari, mencakup live scores, status match, dan event gol.
- Sync HANYA mengambil data untuk 6 kompetisi di bagian 1/1a — bukan semua liga yang tersedia
  dari provider. Daftar `providerCompetitionId` untuk keenamnya dikunci di
  `.cursor/rules/20-domain-rules.mdc`.
- Detail teknis lengkap (endpoint, auth header, mapping status, parsing skor, frekuensi sync)
  ada di `.cursor/rules/20-domain-rules.mdc` bagian "Sync data eksternal — provider:
  Highlightly" — itu sumber kebenaran teknis, jangan diulang/didupilkasi berbeda di tempat lain.
- Jangan polling Highlightly langsung dari tiap request user — selalu lewat cache di database
  sendiri yang di-refresh oleh cron job.
- API key disimpan di environment variable (`HIGHLIGHTLY_API_KEY`), tidak pernah di-hardcode
  atau di-commit.
- Line-up pemain dan data odds/predictions dari provider ini **tidak dipakai** di MVP (lihat
  bagian 2, non-goals, dan keputusan skip line-up).

## 8. Stack (lihat juga .cursor/rules/ untuk detail teknis)

Next.js (App Router) monorepo, PostgreSQL, Drizzle ORM, Tailwind CSS. Backend logic terpisah
rapi di `lib/server/`, tidak boleh bercampur dengan komponen React.

Deploy target: **VPS milik sendiri** (bukan Vercel/serverless). Next.js dijalankan via
`next start` di balik PM2. Sync job berjalan sebagai **proses worker terpisah** (`node-cron`)
di proses yang sama dengan codebase, bukan lewat HTTP cron eksternal — lihat
`.cursor/rules/20-domain-rules.mdc` bagian "Mekanisme trigger sync" untuk detail dan aturan
wajib "hanya satu instance worker boleh berjalan".

## 9. Definition of done untuk MVP

MVP dianggap selesai kalau:
- [ ] User bisa buka app, isi nickname sekali, langsung lihat match list grouped by competition
- [ ] Hanya 6 kompetisi di bagian 1 yang muncul — tidak ada liga lain yang ke-sync tanpa sengaja
- [ ] User bisa navigasi prev/next day di homepage, default ke hari ini
- [ ] User bisa submit prediksi skor untuk match yang belum mulai
- [ ] Prediksi otomatis terkunci begitu match live
- [ ] Setelah match finished, poin terhitung otomatis sesuai skema di bagian 4
- [ ] Leaderboard menampilkan ranking semua nickname berdasarkan total poin DALAM season aktif
      (kuartal kalender saat ini), bukan akumulasi all-time
- [ ] Leaderboard season sebelumnya tetap bisa diakses sebagai arsip, tidak terhapus
- [ ] Tidak ada satu pun elemen UI/copy yang menyinggung uang asli, top-up, atau withdraw