import {isResource,concreteRequest} from './semantics.ts';
import {resolveGuide} from './resolution.ts';
import catalog from '../../data/catalog.json' with { type:'json' };
import { normalizeInput } from './contracts.ts';
import type { Bindings, GuideInput, LiveGuide, Progress, StoredRun,WorkflowCheckpoint,Interpretation } from './contracts.ts';
import { retrieve,discoverProvider } from './retrieval.ts';
import { interpretEvidence, reviewMappings,evidenceOnly, PROMPT_VERSION } from './interpretation.ts';

export function integrationContext(app: string): LiveGuide['integration'] {
  const normalize = (s:string) => s.toLowerCase().replace(/[^a-z0-9]/g,'');
  const match = catalog.providers.find(p=>normalize(p.name)===normalize(app) || normalize(p.id)===normalize(app));
  return match ? {catalogName:match.name,docsUrl:match.docsUrl,message:`${match.name} appears in the dated Composio catalog. Authentication method, managed OAuth availability and coverage of your required actions still need checking. A catalog match alone does not establish compatibility.`} :
    {message:'No exact match was found in the dated Composio catalog. This provider guide does not establish a supported Composio toolkit. Confirm the integration route separately before following toolkit configuration instructions.'};
}
export function continuation(input: GuideInput, previous: StoredRun): void {
  const old = previous.guide.input;
  if (input.app!==old.app || input.useCase!==old.useCase || input.audience!==old.audience || input.website!==old.website) throw new Error('The request changed. Start fresh research so the evidence matches the new request.');
  const allowed = new Map(previous.guide.questions.map(q=>[q.id,q]));
  for (const [id,answer] of Object.entries(input.answers)) {
    if (old.answers[id] === answer) continue;
    if (id==='provider-identity' && answer==='Yes, this is the provider') continue;
    if (!allowed.get(id)?.options.includes(answer)) throw new Error('Choose an answer from the guide’s current questions.');
  }
}
export async function generate(raw: unknown, bindings: Bindings, emit: (event: Progress)=>void, signal: AbortSignal, fetcher: typeof fetch = fetch, previous?: StoredRun,options:{checkpoint?:WorkflowCheckpoint;save?:(checkpoint:WorkflowCheckpoint)=>Promise<void>}={}): Promise<StoredRun> {
  const input = normalizeInput(raw);
  if (input.previousId && !previous) throw new Error('The previous guide could not be found. Start fresh research.');
  if (!input.previousId && Object.keys(input.answers).length) throw new Error('Answers must refer to an existing guide.');
  if (previous) continuation(input,previous);
  if(input.resolution&&previous)return resolveGuide(input,previous,bindings,emit,signal,fetcher,options);
  const cumulative=previous?.guide.journey||{modelCalls:previous?.guide.engine?.attempts||0,inputTokens:previous?.guide.engine?.inputTokens||0,outputTokens:previous?.guide.engine?.outputTokens||0,modelMs:previous?.guide.engine?.elapsedMs||0};
  const decisions=new Map((previous?.guide.decisions||[]).map(d=>[d.id,d]));
  for(const question of previous?.guide.questions||[])if(input.answers[question.id])decisions.set(question.id,{id:question.id,question:question.prompt,answer:input.answers[question.id]});
  if(previous?.guide.questions.some(q=>!input.answers[q.id]))throw new Error('Choose an answer for every current question.');
  const deferred=(previous?.guide.pendingQuestions||[]).filter(q=>!input.answers[q.id]);
  let research=options.checkpoint?.research||(previous?{documents:previous.documents,website:previous.guide.provider.website,inferred:previous.guide.provider.identity==='inferred',warnings:previous.guide.warnings}:null);
  let identityConfirmed=!!input.website||input.answers['provider-identity']==='Yes, this is the provider'||previous?.guide.provider.identity==='provided';
  if(!research&&!input.website){const website=await discoverProvider(input,bindings,emit,signal,fetcher);research={website,inferred:true,documents:[],warnings:[]};}
  let clarificationUsed=!!previous?.guide.clarificationUsed||!!options.checkpoint?.clarificationUsed||!!previous?.guide.questions.some(q=>q.id!=='provider-identity');
  let followupDone=previous?.guide.followupDone||options.checkpoint?.followupDone||false;
  const intent=options.checkpoint?.intent||(previous?{requestedActions:previous.guide.requestedActions||[],prohibitions:previous.guide.prohibitions||[]}:undefined);
  let interpreted:{value:Interpretation;mode:'interpreted'|'evidence-only';notice:string;telemetry?:LiveGuide['engine']}|Awaited<ReturnType<typeof interpretEvidence>>;
  if(!identityConfirmed){
    interpreted={value:{...evidenceOnly([]),questions:[{id:'provider-identity',prompt:'Continue with '+new URL(research!.website).hostname+'?',why:'Confirm the provider before documentation research or model planning begins.',options:['Yes, this is the provider','No, I will enter its website']}]},mode:'evidence-only',notice:'Provider discovery is complete. No documentation crawl or model planning has run.'};
  }else if(deferred.length){
    interpreted={value:{...evidenceOnly(research!.documents),...intent,questions:deferred},mode:'interpreted',notice:'These setup choices were already saved. No new research or model call was needed.'};
    emit({stage:'Saved choices ready',detail:'Reusing the questions and documentation already collected.',status:'done'});
  }else{
    if(input.documentationUrl){
      research=await retrieve(input,bindings,emit,signal,fetcher,{previous:research||undefined,urls:[input.documentationUrl],refresh:true});
      // New evidence invalidates a saved interpretation, not confirmed intent.
      options={...options,checkpoint:undefined};followupDone=false;
      await options.save?.({research,clarificationUsed,followupDone,intent});
    }
    if(!research?.documents.length){research=await retrieve({...input,website:research?.website||input.website},bindings,emit,signal,fetcher);research.inferred=false;await options.save?.({research,clarificationUsed,followupDone,intent});}
    emit({stage:clarificationUsed?'Building your guide':'Checking setup choices',detail:'Using '+research.documents.length+' saved source snapshots. Your request and previous answers are retained.',status:'working'});
    interpreted=options.checkpoint?.draft?{value:options.checkpoint.draft,mode:'interpreted',notice:'Continuing the saved plan checkpoint. No completed planning call was repeated.'}:await interpretEvidence(input,research.documents,bindings,signal,fetcher,[...decisions.values()],{final:clarificationUsed,intent});
    if('decisionOnly' in interpreted&&interpreted.decisionOnly&&!interpreted.value.questions.length){
      const decisionTelemetry=interpreted.telemetry;
      const confirmedIntent={requestedActions:interpreted.value.requestedActions,prohibitions:interpreted.value.prohibitions};
      clarificationUsed=true;await options.save?.({research,clarificationUsed,followupDone,intent:confirmedIntent});
      emit({stage:'Building your guide',detail:'Requirements are clear. Creating the plan from saved evidence.',status:'working'});
      interpreted=await interpretEvidence(input,research.documents,bindings,signal,fetcher,[...decisions.values()],{final:true,intent:confirmedIntent});
      if(decisionTelemetry&&interpreted.telemetry)for(const k of ['attempts','inputTokens','outputTokens','elapsedMs','thinkingTokens'] as const)interpreted.telemetry[k]=(interpreted.telemetry[k]||0)+(decisionTelemetry[k]||0);
    }
    if(clarificationUsed&&interpreted.value.questions.length){
      for(const q of interpreted.value.questions)interpreted.value.blockers.push({title:q.prompt,consequence:'test',owner:'Developer',resolution:q.why});
      interpreted.value.questions=[];interpreted.value.steps=interpreted.value.steps.filter(s=>s.stage==='prepare');
    }
    const materialTopics=interpreted.value.researchNeeded.filter(t=>t!=='distribution');
    if(interpreted.mode==='interpreted'&&!interpreted.value.questions.length&&materialTopics.length&&!followupDone){
      followupDone=true;await options.save?.({research,clarificationUsed,followupDone,intent,draft:interpreted.value});
      emit({stage:'Checking a missing requirement',detail:'Looking only for missing '+materialTopics.join(', ')+' evidence.',status:'working'});
      const expanded=await retrieve(input,bindings,emit,signal,fetcher,{previous:research,topics:materialTopics});
      if(expanded.documents.length>research.documents.length){
        research=expanded;await options.save?.({research,clarificationUsed,followupDone,intent,draft:interpreted.value});
        const refined=await interpretEvidence(input,research.documents,bindings,signal,fetcher,[...decisions.values()],{final:true,intent:{requestedActions:interpreted.value.requestedActions,prohibitions:interpreted.value.prohibitions}});
        const original=interpreted.telemetry;
        if(refined.mode==='interpreted')interpreted=refined;else research.warnings.push('Additional evidence was saved, but the follow-up interpretation failed. Earlier findings remain provisional.');
        if(original&&refined.telemetry){const totals={...original,followupOutcome:refined.telemetry.outcome};for(const k of ['attempts','inputTokens','outputTokens','elapsedMs','thinkingTokens'] as const)totals[k]=(original[k]||0)+(refined.telemetry[k]||0);interpreted.telemetry=totals;}
      }

    }
    if(interpreted.mode==='interpreted'&&!interpreted.value.questions.length){await options.save?.({research,clarificationUsed,followupDone,intent,draft:interpreted.value});emit({stage:'Checking action coverage',detail:'Reviewing each permission relationship separately from execution.',status:'working'});const review=await reviewMappings(interpreted.value,input,bindings,signal,fetcher,research.documents);interpreted.value=review.value;if(interpreted.telemetry)for(const k of ['attempts','inputTokens','outputTokens','elapsedMs','thinkingTokens'] as const)interpreted.telemetry[k]=(interpreted.telemetry[k]||0)+(review.telemetry[k]||0);await options.save?.({research,clarificationUsed,followupDone,intent,draft:interpreted.value});}
  }
  research=research!;signal.throwIfAborted();
  const value=interpreted.value;
  const pendingQuestions=!identityConfirmed?deferred:[];
  if(value.questions.length){value.summary='Confirm the setup choices for '+input.app+'. Your request and evidence are saved.';value.recommendation='Continue with these choices to build your guide.';value.nextAction='Answer the current setup choices.';value.steps=[];value.activeEffort={range:'',assumptions:''};}
  const phase=!identityConfirmed?'identity':value.questions.length?'clarification':'ready';
  const telemetry=interpreted.telemetry;
  const guide: LiveGuide = {
    ...value,phase,clarificationUsed:clarificationUsed||phase==='clarification',followupDone,schemaVersion:1,id:'lg-'+crypto.randomUUID(),...(previous?{previousId:previous.guide.id}:{}),generatedAt:new Date().toISOString(),input,
    provider:{website:research.website,identity:identityConfirmed?'provided':'inferred'},
    status:value.oauthSupport==='unsupported'?'unsupported':value.questions.length?'needs-input':interpreted.mode==='interpreted' && value.oauthSupport==='documented' && !research.warnings.length && value.unknowns.length===0 && value.coverage.every(c=>c.status==='mapped') && !value.blockers.some(b=>b.consequence==='test')?'documented-plan':'provisional',
    mode:interpreted.mode,notice:interpreted.notice,warnings:research.warnings,setupTested:false,
    decisions:[...decisions.values()],
    ...(pendingQuestions.length?{pendingQuestions}:{}),
    ...(telemetry?.attempts?{engine:{...telemetry,provider:'anthropic' as const,promptVersion:PROMPT_VERSION}}:{}),
    journey:{modelCalls:cumulative.modelCalls+(telemetry?.attempts||0),inputTokens:cumulative.inputTokens+(telemetry?.inputTokens||0),outputTokens:cumulative.outputTokens+(telemetry?.outputTokens||0),modelMs:cumulative.modelMs+(telemetry?.elapsedMs||0)},
    sources:research.documents.map(({text:_text,...source})=>source),integration:integrationContext(input.app),
  };
  const resourceActions=value.requestedActions.filter(isResource);
  const requestsDocumented=resourceActions.length>0&&resourceActions.every(a=>value.coverage.some(c=>c.actionId===a.id&&c.status==='mapped'&&c.support==='reviewed')&&value.steps.some(s=>s.testKind==='action'&&s.actionIds?.includes(a.id)&&concreteRequest(s)));
  const failed=telemetry&&telemetry.outcome!=='accepted';
  emit(failed?{stage:'Guide unfinished',detail:'Your request and '+research.documents.length+' sources are saved. Retry the unfinished planning step.',status:'warning'}:{stage:phase==='ready'?(requestsDocumented?'Requested test documented':'Guide saved with gaps'):'Waiting for your choices',detail:phase==='ready'?(requestsDocumented?'The requested API test is documented. Setup and execution have not been verified.':'Your sources and available steps are saved. Resolve the marked gaps before the requested API test.'):'Continue this saved request; completed work will be reused.',status:'done'});
  return {guide,documents:research.documents};
}
