import type {Document} from './contracts.ts';

// Parse only the single curl command, then quote arguments literally. Never
// execute generated text. Newlines inside JSON/headers stay inside their word.
export function shellSafeCurl(example:string):string{
 const text=example.replace(/\\\r?\n/g,' ').replace(/\\ (?=-[A-Za-z])/g,' ');
 if(!/^curl\s/.test(text.trim()))return example;
 const words:string[]=[];let word='',quote='',active=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quote){if(ch===quote)quote='';else if(ch==='\\'&&quote==='"'&&/["\\$`]/.test(text[i+1]||''))word+=text[++i];else word+=ch;active=true;continue;}
  if(ch==='"'||ch==="'"){quote=ch;active=true;continue;}
  if(ch==='\\'&&i+1<text.length){word+=text[++i];active=true;continue;}
  if(/\s/.test(ch)){if(active){words.push(word);word='';active=false;}continue;}
  word+=ch;active=true;
 }
 if(quote)throw new Error('A request example has an unclosed shell quote.');
 if(active)words.push(word);
 if(words.some(w=>/^(?:\||&&|;|>)$/.test(w)))throw new Error('A request example must contain one curl command.');
 return words.map((w,i)=>i===0?w:"'"+w.replace(/'/g,"'\\''")+"'").join(' ');
}
export function completeRequestExamples<T extends {steps?:unknown}>(raw:T,documents:Document[]):T{
 const result=structuredClone(raw);
 if(!Array.isArray(result.steps))return result;
 const source=documents.map(d=>d.text).join('\n');
 for(const step of result.steps){
  if(!step?.request?.example)continue;
  let example=String(step.request.example);
  let instanceInput=false;
  example=example.replace(/https:\/\/((?:<[^>]+>|\[[^\]]+\]|\{[^}]+\}|[^/\s'"])+)/g,(whole,authority)=>{
   if(!/[<\[{]/.test(authority))return whole;
   instanceInput=true;return '<INSTANCE_BASE_URL>';
  });
  if(instanceInput){
   const caption='INSTANCE_BASE_URL: your full HTTPS instance URL, without a trailing slash';
   const at=(step.fields||[]).findIndex((f:string)=>/instance|\bhost\b|_HOST|base.?url/i.test(f));
   step.fields=step.fields||[];if(at>=0)step.fields[at]=caption;else if(step.fields.length<8)step.fields.push(caption);
  }
  // Documentation-derived version headers are facts, not developer inputs.
  example=example.replace(/([\w-]+-Version):\s*(<[^>]+>|[A-Z][A-Z_]+|\d{4}-\d{2}-\d{2})/gi,(whole,header,current)=>{
   const literal=[...source.matchAll(new RegExp(header+':?\\s*["\'`]?\\s*(\\d{4}-\\d{2}-\\d{2})','gi'))].map(m=>m[1]).sort().at(-1);
   if(!literal){if(!/^\d{4}-\d{2}-\d{2}$/.test(current))throw new Error('A required request version is not established by the supplied sources.');return whole;}
   return header+': '+literal;
  });
  step.request.example=shellSafeCurl(example);
  step.fields=step.fields||[];
  if(step.fields.length<8&&/Bearer\s+(?:<[^>]+>|[A-Z][A-Z_]+)/.test(example)&&!step.fields.some((s:string)=>/token/i.test(s)))step.fields.push('Access token: backend OAuth exchange for the test account; keep it out of this guide');
  for(const match of String(step.request.endpoint||'').matchAll(/\{([\w]{1,45})\}/g))if(step.fields.length<8&&!step.fields.some((s:string)=>s.toLowerCase().includes(match[1].toLowerCase())))step.fields.push(match[1]+': test resource ID from provider UI/list response');
 }
 return result;
}
