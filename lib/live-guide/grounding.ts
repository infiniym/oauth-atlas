import type {Document} from './contracts.ts';

const routeKey=(s:string)=>decodeURIComponent(s).replace(/\{\?[^}]+\}/g,'').replace(/\{[^}]+\}|<[^>]+>|:[a-zA-Z_][\w-]*/g,'{input}').replace(/\/$/,'');
// A request URL and a documentation destination have different contracts.
// Compare the documented route template, then independently establish its host
// and query names. User values may vary; undocumented paths/hosts may not.
export function endpointEvidence(endpoint:string,documents:Document[]):{supported:boolean;reason:string;sourceIds:string[]}{
 let path:string,host='',query:URLSearchParams;
 try{const relative=endpoint.startsWith('/');if(!relative&&!/^https:\/\//.test(endpoint))throw new Error();const u=new URL(endpoint,'https://instance.invalid');if(u.username||u.password)throw new Error();path=routeKey(u.pathname);host=relative?'':u.origin;query=u.searchParams;}catch{return {supported:false,reason:'Use a documented HTTPS API URL or relative route template.',sourceIds:[]};}
 const matching=documents.filter(d=>{
  // Named URI variables may contain spaces (for example {id or name}).
  // Normalize only variable labels before extracting paths, not source quotes.
  const text=d.text.replace(/\{[a-zA-Z_][a-zA-Z0-9_| -]*\}/g,'{input}');
  const paths:string[]=text.match(/\/(?:[a-zA-Z0-9_{}<>:.-]+\/)*[a-zA-Z0-9_{}<>:.-]+/g)||[];
  for(const literal of text.match(/https?:\/\/[^\s"'`<>]+/g)||[])try{paths.push(new URL(literal).pathname);}catch{}
  const bases=documents.flatMap(source=>[...source.text.matchAll(/\b(?:base (?:path|url)|path must start with|API (?:base )?prefix)[^\r\n/]{0,60}(\/[a-zA-Z0-9_.\/-]+)/gi)].map(m=>m[1].replace(/[.\/]+$/,'')));
  return paths.some(p=>{try{return routeKey(p)===path||bases.some(base=>routeKey(base+p)===path);}catch{return false;}});
 });
 if(!matching.length)return {supported:false,reason:'The route template is absent from retrieved source text.',sourceIds:[]};
 if(host&&!documents.some(d=>d.text.includes(host)||[d.url,...d.links||[]].some(l=>{try{return new URL(l).origin===host&&!/docs|developers|reference/i.test(new URL(l).hostname);}catch{return false;}})))return {supported:false,reason:'The API host is not documented; retain an instance URL as user input when appropriate.',sourceIds:matching.map(d=>d.id)};
 const context=matching.map(d=>d.text).join('\n');
 const missing=[...query.keys()].filter(k=>!new RegExp('(?:^|[^a-zA-Z0-9_])'+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:$|[^a-zA-Z0-9_])').test(context));
 return {supported:!missing.length,reason:missing.length?'Undocumented query fields: '+missing.join(', '):'Documented route, host and query fields.',sourceIds:matching.map(d=>d.id)};
}
