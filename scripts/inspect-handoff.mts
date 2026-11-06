// Acceptance-only request stub. It parses generated curl; it never runs it or
// calls a provider. Dummy values exercise user inputs, headers and JSON bodies.
import {spawnSync} from 'node:child_process';
import {hasPaginationPair} from '../lib/live-guide/request-examples.ts';
export type InspectedRequest={stepId:string;stub:{method:string;url?:string;headers:Record<string,string>;body:unknown[]};syntaxChecked:true;userInputsSubstituted:true;executed:false;errors:string[]};
export function inspectHandoff(guide:any,options:{requireResponsePath?:boolean}={}):InspectedRequest[]{
 const substitute=(s:string,endpoint='')=>s.replace(/<([^<>]+)>|\$\{([\w]+)\}|\$([A-Z][A-Z0-9_]+)|\b([A-Z][A-Z0-9]*_[A-Z0-9_]+)\b|\{([a-zA-Z_]\w*)\}|\[([A-Z][A-Z_-]+)\]/g,(whole,...groups)=>{
  const key=groups.slice(0,6).find(Boolean)||'';
  if(/version/i.test(key))return whole;
  if(/^(?:NEXT|CONTINUATION)(?:_PAGE)?_(?:URL|LINK)$/.test(key))return new URL(endpoint.replace(/\{[^}]+\}|:[a-zA-Z_]+/g,'test-resource-id'),'https://instance.example').href+'?page=2';
  if(/(?:base|instance).*(?:url|host)|(?:url|host).*(?:base|instance)/i.test(key))return /url/i.test(key)?'https://instance.example':'instance.example';
  if(/redirect|callback/i.test(key)&&/uri|url/i.test(key))return 'https://client.example/callback';
  if(/client.*secret/i.test(key))return 'test-client-secret';
  if(/client.*id/i.test(key))return 'test-client-id';
  if(/token/i.test(key))return 'test-access-token';
  if(/cursor/i.test(key))return 'test-next-cursor';
  return 'test-resource-id';
 });
 return guide.steps.filter((s:any)=>s.testKind==='action'||s.testKind==='authorization'&&s.request?.example).map((step:any)=>{
  const example=step.request?.example||'',syntax=spawnSync('/bin/bash',['-n'],{input:example,encoding:'utf8'});
  const split=spawnSync('python3',['-c','import shlex,json,sys;print(json.dumps(shlex.split(sys.stdin.read())))'],{input:substitute(example,step.request?.endpoint||''),encoding:'utf8'});
  let args:string[]=[];try{args=JSON.parse(split.stdout);}catch{}
  const values=(...flags:string[])=>args.flatMap((a,i)=>flags.includes(a)&&args[i+1]?[args[i+1]]:[]);
  const body=values('-d','--data','--data-raw','--data-binary','--data-urlencode','--json'),headerLines=values('-H','--header');
  const method=(values('-X','--request')[0]||(body.length?'POST':'GET')).toUpperCase();
  const rawUrl=values('--url')[0]||args.find(a=>/^https:\/\//.test(a));
  const errors:string[]=[];let url:URL|undefined;
  try{url=new URL(rawUrl!);if(url.protocol!=='https:'||url.username||url.password||/^(?:https?|test-resource-id)$/.test(url.hostname))throw Error();}catch{errors.push('No usable HTTPS URL after substituting user inputs');}
  if(syntax.status!==0||args[0]!=='curl'||args.some(a=>[';','&&','|','>'].includes(a)))errors.push('Example must be one parseable curl request');
  if(method!==step.request?.method.toUpperCase())errors.push('Method differs from request metadata');
  const headers=Object.fromEntries(headerLines.map(h=>{const i=h.indexOf(':');return [h.slice(0,i).toLowerCase(),h.slice(i+1).trim()];}));
  if(body.length&&!headers['content-type'])headers['content-type']=args.includes('--json')?'application/json':'application/x-www-form-urlencoded';
  const basic=values('-u','--user')[0];if(basic)headers.authorization='Basic '+Buffer.from(basic).toString('base64');
  if(guide.accessModel==='oauth'&&step.testKind==='action'&&!/^Bearer test-access-token$/i.test(headers.authorization||''))errors.push('Missing replaceable OAuth bearer token');
  const parsedBody=body.map(b=>{if(/^\s*[\[{]/.test(b))try{return JSON.parse(b);}catch{errors.push('Malformed JSON body after substitution');}return b;});
  if(parsedBody.some(b=>b&&typeof b==='object')&&!/application\/(?:[^;]+\+)?json\b/i.test(headers['content-type']||''))errors.push('JSON body requires the documented JSON content type');
  if(/-Version:\s*(?:<|\$|[A-Z_]+(?:'|"|\s|$))/i.test(example))errors.push('Unresolved documentation-derived version header');
  const boundary=step.detail+' '+step.doneWhen+' '+guide.steps.filter((s:any)=>s.testKind==='boundary').map((s:any)=>s.detail).join(' ');
  if(step.testKind==='action'&&!/boundary check:\s*(?!none\b|not (?:needed|required|applicable)\b|n\/a\b)\S[^.;\n]{11}/i.test(step.detail+' '+step.doneWhen))errors.push('No safe boundary check instruction');
  if(!step.fields?.length)errors.push('User input provenance absent');
  if(options.requireResponsePath&&step.testKind==='action'&&!/^\$(?:(?:\.[A-Za-z_*][\w*:-]*)|(?:\[(?:\*|\d*)\]))+$/.test(step.request?.responsePath||''))errors.push('Explicit expected JSON response path absent');
  const outcome=step.doneWhen+' '+step.detail;
  // A documented Boolean response condition is observable output even if the
  // prose omits the literal word "response". Request-body flags do not qualify.
  const requestKeys=new Set(parsedBody.flatMap(value=>value&&typeof value==='object'?Object.keys(value):[]));
  const responseCondition=(step.evidence||[]).some((e:{quote:string})=>[...String(e.quote).matchAll(/([a-zA-Z_][\w.]*)\s+\(?boolean\)?\b/gi)].some(match=>{const field=match[1].replace(/^\./,'');return !requestKeys.has(field)&&new RegExp('\\b'+field.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b\\s*(?:is|=|:)?\\s*(?:true|false)\\b','i').test(outcome);}));
  const scalar=step.request?.responsePath?.match(/\.([A-Za-z_][\w:-]*)$/)?.[1],documentedScalar=scalar&&(step.evidence||[]).some((e:{quote:string})=>new RegExp('\\b'+scalar+'\\b').test(e.quote));
  if(!/response|returns?|HTTP|200|results|entries|collection|names|titles|nodes/i.test(outcome)&&!responseCondition&&!documentedScalar&&!(step.testKind==='authorization'&&(/callback|authorization code|access_token/i.test(outcome)||/redirect/i.test(outcome)&&/\bcode\b/i.test(outcome))))errors.push('Expected successful response absent');
  // This is the request received by the stub, not a canned HTTP success.
  const stub={method,url:url?.href,headers,body:parsedBody};
  return {stepId:step.id,stub,syntaxChecked:true,userInputsSubstituted:true,executed:false,errors};
 });
}
export function paginationHandoff(guide:any,requests:ReturnType<typeof inspectHandoff>){
 const instructions=guide.steps.filter((s:any)=>s.testKind==='action').map((s:any)=>s.detail+' '+s.doneWhen).join(' ');
 const actions=guide.steps.filter((s:any)=>s.testKind==='action'),checked=new Set(requests.filter(r=>!r.errors.length).map(r=>r.stepId));
 const continuation=hasPaginationPair(actions.filter((step:any)=>checked.has(step.id)));
 return actions.filter((step:any)=>checked.has(step.id)).length>=2&&continuation&&/repeat|continu|follow|iterat|next request/i.test(instructions)&&/until|while|has_more|hasNextPage|next_cursor|endCursor|no.{0,30}next|empty|last page|all (?:entries|results|pages)/i.test(instructions);
}
