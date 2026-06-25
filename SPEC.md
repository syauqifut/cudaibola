# SPEC.md — Aplikasi Prediksi Bola (poin, bukan uang asli)

Dokumen ini adalah kontrak kebutuhan. Kalau ada bagian kode yang bertentangan dengan dokumen
ini, dokumen ini yang menang. Update dokumen ini dulu sebelum mengubah perilaku besar di kode.

## 1. Apa aplikasi ini

Web app untuk tebak-tebakan skor pertandingan sepak bola antar teman/komunitas, menggunakan
**poin virtual** sebagai skor, bukan uang asli. Fokus tournament awal: FIFA World Cup 2026
(berlangsung 11 Juni – 19 Juli 2026), plus liga-liga top lain (Premier League, dst) sebagai
tambahan kalau ada waktu.

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

## 6. Fitur inti (urutan implementasi yang disarankan)

1. **Sync data match** dari API eksternal (football-data.org sebagai sumber utama) ke database
   sendiri, berjalan via cron job berkala (interval lebih sering saat ada match live).
2. **Match list** di homepage, dikelompokkan per kompetisi (World Cup, Premier League, dst),
   menampilkan status: scheduled (jam kickoff) / live (menit + skor live) / finished (FT + skor).
3. **Submit prediksi** — form skor prediksi per match, hanya muncul/aktif kalau match belum
   kickoff.
4. **Scoring otomatis** — saat match selesai (`status: finished`), hitung poin semua prediksi
   untuk match itu sesuai tabel di bagian 4.
5. **Leaderboard** — ranking semua `userId` berdasarkan total poin, urut dari terbesar.

## 7. Sumber data eksternal

- Provider: **Highlightly Football API** (`https://soccer.highlightly.net`), free tier 100
  request/hari, mencakup live scores, status match, dan event gol untuk World Cup serta
  liga-liga top.
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

Next.js (App Router) monorepo, PostgreSQL (Neon/Supabase free tier), Drizzle ORM, Tailwind CSS.
Backend logic terpisah rapi di `lib/server/`, tidak boleh bercampur dengan komponen React.

## 9. Definition of done untuk MVP

MVP dianggap selesai kalau:
- [ ] User bisa buka app, isi nickname sekali, langsung lihat match list grouped by competition
- [ ] User bisa submit prediksi skor untuk match yang belum mulai
- [ ] Prediksi otomatis terkunci begitu match live
- [ ] Setelah match finished, poin terhitung otomatis sesuai skema di bagian 4
- [ ] Leaderboard menampilkan ranking semua nickname berdasarkan total poin
- [ ] Tidak ada satu pun elemen UI/copy yang menyinggung uang asli, top-up, atau withdraw
