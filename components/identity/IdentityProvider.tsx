'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { NicknamePrompt } from '@/components/identity/NicknamePrompt';
import {
  generateUserId,
  getLocalIdentity,
  setLocalIdentity,
  type LocalIdentity,
} from '@/lib/client/identity-storage';

type IdentityContextValue = {
  identity: LocalIdentity | null;
  isReady: boolean;
  saveNickname: (nickname: string) => Promise<void>;
};

const IdentityContext = createContext<IdentityContextValue | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<LocalIdentity | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const stored = getLocalIdentity();
    setIdentity(stored);
    setShowPrompt(stored === null);
    setIsReady(true);
  }, []);

  const saveNickname = useCallback(
    async (nickname: string) => {
      const userId = identity?.userId ?? generateUserId();

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, nickname }),
      });

      const data = (await response.json()) as { error?: string; nickname?: string };

      if (!response.ok) {
        throw new Error(data.error ?? 'Gagal menyimpan nickname.');
      }

      const saved: LocalIdentity = {
        userId,
        nickname: data.nickname ?? nickname,
      };

      setLocalIdentity(saved);
      setIdentity(saved);
      setShowPrompt(false);
    },
    [identity?.userId],
  );

  const value = useMemo(
    () => ({ identity, isReady, saveNickname }),
    [identity, isReady, saveNickname],
  );

  return (
    <IdentityContext.Provider value={value}>
      {children}
      {isReady && showPrompt && <NicknamePrompt onSubmit={saveNickname} />}
    </IdentityContext.Provider>
  );
}

export function useIdentity(): IdentityContextValue {
  const context = useContext(IdentityContext);
  if (!context) {
    throw new Error('useIdentity must be used within IdentityProvider');
  }
  return context;
}
