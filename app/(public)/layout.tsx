import { IdentityProvider } from '@/components/identity/IdentityProvider';

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <IdentityProvider>{children}</IdentityProvider>;
}
