import { getRuntime } from '@/lib/server/runtime';
import { getGuide } from '@/lib/live-guide/http';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, {params}: {params:Promise<{id:string}>}) { return getGuide((await params).id,getRuntime()); }
