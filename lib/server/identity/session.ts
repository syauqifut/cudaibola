const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Validasi format UUID saja — bukan verifikasi kepemilikan (lihat SPEC.md bagian 3). */
export function isValidUserId(userId: string): boolean {
  return UUID_V4_REGEX.test(userId);
}
