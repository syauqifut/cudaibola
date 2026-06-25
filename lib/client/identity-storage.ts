import { IDENTITY_STORAGE_KEY } from '@/lib/shared/constants';

export type LocalIdentity = {
  userId: string;
  nickname: string;
};

export function generateUserId(): string {
  return crypto.randomUUID();
}

export function getLocalIdentity(): LocalIdentity | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(IDENTITY_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as LocalIdentity;
    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.nickname !== 'string' ||
      !parsed.userId ||
      !parsed.nickname
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function setLocalIdentity(identity: LocalIdentity): void {
  localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(identity));
}

export function clearLocalIdentity(): void {
  localStorage.removeItem(IDENTITY_STORAGE_KEY);
}
