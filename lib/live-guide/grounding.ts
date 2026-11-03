import {onProvider,type Document} from './contracts.ts';
import {sourceKey} from './retrieval.ts';

const routeKey=(s:string)=>decodeURIComponent(s).replace(/\{\?[^}]+\}/g,'').replace(/\{[^}]+\}|<[^>]+>|:[a-zA-Z_][\w-]*/g,'{input}').replace(/\/$/,'');

// General pagination parameters apply only when the operation documents
// pagination and links to the protocol guide for the same provider. Keep
// keyset/offset sections separate when the request chooses a mode.
function linkedPagination(matching:Document[],documents:Document[],mode:string|null){
 const canonical=(url:string)=>sourceKey(url.split('#')[0]);
 return documents.flatMap(source=>{
  if(!/paginat|collections|rest api|api usage|general concepts/i.test(source.title+' '+source.url))return [];
  if(!matching.some(operation=>operation.id!==source.id&&onProvider(source.url,operation.url)&&/paginat/i.test(operation.text)&&operation.links?.some(link=>canonical(link)===canonical(source.url))))return [];
  const lines=source.text.split('\n');
  const headings=lines.flatMap((line,index)=>{
   const heading=line.match(/^\s*(?:#+\s*)?(?:(keyset|offset|cursor)(?:[- ]based)?\s+)?pagination(?:\s+(?:link|response)\s+headers?)?\s*$/i);
   return heading?[{index,mode:heading[1]?.toLowerCase()}]:[];
  });
  const declarations=headings.flatMap((heading,i)=>{
   const defaultMode=heading.mode&&new RegExp('\\b'+heading.mode+'(?:[- ]based)? pagination[. :–—-]+(?:is )?(?:the )?default\\b','i').test(source.text);
   if(heading.mode&&heading.mode!==mode&&(mode||!defaultMode))return [];
   const body=lines.slice(heading.index+1,Math.min(headings[i+1]?.index??lines.length,heading.index+65));
   const first=body.findIndex(line=>/^\s*\|?\s*(?:parameter|attribute|name)\s*(?:\|\s*)?(?:(?:required|type)\s*(?:\|\s*)?)*description\b/i.test(line));
   if(first<0)return [];
   const fields:string[]=[];
   for(const line of body.slice(first+1)){
    if(/^\s*[|:\s-]+$/.test(line))continue;
    const field=line.match(/^\s*\|?\s*`?([a-z][\w-]*)`?(?:\s*\||\s+(?:(?:yes|no|integer|string|number|boolean)\b|[A-Z]))/);
    if(!field)break;
    fields.push(field[1]);
   }
   return fields;
  });
  return declarations.length?[{id:source.id,fields:new Set(declarations)}]:[];
 });
}
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
 const sourceIds=new Set(matching.map(d=>d.id));
 const pagination=query.size?linkedPagination(matching,documents,query.get('pagination')?.toLowerCase()||null):[];
 const missing=[...query.keys()].filter(key=>{
  const field=new RegExp('(?:^|[^a-zA-Z0-9_])'+key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:$|[^a-zA-Z0-9_])');
  if(field.test(context))return false;
  const reference=pagination.find(source=>source.fields.has(key));
  if(!reference)return true;
  sourceIds.add(reference.id);
  return false;
 });
 return {supported:!missing.length,reason:missing.length?'Undocumented query fields: '+missing.join(', '):'Documented route, host and query fields.',sourceIds:[...sourceIds]};
}
