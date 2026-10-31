import { env } from 'cloudflare:workers';
import { getGuide } from '@/lib/live-guide/http';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, {params}: {params:Promise<{id:string}>}) { return getGuide((await params).id,env); }
