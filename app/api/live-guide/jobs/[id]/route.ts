import {env} from 'cloudflare:workers';
import {getRequestExecutionContext} from 'vinext/shims/request-context';
import {jobRequest} from '@/lib/live-guide/job-http';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return jobRequest(request,env,(await params).id);}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const context=getRequestExecutionContext();return jobRequest(request,env,(await params).id,fetch,context?promise=>context.waitUntil(promise):undefined);}
