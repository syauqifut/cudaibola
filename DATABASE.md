# DATABASE.md — Skema & keputusan desain

Schema sumber kebenaran ada di `lib/db/schema.ts` (Drizzle). Dokumen ini menjelaskan **kenapa**
schema-nya begitu, supaya tidak diubah tanpa alasan yang sama kuat.

## Entity Relationship (ringkas)

```
seasons ───────┐
               │ 1-to-many
competitions ──┼──┐
               │  │ 1-to-many
predictions ───┘  │
   │ many-to-1     │
   ▼               ▼
 users          matches ── 1-to-many ──► predictions
```

- `users` tidak punya relasi auth apa pun — lihat SPEC.md bagian 3.
- `seasons` adalah metadata periode leaderboard (per-kuartal kalender) — lihat SPEC.md
  bagian 5a. Setiap `prediction` terikat ke satu `season` (dikunci saat dibuat).
- `competitions` adalah master data, diisi/diupdate saat sync, dipakai untuk grouping di
  homepage dan urutan tampil (`priorityOrder`). Dibatasi ke 6 kompetisi (SPEC.md bagian 1a).
- `matches` adalah cache lokal dari provider eksternal — kolom `providerMatchId` dan
  `lastSyncedAt` ada khusus untuk keperluan sinkronisasi, jangan dihapus.
- `predictions` adalah satu-satunya tabel yang ditulis langsung oleh user (lewat form submit).

## Kenapa beberapa keputusan diambil

**`providerMatchId` & `providerCompetitionId` sebagai unique key terpisah dari `id` internal**
Supaya saat sync job jalan, kita bisa `upsert` berdasarkan ID dari provider tanpa perlu tau
UUID internal kita. `id` internal (UUID) tetap dipakai sebagai primary key & foreign key di
semua relasi internal, supaya kita tidak terikat ke format ID provider eksternal (yang bisa beda
kalau nanti ganti provider).

**`homeScore` / `awayScore` / `minute` nullable**
Match yang belum kickoff belum punya skor. Daripada pakai `0` sebagai default (yang ambigu —
apakah itu skor asli 0-0 atau "belum mulai"?), kolom ini sengaja nullable. Cek `status` dulu
sebelum baca skor.

Catatan konkret dari provider (Highlightly): skor datang sebagai **satu string gabungan**
`"3 - 1"` di field `state.score.current`, bukan dua angka terpisah. Parsing wajib dilakukan
di `sync/service.ts` sebelum insert ke kolom integer `homeScore`/`awayScore` — lihat contoh
fungsi `parseScore()` di `.cursor/rules/20-domain-rules.mdc`.

**`pointsEarned` nullable di tabel `predictions`**
NULL berarti "belum dihitung" (match belum selesai). Job scoring yang jalan setelah match
`finished` yang mengisi kolom ini. Leaderboard query harus exclude/treat NULL sebagai 0 saat
sum, bukan dianggap error.

**Constraint `unique(userId, matchId)`**
Satu user hanya boleh punya satu prediksi per match — submit kedua akan jadi UPDATE, bukan
row baru. Ini constraint di level DB supaya konsisten walau ada bug di service layer yang
lupa cek existing prediction dulu.

