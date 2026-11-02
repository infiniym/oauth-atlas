// Render OpenAPI fields for the source-snapshot/citation pipeline. These are
// schema values, not inferred provider answers.
export function openApiText(body:string,useCase=''):{title:string;text:string}|null{
 let spec:any;try{spec=JSON.parse(body);}catch{return null;}
 if(!spec?.paths||!spec.openapi&&!spec.swagger)return null;
 const title=spec.info?.title||'OpenAPI reference',base=spec.basePath||'';
 const resolve=(value:any,depth=0):any=>{
  if(!value||depth>3)return value;
  if(value.$ref?.startsWith('#/')){let target=spec;for(const key of value.$ref.slice(2).split('/'))target=target?.[key.replace(/~1/g,'/').replace(/~0/g,'~')];return resolve(target,depth+1);}
  if(value.type==='array')return {type:'array',items:resolve(value.items,depth+1)};
  if(value.properties)return {type:value.type||'object',required:value.required,properties:Object.fromEntries(Object.entries(value.properties).slice(0,45).map(([k,v])=>[k,resolve(v,depth+1)]))};
  return value;
 };
 const lines=['# '+title,'Schema version: '+(spec.info?.version||''),'Documented server: '+(spec.host?(spec.schemes?.[0]||'https')+'://'+spec.host+base:JSON.stringify(spec.servers||[])),'Security definitions: '+JSON.stringify(spec.securityDefinitions||spec.components?.securitySchemes||{})];
 const operations:[string,string,any,any][]=[];
 for(const [path,item] of Object.entries(spec.paths) as [string,any][])for(const method of ['get','post','put','patch','delete','head'])if(item[method])operations.push([path,method,item[method],item]);
 const words=useCase.toLowerCase().replace(/\b(?:never|no|do not)\b[^.;]*/g,'').split(/\W+/).filter(w=>w.length>3&&!['names','titles','connected','person','individual','customers','accounts','including','pagination','oauth','only'].includes(w)).map(w=>w.length>6?w.slice(0,5):w.replace(/s$/,''));
 const rank=([path,method,op]:typeof operations[number])=>words.filter(w=>(path+' '+op.summary+' '+op.description).toLowerCase().includes(w)).length*10+(method==='get'?8:0)-path.split('/').length;
 operations.sort((a,b)=>rank(b)-rank(a));
 lines.push('Operation index:',...operations.map(([path,method,op])=>method.toUpperCase()+' '+base+path+' | '+(op.summary||op.operationId||'')));
 for(const [path,method,op,item] of operations.slice(0,12)){
 lines.push('\n## '+method.toUpperCase()+' '+base+path+' | '+(op.summary||op.operationId||''),op.description||'',JSON.stringify({parameters:[...item.parameters||[],...op.parameters||[]].map(p=>resolve(p)),requestBody:resolve(op.requestBody),security:op.security||spec.security||[],responses:Object.fromEntries(Object.entries(op.responses||{}).filter(([status])=>/^2/.test(status)).map(([status,r]:[string,any])=>[status,{description:r.description,headers:r.headers,schema:resolve(r.schema||r.content?.['application/json']?.schema)}]))},null,2));
 }
 return {title,text:lines.join('\n')};
}
