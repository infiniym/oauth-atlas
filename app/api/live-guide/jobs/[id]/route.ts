import { getRuntime, retainJob } from '@/lib/server/runtime';
import {jobRequest} from '@/lib/live-guide/job-http';
export const dynamic='force-dynamic';
export const maxDuration=240;
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return jobRequest(request,getRuntime(),(await params).id);}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return jobRequest(request,getRuntime(),(await params).id,fetch,retainJob);}
