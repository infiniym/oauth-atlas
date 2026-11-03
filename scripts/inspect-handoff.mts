// Acceptance-only request stub. It parses generated curl; it never runs it or
// calls a provider. Dummy values exercise user inputs, headers and JSON bodies.
import {spawnSync} from 'node:child_process';
export function inspectHandoff(guide:any){
 const substitute=(s:string)=>s.replace(/<([^<>]+)>|\$\{([\w]+)\}|\$([A-Z][A-Z0-9_]+)|\b([A-Z][A-Z0-9]*_[A-Z0-9_]+)\b|\{([a-zA-Z_]\w*)\}|\[([A-Z][A-Z_-]+)\]/g,(whole,...groups)=>{
  const key=groups.slice(0,6).find(Boolean)||'';
  if(/version/i.test(key))return whole;
  if(/(?:base|instance).*(?:url|host)|(?:url|host).*(?:base|instance)/i.test(key))return /url/i.test(key)?'https://instance.example':'instance.example';
  if(/token/i.test(key))return 'test-access-token';
  if(/cursor/i.test(key))return 'test-next-cursor';
  return 'test-resource-id';
 });
 return guide.steps.filter((s:any)=>s.testKind==='action').map((step:any)=>{
  const example=step.request?.example||'',syntax=spawnSync('/bin/bash',['-n'],{input:example,encoding:'utf8'});
  const split=spawnSync('python3',['-c','import shlex,json,sys;print(json.dumps(shlex.split(sys.stdin.read())))'],{input:substitute(example),encoding:'utf8'});
  let args:string[]=[];try{args=JSON.parse(split.stdout);}catch{}
  const values=(...flags:string[])=>args.flatMap((a,i)=>flags.includes(a)&&args[i+1]?[args[i+1]]:[]);
  const body=values('-d','--data','--data-raw','--data-binary','--json'),headerLines=values('-H','--header');
  const method=(values('-X','--request')[0]||(body.length?'POST':'GET')).toUpperCase();
  const rawUrl=values('--url')[0]||args.find(a=>/^https:\/\//.test(a));
  const errors:string[]=[];let url:URL|undefined;
  try{url=new URL(rawUrl!);if(url.protocol!=='https:'||url.username||url.password||/^(?:https?|test-resource-id)$/.test(url.hostname))throw Error();}catch{errors.push('No usable HTTPS URL after substituting user inputs');}
  if(syntax.status!==0||args[0]!=='curl'||args.some(a=>[';','&&','|','>'].includes(a)))errors.push('Example must be one parseable curl request');
  if(method!==step.request?.method.toUpperCase())errors.push('Method differs from request metadata');
  const headers=Object.fromEntries(headerLines.map(h=>{const i=h.indexOf(':');return [h.slice(0,i).toLowerCase(),h.slice(i+1).trim()];}));
  if(guide.accessModel==='oauth'&&!/^Bearer test-access-token$/i.test(headers.authorization||''))errors.push('Missing replaceable OAuth bearer token');
  if(body.length&&!headers['content-type'])errors.push('Missing request content type');
  const parsedBody=body.map(b=>{if(/^\s*[\[{]/.test(b))try{return JSON.parse(b);}catch{errors.push('Malformed JSON body after substitution');}return b;});
  if(/-Version:\s*(?:<|\$|[A-Z_]+(?:'|"|\s|$))/i.test(example))errors.push('Unresolved documentation-derived version header');
  const boundary=step.detail+' '+step.doneWhen+' '+guide.steps.filter((s:any)=>s.testKind==='boundary').map((s:any)=>s.detail).join(' ');
  if(!/boundary|unshared|unselected|outside.+(?:reject|denied|403|404)|inspect.+(?:grant|request log)|unauthori[sz]ed.+401/i.test(boundary))errors.push('No safe boundary check instruction');
  if(!step.fields?.length)errors.push('User input provenance absent');
  if(!/response|returns?|HTTP|200|results|entries|collection|names|titles|nodes/i.test(step.doneWhen+' '+step.detail))errors.push('Expected successful response absent');
  // This is the request received by the stub, not a canned HTTP success.
  const stub={method,url:url?.href,headers,body:parsedBody};
  return {stepId:step.id,stub,syntaxChecked:true,userInputsSubstituted:true,executed:false,errors};
 });
}
export function paginationHandoff(guide:any,requests:ReturnType<typeof inspectHandoff>){
 const instructions=guide.steps.filter((s:any)=>s.testKind==='action').map((s:any)=>s.detail+' '+s.doneWhen).join(' ');
 const continuation=requests.some((r:{stub:unknown})=>/[?&][\w.\[\]-]*(?:cursor|page|offset|after|before|skip)[\w.\[\]-]*=|"[\w.-]*(?:cursor|after|offset|page|next_token)[\w.-]*"\s*:|\bafter\s*:/i.test(JSON.stringify(r.stub)));
 return continuation&&/repeat|continu|follow|iterat|next request/i.test(instructions)&&/until|while|has_more|hasNextPage|next_cursor|endCursor|no.{0,30}next|empty|last page|all (?:entries|results|pages)/i.test(instructions);
}
