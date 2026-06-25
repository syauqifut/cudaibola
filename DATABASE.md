# DATABASE.md — Skema & keputusan desain

Schema sumber kebenaran ada di `lib/db/schema.ts` (Drizzle). Dokumen ini menjelaskan **kenapa**
schema-nya begitu, supaya tidak diubah tanpa alasan yang sama kuat.

## Entity Relationship (ringkas)

```
competitions ──┐
               │ 1-to-many
matches ───────┤
               │ 1-to-many
predictions ───┘
               │ many-to-1
users ─────────┘
```

- `users` tidak punya relasi auth apa pun — lihat SPEC.md bagian 3.
- `competitions` adalah master data, diisi/diupdate saat sync, dipakai untuk grouping di
  homepage dan urutan tampil (`priorityOrder`).
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

## Query pattern utama yang akan sering dipakai

**Match list grouped by competition (untuk homepage)**

PENTING: rentang "hari ini" HARUS dihitung berdasarkan `APP_TIMEZONE` (WIB), dikonversi ke UTC
di kode aplikasi, baru dipakai sebagai parameter query — jangan pakai `kickoff_time::date =
CURRENT_DATE` di SQL mentah, karena itu memakai timezone server database (biasanya UTC), bukan
WIB, dan akan salah menjelang tengah malam. Lihat `.cursor/rules/20-domain-rules.mdc` bagian
Timezone untuk detail penghitungan rentangnya.

```sql
SELECT m.*, c.name as competition_name, c.priority_order
FROM matches m
JOIN competitions c ON m.competition_id = c.id
WHERE (m.kickoff_time >= $startOfTodayUtc AND m.kickoff_time <= $endOfTodayUtc)
   OR m.status = 'live'  -- match live tetap tampil walau kickoff-nya "kemarin" (lewat tengah malam)
ORDER BY c.priority_order ASC, m.kickoff_time ASC;
```
`$startOfTodayUtc` dan `$endOfTodayUtc` dihitung di kode (Drizzle query builder), bukan
literal SQL — nilainya hasil konversi awal/akhir hari WIB ke UTC.
Lalu di-`groupBy(competitionId)` di kode (lihat `lib/server/matches/grouping.ts`), karena
grouping + sorting status (live dulu) lebih mudah dikontrol di JS daripada SQL kompleks.

**Leaderboard**
```sql
SELECT u.nickname, COALESCE(SUM(p.points_earned), 0) as total_points
FROM users u
LEFT JOIN predictions p ON p.user_id = u.id
GROUP BY u.id, u.nickname
ORDER BY total_points DESC;
```

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
