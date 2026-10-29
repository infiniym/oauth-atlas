import {env} from 'cloudflare:workers';
import {getMetadata} from '@/lib/advisor/metadata';
import type {ProviderId} from '@/lib/advisor/types';
export const dynamic='force-dynamic';
const cache=new Map<string,{expires:number;value:unknown}>();
export async function GET(request:Request){
 const params=new URL(request.url).searchParams,p=params.get('provider');if(!['gmail','slack','github'].includes(p||''))return Response.json({error:'Select a supported assessment provider.'},{status:400});
 const bot=params.get('identity')==='bot',cacheKey=p+':'+bot,cached=cache.get(cacheKey);
 if(cached&&cached.expires>Date.now())return Response.json(cached.value,{headers:{'Cache-Control':'public, max-age=120'}});
 const config=env as unknown as {COMPOSIO_API_KEY?:string};const value=await getMetadata(p as ProviderId,config.COMPOSIO_API_KEY,bot);
 cache.set(cacheKey,{expires:Date.now()+120000,value});return Response.json(value,{headers:{'Cache-Control':'public, max-age=120','X-Content-Type-Options':'nosniff'}});
}
