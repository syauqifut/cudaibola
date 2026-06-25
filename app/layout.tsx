import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Cudaibola',
  description: 'Tebak skor pertandingan — poin virtual, bukan uang asli.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen bg-pitch-white font-sans font-medium text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
