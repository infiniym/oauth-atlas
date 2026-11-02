// @ts-nocheck -- Diagnostic recorder; provider envelopes are deliberately captured verbatim.
import {acceptanceAnswers} from './acceptance-choices.mts';
import {guideReadiness} from '../lib/live-guide/readiness.ts';
import {generate} from '../lib/live-guide/workflow.ts';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
process.loadEnvFile('.dev.vars');
const cases=JSON.parse(readFileSync('docs/evidence/completion-2026-11-02/cases.json','utf8')).live;
const name=process.argv[2],label=process.argv[3]||'diagnostic',c=cases.find(c=>c.name===name);
if(!c)throw new Error('Unknown declared case');
const dir='outputs/completion-2026-11-02';mkdirSync(dir,{recursive:true});
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const sourceFiles=execFileSync('git',['ls-files','app','components','lib','scripts','package.json','package-lock.json','vite.config.ts'],{encoding:'utf8'}).trim().split('\n');
const sourceHash=createHash('sha256');for(const path of sourceFiles){sourceHash.update(path+'\0');sourceHash.update(readFileSync(path));}const sourceIdentity={commit:sourceCommit,sourceDigest:sourceHash.digest('hex'),dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()};
const trace:any[]=[],events:any[]=[],started=Date.now();
const fetcher:typeof fetch=async(url,init)=>{
 const at=Date.now(),model=String(url).includes('api.anthropic.com');
 const request=model?JSON.parse(String(init?.body)):undefined;
 const entry:any={url:String(url),at:new Date().toISOString(),...(model?{request:{messages:request.messages.filter(m=>m.role==='user'),stage:request.system.startsWith('Independently')?'access-review':request.system.startsWith('Identify')?'intent':'plan'}}:{})};
 trace.push(entry);
 try{const response=await fetch(url,init);entry.status=response.status;entry.ms=Date.now()-at;
 if(model){const body=await response.clone().json();entry.response={stop_reason:body.stop_reason,usage:body.usage,text:body.content?.filter(c=>c.type==='text').map(c=>c.text).join('')};}
 return response;}catch(e){entry.error=e instanceof Error?e.message:'Fetch failed';throw e;}
};
let result:any,error:string|undefined;
const signal=AbortSignal.timeout(180000),emit=p=>{events.push({...p,ms:Date.now()-started});console.log(name,p.stage,p.detail);};
try{result=await generate(c.input,process.env,emit,signal,fetcher);for(let n=0;result.guide.questions.length&&n<3;n++){const previous=result;result=await generate({...previous.guide.input,previousId:previous.guide.id,answers:acceptanceAnswers(previous.guide)},process.env,emit,signal,fetcher,previous);}}catch(e){error=e instanceof Error?e.message:'Failed';}
const path=dir+'/'+name+'-'+label+'.json';writeFileSync(path,JSON.stringify({sourceIdentity,input:c.input,elapsedMs:Date.now()-started,result,error,events,trace},null,2));
console.log(JSON.stringify({path,ms:Date.now()-started,error,mode:result?.guide.mode,readiness:result?guideReadiness(result.guide):'research-failure',engine:result?.guide.engine,coverage:result?.guide.coverage,questions:result?.guide.questions,sources:result?.guide.sources.map(s=>s.url)}));
