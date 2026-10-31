import catalog from '../../data/catalog.json' with { type:'json' };
import { normalizeInput } from './contracts.ts';
import type { Bindings, GuideInput, LiveGuide, Progress, StoredRun } from './contracts.ts';
import { retrieve } from './retrieval.ts';
import { interpretEvidence, PROMPT_VERSION } from './interpretation.ts';

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
export async function generate(raw: unknown, bindings: Bindings, emit: (event: Progress)=>void, signal: AbortSignal, fetcher: typeof fetch = fetch, previous?: StoredRun): Promise<StoredRun> {
  const input = normalizeInput(raw);
  if (input.previousId && !previous) throw new Error('The previous guide could not be found. Start fresh research.');
  if (!input.previousId && Object.keys(input.answers).length) throw new Error('Answers must refer to an existing guide.');
  if (previous) continuation(input,previous);
  let research = previous ? {documents:previous.documents,website:previous.guide.provider.website,inferred:previous.guide.provider.identity==='inferred',warnings:previous.guide.warnings} : await retrieve(input,bindings,emit,signal,fetcher);
  signal.throwIfAborted();
  emit({stage:'Interpreting the evidence',detail:`Checking the intended actions against ${research.documents.length} saved source snapshots.`,status:'working'});
  const decisions=new Map((previous?.guide.decisions||[]).map(d=>[d.id,d]));
  for(const question of previous?.guide.questions||[])if(input.answers[question.id])decisions.set(question.id,{id:question.id,question:question.prompt,answer:input.answers[question.id]});
  let interpreted = await interpretEvidence(input,research.documents,bindings,signal,fetcher,[...decisions.values()]);
  if(interpreted.mode==='interpreted'&&!interpreted.value.questions.length&&interpreted.value.researchNeeded.length){
    emit({stage:'Resolving missing requirements',detail:'Looking for '+interpreted.value.researchNeeded.join(', ')+' evidence before finalizing the plan.',status:'working'});
    const expanded=await retrieve(input,bindings,emit,signal,fetcher,{previous:research,topics:interpreted.value.researchNeeded});
    if(expanded.documents.length>research.documents.length){
      research=expanded;
      const refined=await interpretEvidence(input,research.documents,bindings,signal,fetcher,[...decisions.values()]);
      const combined={...refined.telemetry,attempts:refined.telemetry.attempts+interpreted.telemetry.attempts,inputTokens:refined.telemetry.inputTokens+interpreted.telemetry.inputTokens,outputTokens:refined.telemetry.outputTokens+interpreted.telemetry.outputTokens,thinkingTokens:(refined.telemetry.thinkingTokens||0)+(interpreted.telemetry.thinkingTokens||0),elapsedMs:refined.telemetry.elapsedMs+interpreted.telemetry.elapsedMs,followupOutcome:refined.telemetry.outcome};
      if(refined.mode==='interpreted'){refined.telemetry=combined;interpreted=refined;}
      else{interpreted.telemetry={...combined,outcome:interpreted.telemetry.outcome};research.warnings.push('Additional sources were found, but the follow-up interpretation did not validate. Earlier supported findings remain provisional.');}
    }
  }
  if(!interpreted.value.questions.length&&interpreted.value.researchNeeded.length)research.warnings.push('Evidence remains unresolved for '+interpreted.value.researchNeeded.join(', ')+'. The bounded research pass did not establish these requirements.');
  const value = interpreted.value;
  const deferred=(previous?.guide.pendingQuestions||[]).filter(q=>!input.answers[q.id]);
  if(deferred.length)value.questions=[...deferred,...value.questions.filter(q=>!deferred.some(d=>d.id===q.id))].slice(0,3);
  const identityConfirmed = !research.inferred || input.answers['provider-identity']==='Yes, this is the provider';
  const pendingQuestions=!identityConfirmed?value.questions.filter(q=>q.id!=='provider-identity'):[];
  if (!identityConfirmed) value.questions = [{id:'provider-identity',prompt:`Is ${new URL(research.website).hostname} the provider you meant?`,why:'The provider was inferred from search. Confirm its identity before following setup advice.',options:['Yes, this is the provider','No, I will enter its website']}];
  if (value.questions.length) {
    value.summary = `Documentation was found for ${input.app}. Confirm the choices below to select a setup path for your intended actions.`;
    value.nextAction = 'Resolve the setup choices below before treating the recommendation as a firm path.';
    value.recommendation = 'A firm setup recommendation depends on the answers below. The cited requirements remain available for inspection.';
    value.steps = [];
    value.activeEffort = {range:'',assumptions:''};
  }
  const guide: LiveGuide = {
    ...value,schemaVersion:1,id:'lg-'+crypto.randomUUID(),...(previous?{previousId:previous.guide.id}:{}),generatedAt:new Date().toISOString(),input,
    provider:{website:research.website,identity:identityConfirmed?'provided':'inferred'},
    status:value.oauthSupport==='unsupported'?'unsupported':value.questions.length?'needs-input':interpreted.mode==='interpreted' && value.oauthSupport==='documented' && !research.warnings.length && value.unknowns.length===0?'documented-plan':'provisional',
    mode:interpreted.mode,notice:interpreted.notice,warnings:research.warnings,setupTested:false,
    decisions:[...decisions.values()],
    ...(pendingQuestions.length?{pendingQuestions}:{}),
    ...(interpreted.telemetry.attempts?{engine:{...interpreted.telemetry,provider:'anthropic' as const,promptVersion:PROMPT_VERSION}}:{}),
    sources:research.documents.map(({text:_text,...source})=>source),integration:integrationContext(input.app),
  };
  emit({stage:'Guide assembled',detail:guide.mode==='interpreted'?'Source-backed findings and setup steps are ready to save.':'Evidence saved as provisional findings; a firm setup plan is not established.',status:'done'});
  return {guide,documents:research.documents};
}
