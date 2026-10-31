'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,ChevronDown,Compass,Globe,LoaderCircle,X} from 'lucide-react';
import type {GuideInput,LiveGuide,Progress} from '@/lib/live-guide/contracts';
import {readGuideStream} from '@/lib/live-guide/stream';
import {researchedPlan} from '@/lib/plan/adapters';
import {reviewedProvider} from '@/lib/plan/routing';
import AppFrame from '@/components/app-frame';
import LaunchPlanView from '@/components/launch-plan';
const initial={app:'',website:'',useCase:'',audience:'unknown' as GuideInput['audience']};
export default function ResearchWorkspace(){
  const [form,setForm]=useState(initial),[guide,setGuide]=useState<LiveGuide|null>(null),[logs,setLogs]=useState<Progress[]>([]),[answers,setAnswers]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[editing,setEditing]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('');
  const abort=useRef<AbortController|null>(null);
  useEffect(()=>{
    const controller=new AbortController();const params=new URL(location.href).searchParams,id=params.get('id');
    if(!id){setForm({...initial,app:(params.get('app')||'').slice(0,100),useCase:(params.get('useCase')||'').slice(0,600)});return;}
    setEditing(params.get('edit')==='1');setLoading(true);fetch('/api/live-guide/'+encodeURIComponent(id),{signal:controller.signal}).then(async r=>{const data=await r.json() as {guide:LiveGuide;error?:string};if(!r.ok)throw new Error(data.error||'Plan could not be opened.');setGuide(data.guide);setForm({app:data.guide.input.app,website:data.guide.input.website,useCase:data.guide.input.useCase,audience:data.guide.input.audience});}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>setLoading(false));return()=>controller.abort();
  },[]);
  useEffect(()=>()=>abort.current?.abort(),[]);
  async function research(refine=false){
    if(busy)return;if(refine&&guide?.questions.some(q=>!answers[q.id])){setError('Answer each choice that changes the setup.');return;}
    if(!refine){const reviewed=reviewedProvider(form.app);if(reviewed){location.assign('/?'+new URLSearchParams({view:'advisor',provider:reviewed,description:form.useCase}).toString());return;}}
    if(refine&&answers['provider-identity']==='No, I will enter its website'){setEditing(true);setStatus('Enter the correct website and create a new plan.');return;}
    const input=refine&&guide?{...guide.input,answers:{...guide.input.answers,...answers},previousId:guide.id}:form;
    const controller=new AbortController();abort.current=controller;setBusy(true);setError('');setStatus('');setLogs([]);
    try{const response=await fetch('/api/live-guide',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:controller.signal});const saved=await readGuideStream(response,e=>setLogs(old=>[...old,e]),controller.signal);setGuide(saved);setAnswers({});setForm({app:saved.input.app,website:saved.input.website,useCase:saved.input.useCase,audience:saved.input.audience});setEditing(false);history.replaceState(null,'','/live-guide?id='+saved.id);window.scrollTo(0,0);}
    catch(e){if((e as Error).name==='AbortError')setStatus('Research cancelled. Your saved plan is still available.');else setError((e as Error).message);}finally{setBusy(false);abort.current=null;}
  }
  const confirming=!!guide?.questions.length&&!editing;
  return <AppFrame breadcrumb={guide?guide.input.app+' / Your launch plan':'Create a launch plan'}><div className="advisor-workspace">
    {error&&<div className="advisor-notice error" role="alert"><p>{error}</p></div>}{status&&<p role="status" className="plan-feedback">{status}</p>}{loading&&<div className="advisor-loading"><LoaderCircle className="spin" size={18}/>Opening plan…</div>}
    {!loading&&(!guide||editing)&&<><div className="assessment-topline"><a href="/" className="text-button"><ArrowLeft size={16}/>Start over</a><span>Describe → Confirm → Your plan</span></div><div className="assessment-form-shell"><header><span className="section-kicker">Your integration</span><h1>Go from integration idea to launch plan.</h1><p>We’ll research the provider’s documentation, confirm choices that change your setup and create your plan.</p></header><form onSubmit={e=>{e.preventDefault();void research();}}>
    <label className="advisor-field"><span>Provider name or website</span><input required id="lg-app" maxLength={100} value={form.app} disabled={busy} onChange={e=>setForm({...form,app:e.target.value})} placeholder="Any app name or official website"/></label>
    <label className="advisor-field"><span>What are you building?</span><textarea id="lg-usecase" rows={3} maxLength={600} disabled={busy} value={form.useCase} onChange={e=>setForm({...form,useCase:e.target.value})} placeholder="What should your agent read or change, and for whom?"/></label>
    <label className="advisor-field"><span>Who will use the integration?</span><select disabled={busy} value={form.audience} onChange={e=>setForm({...form,audience:e.target.value as GuideInput['audience']})}><option value="unknown">I haven’t decided yet</option><option value="internal">My own organization</option><option value="customers">Customers / other organizations</option></select></label>
    <details className="advanced-requirements" open={!!error}><summary>Official documentation <span>Optional</span><ChevronDown size={14}/></summary><label className="advisor-field"><span>Official website or documentation URL</span><small>Useful if the name is ambiguous or the first search cannot find the right provider.</small><input id="lg-website" maxLength={1500} disabled={busy} value={form.website} onChange={e=>setForm({...form,website:e.target.value})} placeholder="https://provider.com/developers"/></label></details>
    <p className="research-public-note"><Globe size={16}/>Plans are readable by anyone with the link. Use public details, never credentials.</p><div className="assessment-form-foot"><span>Reviewed knowledge or fresh sources, in one launch plan.</span><button className="primary" disabled={busy} type="submit">{busy?<LoaderCircle className="spin" size={16}/>:<Compass size={16}/>}Create launch plan<ArrowRight size={15}/></button></div></form></div></>}
    {confirming&&<><div className="assessment-topline"><button className="text-button" onClick={()=>setEditing(true)}><ArrowLeft size={16}/>Edit request</button><span>Describe → Confirm → Your plan</span></div><div className="assessment-form-shell"><header><span className="section-kicker">Confirm your requirements</span><h1>One quick check before your plan.</h1><p>These choices change your setup. Provider-policy gaps become tasks in the plan.</p></header><section className="request-summary"><strong>{guide!.input.app}</strong><p>{guide!.input.useCase||'General provider setup'}</p></section><form onSubmit={e=>{e.preventDefault();void research(true);}}><div className="required-questions"><div className="question-grid">{guide!.questions.map(q=><label className="advisor-field" key={q.id}><span>{q.prompt}</span><small>{q.why}</small><select disabled={busy} value={answers[q.id]||''} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})}><option value="">Choose an answer</option>{q.options.map(o=><option key={o} value={o}>{o}</option>)}</select></label>)}</div></div><div className="assessment-form-foot"><span>{guide!.questions.filter(q=>!answers[q.id]).length} required choices left.</span><button className="primary" disabled={busy||guide!.questions.some(q=>!answers[q.id])}>{busy?<LoaderCircle className="spin" size={16}/>:<Compass size={16}/>}Create launch plan<ArrowRight size={15}/></button></div></form></div></>}
    {logs.length>0&&<details className="research-run" open={busy}><summary>{busy?'Research in progress':'Research log'}<ChevronDown size={14}/></summary><ol role="log" aria-live="polite">{logs.map((log,i)=><li key={i}>{busy&&i===logs.length-1?<LoaderCircle className="spin" size={15}/>:<Check size={15}/>}<div><strong>{log.stage}</strong><p>{log.detail}</p></div></li>)}</ol>{busy&&<button className="secondary" onClick={()=>abort.current?.abort()}><X size={15}/>Cancel research</button>}</details>}
    {!loading&&guide&&!confirming&&!editing&&<LaunchPlanView plan={researchedPlan(guide)} onEdit={()=>setEditing(true)} onShare={()=>location.origin+'/plan/'+guide.id}/>}
  </div></AppFrame>;
}
