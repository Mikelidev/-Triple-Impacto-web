import type { Metadata } from 'next';
import { Newsreader, Inter } from 'next/font/google';
import './globals.css';

const newsreader = Newsreader({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal'],
});

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Triple Impacto — gestión de datos',
  description: 'Consolidación e indicadores de los establecimientos ganaderos.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es">
      <body className={`${newsreader.variable} ${inter.variable}`}>{children}</body>
    </html>
  );
}
