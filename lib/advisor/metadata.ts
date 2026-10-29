import {metadataSnapshot} from './providers.ts';
import type {ManagedMetadata,ProviderId} from './types.ts';
export async function getMetadata(provider:ProviderId,key?:string,bot=false,fetcher:typeof fetch=fetch):Promise<ManagedMetadata>{
 const slug=provider==='slack'&&bot?'slackbot':provider;const fallback={...metadataSnapshot(provider),toolkitSlug:slug};
 if(!key)return {...fallback,note:'No Composio API key configured. Using the dated documentation snapshot; scope suitability remains unverified.'};
 try{
  const r=await fetcher('https://backend.composio.dev/api/v3.1/toolkits/'+slug,{headers:{'x-api-key':key},signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw new Error('Metadata unavailable');
  const json=await r.json() as {auth_config_details?:{mode?:unknown}[];composio_managed_auth_schemes?:unknown};
  if(!Array.isArray(json.auth_config_details)||!Array.isArray(json.composio_managed_auth_schemes)||!json.composio_managed_auth_schemes.every(v=>typeof v==='string'))throw new Error('Metadata incomplete');
  const methods=json.auth_config_details.map(v=>v.mode).filter((v):v is string=>typeof v==='string').map(v=>v.toUpperCase());
  if(!methods.length)throw new Error('Missing methods');
  return {provider,toolkitSlug:slug,authMethods:[...new Set(methods)],managedMethods:json.composio_managed_auth_schemes.map(v=>String(v).toUpperCase()),origin:'Live Composio API',checkedAt:new Date().toISOString(),scopeCoverage:'unknown',note:'Read the exact managed schemes from the API. Required versus granted scopes and token identity still need validation.'};
 }catch{return {...fallback,note:'The Composio API lookup failed or returned incomplete metadata. Retaining the documentation snapshot; this does not mean managed OAuth is unavailable.'};}
}
