import {env} from 'cloudflare:workers';
import {jobRequest} from '@/lib/live-guide/job-http';
export const dynamic='force-dynamic';
export async function POST(request:Request){return jobRequest(request,env);}
