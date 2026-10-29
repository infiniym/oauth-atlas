import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
 title: 'OAuth Atlas — OAuth setup & approval',
 description: 'OAuth setup and approval guides for agent developers. Compare requirements, inspect evidence, research unfamiliar toolkits and understand the product decisions.',
 icons: { icon: '/favicon.svg' },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
 return <html lang="en"><body>{children}</body></html>;
}
