import { env } from 'cloudflare:workers';
import { postGuide } from '@/lib/live-guide/http';
import type { Bindings } from '@/lib/live-guide/contracts';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) { return postGuide(request,env as typeof env & Bindings); }
