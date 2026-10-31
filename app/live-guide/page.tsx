import type { Metadata } from 'next';
import LiveGuideWorkspace from '@/components/live-guide/workspace';
export const metadata: Metadata = {title:'Live OAuth Guide — Research a provider',description:'Research an unfamiliar OAuth provider and create a shareable, source-backed setup draft.'};
export default function LiveGuidePage() { return <LiveGuideWorkspace/>; }
