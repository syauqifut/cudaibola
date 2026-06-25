import { isValidUserId } from '@/lib/server/identity/session';
import { upsertUser, type UserRecord } from '@/lib/server/identity/repository';

const NICKNAME_MIN_LENGTH = 1;
const NICKNAME_MAX_LENGTH = 32;

export class IdentityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdentityValidationError';
  }
}

export type RegisterNicknameInput = {
  userId: string;
  nickname: string;
};

function normalizeNickname(raw: string): string {
  return raw.trim();
}

function validateNickname(nickname: string): string {
  const normalized = normalizeNickname(nickname);

  if (normalized.length < NICKNAME_MIN_LENGTH) {
    throw new IdentityValidationError('Nickname tidak boleh kosong.');
  }

  if (normalized.length > NICKNAME_MAX_LENGTH) {
    throw new IdentityValidationError(
      `Nickname maksimal ${NICKNAME_MAX_LENGTH} karakter.`,
    );
  }

  return normalized;
}

export async function registerOrUpdateNickname(
  input: RegisterNicknameInput,
): Promise<UserRecord> {
  if (!isValidUserId(input.userId)) {
    throw new IdentityValidationError('userId tidak valid.');
  }

  const nickname = validateNickname(input.nickname);
  return upsertUser(input.userId, nickname);
}
