import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
 title: 'OAuth Launch Advisor — Find your integration path',
 description: 'Turn your integration idea into a source-backed authentication, permission and launch plan. Guided assessments for Gmail, Slack and GitHub, with broader provider discovery.',
 icons: { icon: '/favicon.svg' },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
 return <html lang="en"><body>{children}</body></html>;
}
