// Keep the containing response object beside its fields when a long official
// example or schema is compressed. Paths and types are derived, never inferred.
export function responseFieldPriority(path:string,request=''):number{
 const leaf=path.match(/\.([\w]+)(?:\[\])? \(/)?.[1]||'',text=request.toLowerCase();
 const words=text.split(/\W+/).filter(word=>word.length>3).map(word=>word.replace(/ies$/,'y').replace(/s$/,''));
 const value=/\btitles?\b/.test(text)&&/^(?:title|subject|content|plain_text)$/.test(leaf)||/\bnames?\b/.test(text)&&leaf==='name'||/\b(?:content|text|markdown)\b/.test(text)&&/^(?:content|body|markdown|plain_text)$/.test(leaf);
 return (/^(?:has_more|next_cursor|hasNextPage|endCursor|pageInfo|nextLink|nextByOffset|truncated|unknown_block_ids)$/.test(leaf)?2000:0)+(value?(leaf==='plain_text'?2000:1000):0)+(words.some(word=>leaf.toLowerCase()===word)?100:0)+(words.some(word=>path.toLowerCase().includes('.'+word))?10:0)+(/\.(?:results|items|nodes|edges)\[\]/.test(path)?25:0)+(/^(?:title|name|content|subject|markdown|plain_text|value|results|data|items|nodes|edges|properties|total|count)$/.test(leaf)?20:0);
}
export function schemaPriority(node:any,request='',depth=0):number{
 if(!node||typeof node!=='object'||depth>3)return 0;
 const keyRank=(key:string)=>responseFieldPriority('$.'+key+' (field)',request);
 return Math.max(0,...Object.keys(node.properties||{}).map(keyRank),...['oneOf','anyOf','allOf'].flatMap(key=>(Array.isArray(node[key])?node[key]:[]).map((branch:any)=>schemaPriority(branch,request,depth+1))),...Object.values(node.properties||{}).map(child=>schemaPriority(child,request,depth+1)))+(typeof node.$ref==='string'?keyRank(node.$ref):0)+(Object.keys(node.properties||{}).some(key=>/^(?:results|data|items|nodes|edges)$/.test(key))?25:0);
}
export function responsePaths(value:unknown,schema=false,request=''):string[]{
 const paths=new Set<string>();
 const walk=(node:any,path:string,depth:number)=>{
  if(depth>14||paths.size>=200)return;
  if(schema){
   // Schema alternatives do not introduce another level in the JSON value.
   for(const key of ['oneOf','anyOf','allOf'])for(const branch of [...Array.isArray(node?.[key])?node[key]:[]].sort((a,b)=>schemaPriority(b,request)-schemaPriority(a,request)))walk(branch,path,depth);
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
 return [...paths].sort((a,b)=>responseFieldPriority(b,request)-responseFieldPriority(a,request)||a.length-b.length).slice(0,40);
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