**Tidak ada kolom poin negatif / CHECK constraint range di `pointsEarned`**
Sengaja tidak dikunci dengan CHECK constraint di DB (misal `CHECK (points_earned IN (0,1,3))`)
supaya kalau skema poin berubah di masa depan (lihat SPEC.md bagian 4, "perubahan scope yang
harus didiskusikan dulu"), tidak perlu migration buat ubah constraint. Validasi nilai tetap
terjadi di `lib/server/predictions/scoring.ts`.

**Tidak ada tabel `leaderboard` terpisah**
Leaderboard dihitung on-the-fly dari `SUM(points_earned) GROUP BY user_id` di
`lib/server/leaderboard/repository.ts`, bukan tabel yang di-maintain manual. Untuk skala
pertemanan/komunitas kecil, ini jauh lebih simpel daripada jaga konsistensi tabel agregat.
Kalau nanti jumlah user/match sudah besar dan query ini mulai berat, baru pertimbangkan
materialized view atau tabel cache — bukan keputusan sekarang.

**Tabel `seasons` — metadata, bukan state yang "dijalankan"**
Season ditentukan murni dari kalender (kuartal: Jan-Mar, Apr-Jun, Jul-Sep, Okt-Des), jadi
tabel ini bukan sesuatu yang perlu di-trigger/dijalankan oleh cron untuk "melakukan reset".
Fungsinya:
- Referensi `id` yang stabil untuk di-FK-kan dari `predictions.seasonId` (lebih baik daripada
  predictions menyimpan `quarterLabel` sebagai string mentah berulang-ulang).
- `getCurrentSeason()` (di `lib/server/season/service.ts`) menghitung kuartal aktif dari
  tanggal sekarang, lalu `upsert` baris season itu kalau belum ada (lazy-create, bukan
  pre-populate semua season masa depan).
- Leaderboard "musim sebelumnya" (arsip) tinggal query `predictions` yang `seasonId`-nya
  bukan season aktif — tidak ada proses "archiving" yang memindahkan data, datanya memang
  sudah otomatis terpisah karena FK ke season yang berbeda.

**Kolom `predictions.seasonId` dikunci saat insert, tidak pernah diubah**
Prediksi yang dibuat di season Q3 tetap milik Q3 selamanya, walau dihitung/diupdate poinnya
belakangan (misal match selesai beberapa hari setelah season berakhir, kasus jarang tapi
mungkin terjadi di akhir kuartal). Job scoring tidak boleh memindahkan prediksi ke season baru
hanya karena saat dihitung sudah masuk kuartal berikutnya.

## Query pattern utama yang akan sering dipakai

**Match list grouped by competition (untuk homepage, dengan navigasi prev/next day)**

Query ini menerima parameter `$targetDate` (bukan selalu "hari ini") supaya bisa dipakai untuk
navigasi prev/next day (SPEC.md bagian 5b). Rentang hari HARUS dihitung berdasarkan
`APP_TIMEZONE` (WIB), dikonversi ke UTC di kode aplikasi — jangan pakai `kickoff_time::date =
$targetDate` di SQL mentah, karena itu memakai timezone server database (biasanya UTC), bukan
WIB. Lihat `.cursor/rules/20-domain-rules.mdc` bagian Timezone untuk detail penghitungan
rentangnya.

```sql
SELECT m.*, c.name as competition_name, c.priority_order
FROM matches m
JOIN competitions c ON m.competition_id = c.id
WHERE (m.kickoff_time >= $startOfTargetDateUtc AND m.kickoff_time <= $endOfTargetDateUtc)
   OR (m.status = 'live' AND $targetDate = $today)  -- live-pinning HANYA berlaku saat
                                                       -- $targetDate adalah hari ini, bukan
                                                       -- saat user sedang navigasi ke tanggal
                                                       -- lain (lihat SPEC.md bagian 5b)
ORDER BY c.priority_order ASC, m.kickoff_time ASC;
```
`$startOfTargetDateUtc` dan `$endOfTargetDateUtc` dihitung di kode (Drizzle query builder) dari
`$targetDate` yang dikirim client (default: hari ini di `APP_TIMEZONE` saat halaman dibuka
pertama kali) — bukan literal SQL.
Lalu di-`groupBy(competitionId)` di kode (lihat `lib/server/matches/grouping.ts`), karena
grouping + sorting status (live dulu, hanya saat targetDate = hari ini) lebih mudah dikontrol
di JS daripada SQL kompleks.

**Leaderboard (di-scope ke season aktif, lihat SPEC.md bagian 5a)**

```sql
SELECT u.nickname, COALESCE(SUM(p.points_earned), 0) as total_points
FROM users u
LEFT JOIN predictions p ON p.user_id = u.id AND p.season_id = $currentSeasonId
GROUP BY u.id, u.nickname
ORDER BY total_points DESC;
```
`$currentSeasonId` didapat dari `getCurrentSeason()` (lihat `lib/server/season/service.ts`),
dihitung dari tanggal sekarang, bukan disimpan sebagai konfigurasi statis.

**Leaderboard arsip (season sebelumnya, untuk dilihat sebagai "klasemen final")**
```sql
SELECT u.nickname, COALESCE(SUM(p.points_earned), 0) as total_points
FROM users u
LEFT JOIN predictions p ON p.user_id = u.id AND p.season_id = $archivedSeasonId
GROUP BY u.id, u.nickname
ORDER BY total_points DESC;
```
Query-nya identik, cuma `$seasonId` yang beda — tidak ada tabel/proses arsip terpisah, lihat
penjelasan di bagian "Tabel `seasons`" di atas.

**Cek apakah user sudah submit prediksi untuk match tertentu (sebelum render form)**
```sql
SELECT * FROM predictions WHERE user_id = $1 AND match_id = $2;
```

## Migration

Pakai `drizzle-kit` untuk generate migration dari `schema.ts`:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```
Jangan edit file migration yang sudah di-generate secara manual — kalau ada salah, ubah
`schema.ts` lalu generate ulang.