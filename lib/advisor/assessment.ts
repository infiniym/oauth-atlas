import {z} from 'zod';
import {capabilities,emptyAssessment} from './providers.ts';
import type {Assessment,Intent} from './types.ts';
const choice=z.enum(['yes','no','unknown']);
export const assessmentSchema=z.object({version:z.literal(1),provider:z.enum(['gmail','slack','github']),description:z.string().max(1500),capabilities:z.array(z.string().max(30)).max(8),audience:z.enum(['personal','organization','pilot','public','unknown']),stage:z.enum(['test','production','unknown']),branding:choice,background:choice,dataHandling:z.enum(['servers','device','unknown']),workspaceOnly:choice,slackIdentity:z.enum(['bot','user','unknown']),repoAccess:z.enum(['public','selected','all','unknown']),orgPolicy:z.enum(['restricted','standard','unknown']),managedScopes:z.enum(['unknown','supported','unsupported']),customScopes:choice,dedicatedQuota:choice,customInstance:choice,special:z.string().max(1000)}).strict().superRefine((a,ctx)=>{if(a.capabilities.some(id=>!capabilities[a.provider].some(c=>c.id===id)))ctx.addIssue({code:z.ZodIssueCode.custom,message:'Choose capabilities from the selected provider.'});});
export function validateAssessment(value:unknown):Assessment{return assessmentSchema.parse(value);}
export function encodeAssessment(a:Assessment){return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(validateAssessment(a))))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export function decodeAssessment(encoded:string):Assessment{if(encoded.length>16000)throw new Error('This assessment link is too long.');const binary=atob(encoded.replace(/-/g,'+').replace(/_/g,'/'));return validateAssessment(JSON.parse(new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0)))));}
export function assessmentKey(a:Assessment){let hash=2166136261;for(const c of JSON.stringify(validateAssessment(a))){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}return 'advisor-v1-'+(hash>>>0).toString(36);}
// A transparent keyless suggestion pass. It never sets scopes, approval rules or firm conclusions.
export function parseIntentLocally(description:string):Intent{
 const text=description.toLowerCase();const matches=(['gmail','slack','github'] as const).filter(p=>new RegExp(p==='gmail'?'gmail|google mail':p==='github'?'github|git hub':p).test(text));
 const provider=matches.length===1?matches[0]:null;const result:Intent={provider,capabilities:[],background:'unknown',audience:'unknown',repoAccess:'unknown',slackIdentity:'unknown',unresolved:[]};
 if(!provider){result.unresolved.push(matches.length>1?'This describes multiple providers. Assess one integration at a time.':'Select the provider; no supported provider was identified.');return result;}
 const negated=/\b(no|not|without|never|don.t)\b/.test(text);
 if(!negated){
  if(provider==='gmail'){
   if(/read|summari[sz]|inbox|incoming/.test(text))result.capabilities.push('read');
   if(/metadata|headers/.test(text)){result.capabilities=result.capabilities.filter(c=>c!=='read');result.capabilities.push('metadata');}
   if(/draft/.test(text))result.capabilities.push('draft');
   if(/send/.test(text))result.capabilities.push('send');
   if(/modify|trash|delete/.test(text)){result.capabilities.push('modify');if(/delete/.test(text))result.unresolved.push('Permanent deletion is outside this capability map; modifying or trashing does not bypass Trash.');}
  }else if(provider==='slack'){
   if(/read|summari[sz]|discussion|history/.test(text))result.capabilities.push('read');
   if(/post|send|publish/.test(text))result.capabilities.push('post');
   if(/private/.test(text))result.capabilities.push('private');
   if(/\bbot\b/.test(text))result.slackIdentity='bot';else if(/as (a |the )?user/.test(text))result.slackIdentity='user';
  }else{
   if(/code|contents|files/.test(text))result.capabilities.push('contents');
   if(/pull request|\bprs?\b|code.review/.test(text))result.capabilities.push('pulls');
   if(/review|comment/.test(text))result.capabilities.push('review');
   if(/creat(e|ing)|modify|update/.test(text)&&/pull request|\bpr\b/.test(text))result.capabilities.push('write');
   if(/identity|profile|sign.in|login/.test(text))result.capabilities.push('identity');
   if(/selected|specific repos/.test(text))result.repoAccess='selected';else if(/public repos/.test(text))result.repoAccess='public';
   if(/comment/.test(text))result.unresolved.push('Confirm inline PR reviews versus general conversation comments; this map covers PR reviews.');
  }
  if(/overnight|background|scheduled|daily|monitor|automat/.test(text))result.background='yes';
  if(/customers|customer.facing|public app/.test(text))result.audience='public';
  if(/pilot/.test(text))result.audience='pilot';else if(/just me|personal/.test(text))result.audience='personal';else if(/internal|my team|our team/.test(text))result.audience='organization';
 }else result.unresolved.push('The description contains a negation. Select the intended actions explicitly so the fallback does not invert your intent.');
 if(!result.capabilities.length)result.unresolved.push('Choose the actions your integration needs.');
 result.unresolved.push('Confirm audience, launch stage, branding and the provider-specific questions.');return result;
}
export function applyIntent(description:string,intent:Intent):Assessment{return {...emptyAssessment(intent.provider||'gmail'),description,capabilities:intent.provider?intent.capabilities.filter(id=>capabilities[intent.provider!].some(c=>c.id===id)):[],background:intent.background,audience:intent.audience,repoAccess:intent.repoAccess,slackIdentity:intent.slackIdentity};}
