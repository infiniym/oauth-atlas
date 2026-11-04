import {responsePaths} from './response-shapes.ts';
// Render OpenAPI fields for the source-snapshot/citation pipeline. These are
// schema values, not inferred provider answers.
export function openApiText(body:string,useCase=''):{title:string;text:string}|null{
 let spec:any;try{spec=JSON.parse(body);}catch{return null;}
 if(!spec?.paths||!spec.openapi&&!spec.swagger)return null;
 const title=spec.info?.title||'OpenAPI reference',base=spec.basePath||'';
 const resolve=(value:any,depth=0,seen=new Set<string>()):any=>{
  if(!value||depth>5)return value;
  if(value.$ref?.startsWith('#/')){if(seen.has(value.$ref))return value;let target=spec;for(const key of value.$ref.slice(2).split('/'))target=target?.[key.replace(/~1/g,'/').replace(/~0/g,'~')];return resolve(target,depth+1,new Set([...seen,value.$ref]));}
  if(value.type==='array')return {type:'array',items:resolve(value.items,depth+1,seen)};
  if(value.properties){const rank=(key:string)=>(value.required?.includes(key)?100:0)+(/names?/i.test(useCase)&&/name/i.test(key)?30:0)+(/titles?|content/i.test(useCase)&&/title|subject|content|summary/i.test(key)?30:0)+(/^(?:data|items|results|nodes|edges|pageInfo|pagination|_embedded|total|count|next|has)/i.test(key)?20:0);return {type:value.type||'object',required:value.required,properties:Object.fromEntries(Object.entries(value.properties).sort((a,b)=>rank(b[0])-rank(a[0])).slice(0,45).map(([k,v])=>[k,resolve(v,depth+1,seen)]))};}
  return value;
 };
 const lines=['# '+title,'Schema version: '+(spec.info?.version||''),'Documented server: '+(spec.host?(spec.schemes?.[0]||'https')+'://'+spec.host+base:JSON.stringify(spec.servers||[])),'Security definitions: '+JSON.stringify(spec.securityDefinitions||spec.components?.securitySchemes||{})];
 const operations:[string,string,any,any][]=[];
 for(const [path,item] of Object.entries(spec.paths) as [string,any][])for(const method of ['get','post','put','patch','delete','head'])if(item[method])operations.push([path,method,item[method],item]);
 const words=[...new Set(useCase.toLowerCase().replace(/\b(?:never|no|do not)\b[^.;]*/g,'').split(/\W+/).filter(w=>w.length>3&&!['list','read','names','titles','visible','connected','person','individual','customer','customers','accounts','including','pagination','oauth','only','backend','application','their','with','that','each','user','input','retain','instance','instances','base'].includes(w)).map(w=>w.length>6?w.slice(0,5):w.replace(/s$/,'')))];
 const rank=([path,method,op]:typeof operations[number])=>words.filter(w=>(path+' '+op.summary+' '+op.description).toLowerCase().includes(w)).length*10+words.filter(w=>path.includes(w)).length*20+(method==='get'?8:0)-path.split('/').length*2-(path.match(/\{/g)||[]).length*4;
 operations.sort((a,b)=>rank(b)-rank(a));
 for(const [path,method,op,item] of operations.slice(0,12)){
 lines.push('\n## '+method.toUpperCase()+' '+base+path+' | '+(op.summary||op.operationId||''),op.description||'');
 for(const p of [...item.parameters||[],...op.parameters||[]].map(p=>resolve(p)))lines.push('Parameter '+p.name+' in '+p.in+' ('+(p.type||p.schema?.type||'unspecified type')+', '+(p.required?'required':'optional')+'): '+(p.description||JSON.stringify(p.schema||{})));
 if(op.requestBody)lines.push('Request body: '+JSON.stringify(resolve(op.requestBody)));
 lines.push('Operation security: '+JSON.stringify(op.security||spec.security||[]));
 for(const [status,reference] of Object.entries(op.responses||{}).filter(([status])=>/^2/.test(status)) as [string,any][]){const r=resolve(reference),schema=resolve(r.schema||r.content?.['application/json']?.schema);lines.push('Successful response '+status+': '+(r.description||''),...responsePaths(schema,true).map(field=>'Response JSON paths for '+method.toUpperCase()+' '+base+path+': '+field),JSON.stringify({headers:r.headers,schema},null,2));}
 }
 // The compact index supplements the actual operation definitions. It must not
 // push the requested parameters and response schema beyond extraction limits.
 lines.push('Operation index:',...operations.map(([path,method,op])=>method.toUpperCase()+' '+base+path+' | '+(op.summary||op.operationId||'')));
 return {title,text:lines.join('\n')};
}
