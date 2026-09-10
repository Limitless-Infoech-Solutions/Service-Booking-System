import { Fraunces, Manrope } from 'next/font/google';
import './globals.css';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const sans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata = {
  title: 'Studio Name | Book your next appointment',
  description:
    'Quality service, flexible scheduling, and easy online booking — all in one place.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="bg-stone-50 font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}