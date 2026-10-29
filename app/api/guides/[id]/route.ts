import { env } from 'cloudflare:workers';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^draft-[a-z0-9-]{20,60}$/.test(id))return Response.json({error:'Guide not found.'},{status:404});
 try{
  const row=await env.DB?.prepare('SELECT payload FROM guides WHERE id=?').bind(id).first<{payload:string}>();
  if(!row)return Response.json({error:'Guide not found.'},{status:404,headers:{'Cache-Control':'no-store'}});
  return new Response(row.payload,{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
 }catch{return Response.json({error:'The guide store is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
