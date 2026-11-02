'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,ChevronDown,Compass,Globe,LoaderCircle} from 'lucide-react';
import type {GuideInput,LiveGuide,Progress} from '@/lib/live-guide/contracts';
import type {GuideJob} from '@/lib/live-guide/jobs';
import type {LaunchPlan} from '@/lib/plan/types';
import {monitorJob} from '@/lib/live-guide/job-client';
import {researchedPlan} from '@/lib/plan/adapters';
import {reviewedProvider} from '@/lib/plan/routing';
import AppFrame from '@/components/app-frame';
import LaunchPlanView from '@/components/launch-plan';
const initial={app:'',website:'',useCase:'',audience:'unknown' as GuideInput['audience']};
export default function ResearchWorkspace(){
 const [form,setForm]=useState(initial),[guide,setGuide]=useState<LiveGuide|null>(null),[plan,setPlan]=useState<LaunchPlan|null>(null),[job,setJob]=useState<GuideJob|null>(null),[logs,setLogs]=useState<Progress[]>([]),[answers,setAnswers]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[editing,setEditing]=useState(false),[error,setError]=useState('');
 const [recoveryUrl,setRecoveryUrl]=useState(''),[elapsed,setElapsed]=useState(0);
 useEffect(()=>{if(!busy)return;const startedAt=job?.timing?.startedAt?Date.parse(job.timing.startedAt):Date.now();const tick=()=>setElapsed(Math.max(0,Math.floor((Date.now()-startedAt)/1000)));tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[busy,job?.id,job?.timing?.startedAt]);
 const active=useRef(false),abort=useRef<AbortController|null>(null),started=useRef(false),requestKey=useRef('');
 const resultFocus=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(loading||busy||editing||!guide)return;const heading=resultFocus.current?.querySelector<HTMLElement>('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}},[guide?.id,loading,busy,editing]);
 function apply(saved:LiveGuide){setPlan(null);setGuide(saved);setAnswers({});setForm({app:saved.input.app,website:saved.input.website,useCase:saved.input.useCase,audience:saved.input.audience});setEditing(false);}
 async function accept(current:GuideJob){setForm({app:current.input.app,website:current.input.website,useCase:current.input.useCase,audience:current.input.audience});setJob(current);setLogs(current.events);if(current.guide){apply(current.guide);if(!current.guide.questions.length){const r=await fetch('/api/plans/'+current.guide.id);if(r.ok)setPlan(((await r.json()) as {plan:LaunchPlan}).plan);}}}
 async function watch(current:GuideJob,retry=false){
  if(active.current)return;active.current=true;setBusy(true);setError('');const controller=new AbortController();abort.current=controller;
  try{
   current=await monitorJob(current,{retry,signal:controller.signal,onProgress:event=>setLogs(old=>[...old,event]),onJob:current=>{setJob(current);setLogs(current.events);}});
   await accept(current);if(current.state==='interrupted')setError(current.error||'Processing was interrupted. Your evidence is retained.');window.scrollTo(0,0);
  }catch(e){if((e as Error).name!=='AbortError')setError((e as Error).message+' Your saved process URL can be reopened.');}
  finally{active.current=false;setBusy(false);abort.current=null;}
 }
 useEffect(()=>{
  if(started.current)return;started.current=true;const params=new URL(location.href).searchParams,id=params.get('id'),jobId=params.get('job');setEditing(params.get('edit')==='1');
  void (async()=>{try{
   if(jobId){const r=await fetch('/api/live-guide/jobs/'+encodeURIComponent(jobId));if(!r.ok)throw new Error('Saved process not found.');const current=((await r.json()) as {job:GuideJob}).job as GuideJob;await accept(current);if(current.state==='queued'||current.state==='running')void watch(current);}
   else if(id){const r=await fetch('/api/live-guide/'+encodeURIComponent(id));if(!r.ok)throw new Error('Saved guide not found.');const saved=((await r.json()) as {guide:LiveGuide}).guide as LiveGuide;apply(saved);setEditing(params.get('edit')==='1');if(!saved.questions.length){const p=await fetch('/api/plans/'+saved.id);if(p.ok)setPlan(((await p.json()) as {plan:LaunchPlan}).plan);}}
   else{
    const handoff={app:params.get('app')||'',useCase:params.get('useCase')||'',audience:params.get('audience')||'unknown'};
    if(handoff.app.length>100||handoff.useCase.length>1500)throw new Error('The provider or description is too long. Nothing has been truncated; shorten it on the previous page.');
    if(!handoff.app&&handoff.useCase)setError('Your full description is retained. Enter the provider name or website to continue; automatic identification was unavailable or ambiguous.');
    const draft=handoff.app||handoff.useCase?null:JSON.parse(localStorage.getItem('atlas-research-draft')||'null');setForm(draft||{...initial,...handoff,audience:['internal','customers'].includes(handoff.audience)?handoff.audience as GuideInput['audience']:'unknown'});
   }
  }catch(e){setError((e as Error).message);}finally{setLoading(false);}})();
  return()=>abort.current?.abort();
 },[]);
 useEffect(()=>{if(!loading)try{localStorage.setItem('atlas-research-draft',JSON.stringify(form));}catch{}},[form,loading]);
 async function research(refine=false){
  if(active.current||busy)return;setError('');
  if(refine&&guide?.questions.some(q=>!answers[q.id])){setError('Answer the current setup choices.');return;}
  if(refine&&answers['provider-identity']==='No, I will enter its website'){setEditing(true);setForm(f=>({...f,website:''}));return;}
  if(!refine){const reviewed=reviewedProvider(form.app);if(reviewed){location.assign('/?'+new URLSearchParams({view:'advisor',provider:reviewed,description:form.useCase}));return;}}
  const input=refine&&guide?{...guide.input,resolution:undefined,answers:{...guide.input.answers,...answers},previousId:guide.id}:form;
  await startJob(input);
 }
 async function startJob(input:Partial<GuideInput>){
  // Keep the same key on a failed POST so a retry cannot enqueue duplicate work.
  const keyFor=JSON.stringify(input);let saved: {input:string;key:string}|null=null;try{saved=JSON.parse(sessionStorage.getItem('atlas-pending-request')||'null');}catch{}
  requestKey.current=saved?.input===keyFor?saved.key:crypto.randomUUID();try{sessionStorage.setItem('atlas-pending-request',JSON.stringify({input:keyFor,key:requestKey.current}));}catch{}
  setBusy(true);try{const r=await fetch('/api/live-guide/jobs',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':requestKey.current},body:JSON.stringify({input})});const data=await r.json() as {job:GuideJob;error?:string};if(!r.ok)throw new Error(data.error||'The process could not start.');const current=data.job as GuideJob;setJob(current);setLogs(current.events);history.replaceState(null,'','/live-guide?job='+current.id);try{sessionStorage.removeItem('atlas-pending-request');}catch{}setEditing(false);setBusy(false);await watch(current);}catch(e){setError((e as Error).message);setBusy(false);}
 }
 const confirming=!!guide?.questions.length&&!editing&&!busy,identity=guide?.questions.length===1&&guide.questions[0].id==='provider-identity';
 const corrected=guide?researchedPlan(guide):null;
 const guideFixesAvailable=!!(plan&&corrected&&JSON.stringify([plan.steps.map(s=>[s.id,s.blockedBy,s.request,s.fields]),plan.blockers,plan.permissions])!==JSON.stringify([corrected.steps.map(s=>[s.id,s.blockedBy,s.request,s.fields]),corrected.blockers,corrected.permissions]));
 const interrupted=!editing&&(job?.state==='interrupted'||(!job&&!!guide&&(guide.mode==='evidence-only'||!!guide.engine&&guide.engine.outcome!=='accepted')&&!guide.questions.length));
 return <AppFrame breadcrumb={guide?guide.input.app+' / Your launch plan':'Create a launch plan'}><div className="advisor-workspace" ref={resultFocus}>
  {error&&!interrupted&&<div className="advisor-notice error" role="alert"><p>{error}</p></div>}
  {loading?<div className="advisor-loading"><LoaderCircle className="spin" size={18}/>Opening saved progress…</div>:null}
  {!loading&&!busy&&(!guide||editing)&&!interrupted&&<><div className="assessment-topline"><a href="/" className="text-button"><ArrowLeft size={16}/>Start over</a><span>Describe → Confirm → Your guide</span></div><div className="assessment-form-shell"><header><span className="section-kicker">Your integration</span><h1>Go from integration idea to launch plan.</h1><p>We’ll identify the provider, settle choices that change setup, then build your guide.</p></header><form onSubmit={e=>{e.preventDefault();void research();}}>
   <label className="advisor-field"><span>Provider name or website</span><input required id="lg-app" maxLength={100} value={form.app} onChange={e=>setForm({...form,app:e.target.value})} placeholder="Any app name or official website"/></label>
   <label className="advisor-field"><span>What are you building?</span><textarea id="lg-usecase" rows={4} maxLength={1500} value={form.useCase} onChange={e=>setForm({...form,useCase:e.target.value})} placeholder="What should the agent read or change? What must it never do?"/><small>{form.useCase.length}/1,500 characters · your full request is retained</small></label>
   <label className="advisor-field"><span>Who will use the integration?</span><select value={form.audience} onChange={e=>setForm({...form,audience:e.target.value as GuideInput['audience']})}><option value="unknown">I haven’t decided yet</option><option value="internal">My own organization</option><option value="customers">Customers / other organizations</option></select></label>
   <details className="advanced-requirements"><summary>Official documentation <span>Optional</span><ChevronDown size={14}/></summary><label className="advisor-field"><span>Official website or documentation URL</span><input id="lg-website" maxLength={1500} value={form.website} onChange={e=>setForm({...form,website:e.target.value})} placeholder="https://provider.com/developers"/></label></details>
   <p className="research-public-note"><Globe size={16}/>Plans are saved and readable by anyone with the link. Use public details, never credentials.</p><div className="assessment-form-foot"><span>Completed work and answers are saved between steps.</span><button className="primary" type="submit">Continue<ArrowRight size={15}/></button></div>
  </form></div></>}
  {confirming&&<div className="assessment-form-shell"><header><span className="section-kicker">{identity?'Identify the provider':'Confirm your setup choices'}</span><h1>{identity?'Is this the provider you mean?':'A few choices before your guide.'}</h1><p>{identity?'Confirm the provider before we build your guide.':'Your documentation is saved. These choices change the setup path; answer them together to continue.'}</p></header><section className="request-summary"><strong>{guide!.input.app}</strong><p>{guide!.input.useCase}</p>{guide!.requestedActions?.length?<p><b>Understood actions:</b> {guide!.requestedActions.map(a=>a.title).join('; ')}</p>:null}{guide!.prohibitions?.length?<p><b>Restrictions:</b> {guide!.prohibitions.join('; ')}</p>:null}<a href={guide!.provider.website} target="_blank" rel="noreferrer">{new URL(guide!.provider.website).hostname}</a></section><form onSubmit={e=>{e.preventDefault();void research(true);}}><div className="question-grid">{guide!.questions.map(q=><label className="advisor-field" key={q.id}><span>{q.prompt}</span><small>{q.why}</small><select value={answers[q.id]||''} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})}><option value="">Choose an answer</option>{q.options.map(o=><option key={o}>{o}</option>)}</select></label>)}</div><div className="assessment-form-foot"><button type="button" className="text-button" onClick={()=>setEditing(true)}>Edit request</button><button className="primary" disabled={guide!.questions.some(q=>!answers[q.id])}>{identity?'Continue with this provider':'Continue to my guide'}<ArrowRight size={15}/></button></div></form></div>}
  {busy&&<section className="assessment-form-shell" role="status"><span className="section-kicker">Your request is in progress · {elapsed}s elapsed</span><p>Read documentation → Build guide → Check access</p><h1>{logs.at(-1)?.stage||'Continuing your saved request'}</h1><p><LoaderCircle className="spin" size={18}/> {logs.at(-1)?.detail||'Checking the saved process.'}</p><p>{form.app}: {form.useCase}</p><small>Reloading this URL reconnects to the same process. It does not start another research request.</small></section>}
  {interrupted&&!busy&&<section className="assessment-form-shell" role="alert"><h1>{job?.failure?.category==='source-moved'?'Confirm the new documentation address':job?.failure?.category==='page-too-large'?'This documentation page is too large':job?.failure?.category==='source-unavailable'?'We could not read the documentation':'We could not finish '+(job?.input.resolution?'this update':'your guide')+'.'}</h1>{job?.failure&&<p>{job.failure.message}</p>}<p>Your request and {(job?.savedSources||guide?.sources||[]).length} sources are saved.</p>{job?.input.resolution&&<p><a href={'/live-guide?id='+job.input.previousId}>Open the unchanged previous guide</a></p>}<details><summary>Saved sources<ChevronDown size={14}/></summary>{(job?.savedSources||guide?.sources||[]).map(s=><p key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></p>)}</details>{job&&<form onSubmit={e=>{e.preventDefault();void startJob({...job.input,documentationUrl:recoveryUrl||job.failure?.destination});}}><label className="advisor-field"><span>{job.failure?.category==='source-moved'?'Review the documentation destination':'Add a more specific official documentation URL'}</span><input required type="url" value={recoveryUrl||job.failure?.destination||''} maxLength={1500} onChange={e=>setRecoveryUrl(e.target.value)} placeholder="https://provider.com/api-reference"/></label><button className="secondary" type="submit">Continue with this documentation</button></form>}<div className="assessment-form-foot"><span>Retrying reuses saved evidence and may repeat an unfinished model call.</span>{job&&!['source-moved','page-too-large'].includes(job.failure?.category||'')&&<button className="primary" onClick={()=>void watch(job,true)}>Retry unfinished stage</button>}<button className="text-button" onClick={()=>{setJob(null);setEditing(true);}}>Edit request</button></div></section>}
  {logs.length>0&&<details className="research-run"><summary>Completed work and current stage<ChevronDown size={14}/></summary><ol>{logs.map((log,i)=><li key={i}><span aria-label={log.status==='warning'?'Needs attention':log.status==='working'?'In progress':'Completed'}>{log.status==='warning'?'!':log.status==='working'?'…':<Check size={15}/>}</span><div><strong>{log.stage}</strong><p>{log.detail}</p></div></li>)}</ol></details>}
  {!loading&&!busy&&!interrupted&&guide&&!confirming&&!editing&&guideFixesAvailable&&<div className="advisor-notice"><p>This saved version has guide updates available. Apply them while keeping its facts and answers.</p><button className="secondary" onClick={()=>void startJob({...guide.input,previousId:guide.id,resolution:{kind:'refresh',requestId:crypto.randomUUID()}})}>Apply guide fixes</button></div>}
  {!loading&&!busy&&!interrupted&&guide&&!confirming&&!editing&&guide.resultState==='research-failure'&&<div className="advisor-notice" role="status"><p>This guide has unresolved actions. The missing evidence or incomplete check is identified beside each affected test.</p></div>}
  {!loading&&!busy&&!interrupted&&guide&&!confirming&&!editing&&<LaunchPlanView plan={plan||researchedPlan(guide)} onEdit={()=>{setJob(null);setEditing(true);}} onShare={()=>location.origin+'/plan/'+guide.id} onResolve={async resolution=>{await startJob({...guide.input,previousId:guide.id,resolution:{...resolution,requestId:crypto.randomUUID()}});}}/>}
 </div></AppFrame>;
}
