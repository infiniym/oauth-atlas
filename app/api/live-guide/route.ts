import { getRuntime } from '@/lib/server/runtime';
import { postGuide } from '@/lib/live-guide/http';
export const dynamic = 'force-dynamic';
export const maxDuration=240;
export async function POST(request: Request) { return postGuide(request,getRuntime()); }
