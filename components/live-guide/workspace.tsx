'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, CheckCircle2, ChevronRight, Compass, Download, FileText, Globe, Link2, LoaderCircle, RotateCcw, ShieldCheck, Square, X } from 'lucide-react';
import type { Evidence, GuideInput, LiveGuide, Progress } from '@/lib/live-guide/contracts';
import { markdown } from '@/lib/live-guide/export';
import { readGuideStream } from '@/lib/live-guide/stream';
import styles from './workspace.module.css';

const initial = {app:'',website:'',useCase:'',audience:'unknown' as GuideInput['audience']};
const kindLabels = {'oauth':'Authentication','permission':'Permissions','provider-review':'Provider review','customer-approval':'Customer approval','prerequisite':'Prerequisites','provider-wait':'Provider waiting time'};
function EvidenceLinks({evidence,guide}:{evidence:Evidence[];guide:LiveGuide}){
  return <details className={styles.evidence}><summary>View supporting evidence</summary>{evidence.map((e,i)=>{const source=guide.sources.find(s=>s.id===e.sourceId);return source?<div key={i}><blockquote>{e.quote}</blockquote><a href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={13}/></a></div>:null;})}</details>;
}
export default function LiveGuideWorkspace(){
  const [form,setForm]=useState(initial),[guide,setGuide]=useState<LiveGuide|null>(null),[logs,setLogs]=useState<Progress[]>([]);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('');
  const [answers,setAnswers]=useState<Record<string,string>>({}),[checks,setChecks]=useState<string[]>([]),[share,setShare]=useState(false);
  const abort=useRef<AbortController|null>(null),shareInput=useRef<HTMLInputElement>(null),result=useRef<HTMLElement>(null);
  useEffect(()=>{
    let controller:AbortController|undefined;
    function open(){
      controller?.abort();const params=new URL(location.href).searchParams,id=params.get('id');setError('');setLoading(false);
      if(!id){setGuide(null);setForm({...initial,app:(params.get('app')||'').slice(0,100),useCase:(params.get('useCase')||'').slice(0,600)});return;}
      const current=new AbortController();controller=current;setLoading(true);
      fetch('/api/live-guide/'+encodeURIComponent(id),{signal:current.signal}).then(async res=>{const data=await res.json() as {error?:string;guide:LiveGuide};if(!res.ok)throw new Error(data.error||'Guide could not be opened.');return data.guide;}).then(g=>{setGuide(g);setForm({app:g.input.app,website:g.input.website,useCase:g.input.useCase,audience:g.input.audience});}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!current.signal.aborted)setLoading(false);});
    }
    open();window.addEventListener('popstate',open);return()=>{controller?.abort();window.removeEventListener('popstate',open);};
  },[]);
  useEffect(()=>()=>abort.current?.abort(),[]);
  useEffect(()=>{
    setAnswers({});setShare(false);
    if(!guide){setChecks([]);return;}
    try{const saved=JSON.parse(localStorage.getItem('live-guide-checks:'+guide.id)||'[]');setChecks(Array.isArray(saved)?saved.filter((v:unknown)=>typeof v==='string'):[]);}catch{setChecks([]);}
  },[guide]);
  async function research(refine=false){
    if(busy)return;
    if(refine&&guide?.questions.some(q=>!answers[q.id])){setError('Answer each setup choice before updating the plan.');return;}
    if(refine&&answers['provider-identity']==='No, I will enter its website'){setStatus('Enter the correct provider website above and start fresh research.');document.getElementById('lg-website')?.focus();return;}
    const input=refine&&guide?{...guide.input,answers:{...guide.input.answers,...answers},previousId:guide.id}:form;
    const controller=new AbortController();abort.current=controller;setBusy(true);setError('');setStatus('');setLogs([]);
    try{
      const response=await fetch('/api/live-guide',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:controller.signal});
      const saved=await readGuideStream(response,event=>setLogs(old=>[...old,event]),controller.signal);
      setGuide(saved);setForm({app:saved.input.app,website:saved.input.website,useCase:saved.input.useCase,audience:saved.input.audience});
      const url=new URL(location.href);url.search='';url.searchParams.set('id',saved.id);history.pushState(null,'',url);
      setStatus('Guide saved. This link opens the dated version.');requestAnimationFrame(()=>result.current?.scrollIntoView({behavior:'smooth',block:'start'}));
    }catch(e){if((e as Error).name==='AbortError')setStatus('Research cancelled. Any earlier saved guide is still available.');else setError((e as Error).message);}
    finally{setBusy(false);abort.current=null;}
  }
  function toggle(title:string){const next=checks.includes(title)?checks.filter(x=>x!==title):[...checks,title];setChecks(next);try{localStorage.setItem('live-guide-checks:'+guide!.id,JSON.stringify(next));}catch{setStatus('Your browser could not save checklist progress.');}}
  async function copy(){setShare(true);try{await navigator.clipboard.writeText(location.origin+'/live-guide?id='+guide!.id);setStatus('Guide link copied.');}catch{setStatus('Copy the selected link below.');requestAnimationFrame(()=>{shareInput.current?.focus();shareInput.current?.select();});}}
  function download(){const url=URL.createObjectURL(new Blob([markdown(guide!)],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=(guide!.input.app.replace(/[^a-z0-9-]/gi,'-')||'provider')+'-oauth-guide.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <div className={styles.workspace}>
    <header className={styles.header}><a href="/" className={styles.brand}><Compass size={23}/>Launch Advisor<span> / Live guide</span></a><span className={styles.preview}>Live research</span></header>
    <div className={styles.layout}>
      <aside className={styles.sidebar}><a href="/" className={styles.back}><ArrowLeft size={15}/>Launch advisor</a><a href="/?view=directory" className={styles.back}>Provider directory</a><p className={styles.navLabel}>RESEARCH A PROVIDER</p><a href="#lg-request" className={styles.navActive}><Compass size={16}/>Start research</a>{guide&&<><a href="#lg-plan"><FileText size={16}/>Your guide</a><a href="#lg-findings">Requirements</a><a href="#lg-checklist">Setup checklist</a><a href="#lg-sources">Sources</a></>}<div className={styles.sidebarNote}><ShieldCheck size={19}/><p>Sources support the guidance. Account access, consent and final submissions stay with you.</p></div></aside>
      <main className={styles.main}>
        <section id="lg-request" className={styles.request}>
          <p className={styles.eyebrow}>FROM PUBLIC DOCS TO YOUR NEXT STEP</p><h1>Research an unfamiliar app</h1><p className={styles.lead}>Tell us what you want to connect. Get a dated guide with setup requirements, evidence and open questions.</p>
          <form onSubmit={e=>{e.preventDefault();void research();}} className={styles.form}>
            <div className={styles.twoColumns}><label htmlFor="lg-app">App name or website<input id="lg-app" required maxLength={100} disabled={busy||loading} placeholder="e.g. Linear or linear.app" value={form.app} onChange={e=>setForm({...form,app:e.target.value})}/></label><label htmlFor="lg-website">Official website or docs <span>Optional</span><input id="lg-website" maxLength={1500} disabled={busy||loading} placeholder="https://linear.app/developers" value={form.website} onChange={e=>setForm({...form,website:e.target.value})}/></label></div>
            <label htmlFor="lg-usecase">What should your agent do? <span>Recommended for a tailored plan</span><textarea id="lg-usecase" maxLength={600} rows={3} disabled={busy||loading} placeholder="Read issues and add comments for each customer’s workspace" value={form.useCase} onChange={e=>setForm({...form,useCase:e.target.value})}/></label>
            <label htmlFor="lg-audience">Who will connect?<select id="lg-audience" disabled={busy||loading} value={form.audience} onChange={e=>setForm({...form,audience:e.target.value as GuideInput['audience']})}><option value="unknown">I haven’t decided yet</option><option value="internal">People in my own organization</option><option value="customers">Customers or other organizations</option></select></label>
            <p className={styles.publicNote}><Globe size={16}/>Guides are public to anyone with the link. Use public project details; keep credentials and private information out.</p>
            <div className={styles.actions}><button type="submit" className={styles.primary} disabled={busy||loading}>{busy?<LoaderCircle className={styles.spin} size={17}/>:<Compass size={17}/>} {busy?'Researching…':guide?'Run fresh research':'Generate guide'}<ChevronRight size={16}/></button>{busy&&<button type="button" onClick={()=>abort.current?.abort()} className={styles.secondary}><X size={16}/>Cancel</button>}</div>
          </form>
        </section>
        {error&&<div className={styles.error} role="alert"><strong>Research needs another route</strong><p>{error}</p></div>}
        {status&&<p className={styles.feedback} role="status">{status}</p>}
        {loading&&<p role="status"><LoaderCircle className={styles.spin} size={17}/>Opening the saved guide…</p>}
        {logs.length>0&&<details open={busy} className={styles.progress}><summary>{busy?'Research in progress':'Research log'}<span>{logs.filter(l=>l.stage==='Source read').length} pages read</span></summary><ol aria-live="polite">{logs.map((log,i)=><li key={i} className={log.status==='warning'?styles.warning:''}>{log.status==='working'&&busy&&i===logs.length-1?<LoaderCircle className={styles.spin} size={15}/>:<Check size={15}/>}<div><strong>{log.stage}</strong><p>{log.detail}</p></div></li>)}</ol></details>}
        {guide&&<article ref={result} id="lg-plan" className={styles.guide}>
          <div className={styles.guideHeading}><div><p className={styles.eyebrow}>YOUR DATED RESEARCH GUIDE</p><h2>{guide.input.app}</h2><p>{guide.input.useCase||'General OAuth setup research'}</p></div><div className={styles.actions}><button className={styles.secondary} onClick={()=>void copy()}><Link2 size={16}/>Share</button><button className={styles.secondary} onClick={download}><Download size={16}/>Markdown</button></div></div>
          {share&&<label className={styles.shareLabel}>Public guide link<input ref={shareInput} readOnly value={typeof location==='undefined'?'':location.origin+'/live-guide?id='+guide.id} onFocus={e=>e.target.select()}/></label>}
          <div className={styles.meta}><span className={styles.badge}>{guide.mode==='interpreted'?'AI interpretation':'Evidence only'}</span><span>{guide.status==='needs-input'?'Setup choices need an answer':guide.status==='unsupported'?'OAuth limitation found':guide.status==='documented-plan'?'Documented plan':'Provisional findings'}</span><span>{guide.sources.length} sources</span><time dateTime={guide.generatedAt}>{new Date(guide.generatedAt).toLocaleDateString('en-GB')}</time></div>
          <div className={styles.notice}><ShieldCheck size={19}/><p>{guide.notice}</p></div>
          {guide.questions.length>0&&<section className={styles.questions}><h3>Confirm what changes the path</h3><p>These answers affect the setup recommendation.</p>{guide.questions.map(q=><fieldset key={q.id} disabled={busy}><legend>{q.prompt}</legend><p>{q.why}</p><div className={styles.choices}>{q.options.map(option=><label key={option}><input type="radio" name={q.id} checked={answers[q.id]===option} onChange={()=>setAnswers({...answers,[q.id]:option})}/>{option}</label>)}</div></fieldset>)}<button className={styles.primary} disabled={busy} onClick={()=>void research(true)}>{busy?<LoaderCircle className={styles.spin} size={16}/>:<RotateCcw size={16}/>}Update this plan</button></section>}
          <section className={styles.verdict}><h3>{guide.mode==='interpreted'?'Proposed setup path':'What the research establishes'}</h3><p>{guide.summary}</p><p>{guide.recommendation}</p><div className={styles.next}><span>YOUR NEXT ACTION</span><strong>{guide.nextAction}</strong></div></section>
          <section className={styles.timing}><div><h3>Hands-on work</h3><strong>{guide.activeEffort.range||'Not estimated'}</strong><p>{guide.activeEffort.range?'Planning estimate. '+guide.activeEffort.assumptions:'The setup has not been timed. Account access and implementation details can change the effort.'}</p></div><div><h3>Provider waiting time</h3><strong>{guide.findings.some(f=>f.kind==='provider-wait')?'Published estimate found':'Not established'}</strong><p>{guide.findings.filter(f=>f.kind==='provider-wait').map(f=>f.detail).join(' ')||'No applicable published turnaround was established. This does not establish zero wait.'}</p></div></section>
          <section id="lg-findings" className={styles.section}><h3>Requirements and permissions</h3>{!guide.findings.length&&<p>No requirements were established from the readable sources. Try a direct OAuth documentation URL.</p>}{guide.findings.map((f,i)=><div className={styles.finding} key={i}><span className={styles.category}>{kindLabels[f.kind]}</span><h4>{f.title}</h4><p>{f.detail}</p><p className={styles.applies}><strong>Applies when:</strong> {f.appliesWhen}</p><EvidenceLinks evidence={f.evidence} guide={guide}/></div>)}</section>
          <section id="lg-checklist" className={styles.section}><h3>Setup checklist</h3><p>Checkmarks stay on this device and are excluded from shared links and exports.</p>{!guide.steps.length&&<div className={styles.empty}>A setup sequence has not been established. Use the next action above to resolve the missing evidence.</div>}{guide.steps.map((s,i)=><div className={styles.step} key={i}><button role="checkbox" aria-checked={checks.includes(s.title)} aria-label={s.title} className={styles.checkbox} onClick={()=>toggle(s.title)}>{checks.includes(s.title)?<CheckCircle2 size={22}/>:<Square size={22}/>}</button><div><span className={styles.category}>STEP {i+1} · {s.owner}</span><h4>{s.title}</h4><p>{s.detail}</p><p className={styles.applies}><strong>Done when:</strong> {s.doneWhen}</p><EvidenceLinks evidence={s.evidence} guide={guide}/></div></div>)}</section>
          <section className={styles.section}><h3>Using Composio</h3><p>{guide.integration.message}</p>{guide.integration.docsUrl&&<a href={guide.integration.docsUrl} target="_blank" rel="noreferrer">Check {guide.integration.catalogName} toolkit documentation<ArrowUpRight size={14}/></a>}</section>
          <section className={styles.section}><h3>What still needs checking</h3><ul>{guide.unknowns.map((u,i)=><li key={i}>{u}</li>)}</ul>{guide.warnings.length>0&&<details className={styles.evidence}><summary>Sources we could not read</summary><ul>{guide.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}</section>
          <section id="lg-sources" className={styles.section}><h3>Sources and verification</h3><p>Public documentation was read. App creation, token exchange, API actions and provider approval have not been performed by this guide.</p>{guide.sources.map((s,i)=><div id={'lg-source-'+s.id} className={styles.source} key={s.id}><span>{i+1}</span><div><a href={s.url} target="_blank" rel="noreferrer">{s.title}<ArrowUpRight size={14}/></a><p>{new URL(s.url).hostname} · retrieved {new Date(s.retrievedAt).toLocaleDateString('en-GB')}</p><details><summary>Snapshot fingerprint</summary><code>{s.hash}</code></details></div></div>)}</section>
          <footer className={styles.footer}>Refreshing creates a new guide version. This link keeps the saved evidence and recommendation.{guide.previousId&&<a href={'/live-guide?id='+guide.previousId}>Open previous version</a>}</footer>
        </article>}
      </main>
    </div>
  </div>;
}
