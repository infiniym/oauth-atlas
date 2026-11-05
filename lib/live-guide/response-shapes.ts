// Keep the containing response object beside its fields when a long official
// example or schema is compressed. Paths and types are derived, never inferred.
export function schemaPriority(node:any,request='',depth=0):number{
 if(!node||typeof node!=='object'||depth>3)return 0;
 const words=request.toLowerCase().split(/\W+/).filter(word=>word.length>3).map(word=>word.replace(/ies$/,'y').replace(/s$/,''));
 const keyRank=(key:string)=>words.some(word=>key.toLowerCase().includes(word))?100:/^(?:plain_text|results|data|items|nodes|edges|properties|pageInfo|next_cursor|has_more)$/.test(key)?20:0;
 return Math.max(0,...Object.keys(node.properties||{}).map(keyRank),...['oneOf','anyOf','allOf'].flatMap(key=>(Array.isArray(node[key])?node[key]:[]).map((branch:any)=>schemaPriority(branch,request,depth+1))),...Object.values(node.properties||{}).map(child=>schemaPriority(child,request,depth+1)))+(typeof node.$ref==='string'?keyRank(node.$ref):0);
}
export function responsePaths(value:unknown,schema=false,request=''):string[]{
 const paths=new Set<string>();
 const walk=(node:any,path:string,depth:number)=>{
  if(depth>14||paths.size>=200)return;
  if(schema){
   for(const key of ['oneOf','anyOf','allOf'])for(const branch of [...Array.isArray(node?.[key])?node[key]:[]].sort((a,b)=>schemaPriority(b,request)-schemaPriority(a,request)))walk(branch,path,depth+1);
   if(node?.properties)for(const [key,child] of Object.entries(node.properties).sort((a,b)=>schemaPriority({properties:{[b[0]]:b[1]}},request)-schemaPriority({properties:{[a[0]]:a[1]}},request)))walk(child,path+'.'+key,depth+1);
   else if(node?.items)walk(node.items,path+'[]',depth+1);
   else if(node?.type)paths.add(path+' ('+node.type+')');
   if(node?.additionalProperties&&typeof node.additionalProperties==='object')walk(node.additionalProperties,path+'.*',depth+1);
  }else if(Array.isArray(node)){
   if(path!=='$')paths.add(path+' (array)');
   for(const child of node.slice(0,3))walk(child,path+'[]',depth+1);
  }else if(node&&typeof node==='object'){
   if(path!=='$')paths.add(path+' (object)');
   for(const [key,child] of Object.entries(node))walk(child,path+'.'+key,depth+1);
  }
  else paths.add(path+' ('+(node===null?'null':typeof node)+')');
 };
 walk(value,'$',0);
 const requested=request.toLowerCase().split(/\W+/).filter(word=>word.length>3).map(word=>word.replace(/ies$/,'y').replace(/s$/,''));
 const preferred=(path:string)=>(requested.some(word=>path.toLowerCase().includes('.'+word))?100:0)+(/\.(?:title|name|content|subject|markdown|plain_text|value|results|total|count|has_more|next_cursor|hasNextPage|endCursor)(?:\[\])? \(/.test(path)?1:0);
 return [...paths].sort((a,b)=>preferred(b)-preferred(a)||a.length-b.length).slice(0,40);
}

export function jsonExampleAt(text:string,at:number):unknown{
 if(at<0||!/[{\[]/.test(text[at]||''))return undefined;
 let depth=0,quoted=false,escaped=false,end=at;
 for(;end<Math.min(text.length,at+100000);end++){
  const char=text[end];
  if(quoted){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')quoted=false;continue;}
  if(char==='"')quoted=true;
  else if(char==='['||char==='{')depth++;
  else if(char===']'||char==='}'){depth--;if(!depth)break;}
 }
 try{return JSON.parse(text.slice(at,end+1));}catch{return undefined;}
}
export function responseSamples(text:string,terms:string[]=[]):{operation:string;value:unknown}[]{
 const examples:{operation:string;value:unknown}[]=[];
 for(const heading of text.matchAll(/(?:Example response|Response samples|Response:|(?:^|\n)\s*200(?:\s*\n\s*[45]\d{2}){0,20}\s*\n(?=\s*[{\[]))\s*/gi)){
  const prefix=text.slice(0,heading.index);
  if(/\b(?:error|failed|failure)\s*$/i.test(prefix.slice(prefix.lastIndexOf('\n')+1)))continue;
  const operation=[...prefix.matchAll(/\b(?:GET|POST|PUT|PATCH|DELETE)\s+(?:https:\/\/[^\s"']+|\/[^\s"'<>]+)|(?:--url|curl)\s+["']?https:\/\/[^\s"']+/gi)].at(-1)?.[0];
  if(!operation||terms.length&&!terms.some(term=>operation.toLowerCase().includes(term)))continue;
  const start=text.indexOf('{',heading.index!+heading[0].length),array=text.indexOf('[',heading.index!+heading[0].length);
  const at=array>=0&&(start<0||array<start)?array:start;
  if(at<0||at-heading.index!>350)continue;
  const value=jsonExampleAt(text,at);if(value===undefined)continue;
  if(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).some(key=>['error','errors','error_description'].includes(key))&&!Object.keys(value).some(key=>!['error','errors','error_description','message','status','code'].includes(key)))continue;
  examples.push({operation,value});
  if(examples.length>=24)break;
 }
 return examples;
}

export function responseExamples(text:string,terms:string[]=[]):string[]{
 return responseSamples(text,terms).flatMap(({operation,value})=>{const fields=responsePaths(value);return fields.length?[fields.map(field=>'Response JSON paths for '+operation+': '+field).join('\n')]:[];});
}
