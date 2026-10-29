import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
 title: 'OAuth Atlas — From setup to launch',
 description: 'Know the setup, review and approval path before you build. Evidence-backed OAuth guides and live provider research for agent developers.',
 icons: { icon: '/favicon.svg' },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
 return <html lang="en"><body>{children}</body></html>;
}
