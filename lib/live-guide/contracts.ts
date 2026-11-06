import { z } from 'zod';
import {getDomain} from 'tldts';
import type {IntentAiBindings} from '../ai/config.ts';

const text = (max: number) => z.string().trim().min(1).max(max).refine(s => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s), 'Use plain text.');
export const inputSchema = z.object({
  documentationUrl:z.string().max(1500).optional(),
  app: text(100), website: z.string().trim().max(1500).default(''),
  useCase: z.string().trim().max(1500).default(''),
  audience: z.enum(['internal', 'customers', 'unknown']).default('unknown'),
  answers: z.record(z.string().max(60), text(300)).refine(a => Object.keys(a).length <= 24).default({}),
  previousId: z.string().regex(/^lg-[a-f0-9-]{36}$/).optional(),
  resolution:z.object({kind:z.enum(['find-request','documentation','observation','refresh']),actionId:text(60).optional(),url:z.string().max(1500).optional(),blockerTitle:text(250).optional(),note:text(600).optional(),satisfied:z.boolean().optional(),requestId:z.string().uuid()}).strict().optional(),
}).strict();
export type GuideInput = z.infer<typeof inputSchema>;
export type Progress = { stage: string; detail: string; status: 'working' | 'done' | 'warning';at?:string };
export type Document = { id: string; url: string; title: string; retrievedAt: string; hash: string; text: string; links?:string[] };
export type Evidence = { sourceId: string; quote: string };
const evidenceSchema = z.array(z.object({ sourceId: text(20), quote: text(260) }).strict()).min(1).max(6);
export const findingSchema = z.object({
  kind: z.enum(['oauth', 'permission', 'provider-review', 'customer-approval', 'prerequisite', 'provider-wait']),
  title: text(120), detail: text(800), appliesWhen: z.string().trim().max(400).default(''), scope:z.string().max(100).default(''), evidence: evidenceSchema,
  stage:z.enum(['prepare','test','launch']).optional(),stepIds:z.array(text(60)).max(10).optional(),
}).strict();
const stepSchema = z.object({
  title: text(120), detail: text(800), owner: z.enum(['developer', 'agent', 'customer admin', 'provider']),
  doneWhen: text(400), evidence: evidenceSchema,
  appliesWhen:z.string().max(400).optional(),
  id:text(60).optional(),dependsOn:z.array(text(60)).max(10).optional(),actionIds:z.array(text(60)).max(10).optional(),
  testKind:z.enum(['prepare','authorization','action','boundary','lifecycle','launch']).optional(),
  request:z.object({method:z.string().max(20),endpoint:z.string().max(1500),example:z.string().max(800),responsePath:z.string().max(200).optional()}).strict().optional(),
  stage:z.enum(['prepare','test','launch']).default('test'),destination:z.string().max(1500).default(''),fields:z.array(text(200)).max(8).default([]),
}).strict();
export const questionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,59}$/), prompt: text(200), why: text(300),
  options: z.array(text(120)).min(2).max(3),
}).strict();
export const interpretationSchema = z.object({
  accessModel:z.enum(['oauth','public','unknown']).default('oauth'),
  semanticsVersion:z.literal(2).optional(),
  requestedActions:z.array(z.object({id:text(60),title:text(180),category:z.enum(['resource','authorization']).optional(),operation:z.enum(['read','create','update','delete','authorize','other'])}).strict()).max(10).default([]),
  prohibitions:z.array(text(200)).max(10).default([]),
  oauthSupport: z.enum(['documented', 'unsupported', 'unknown']),
  summary: text(700), recommendation: text(700), nextAction: text(400),
  findings: z.array(findingSchema).max(16), steps: z.array(stepSchema).max(24),
  questions: z.array(questionSchema).max(3),
  activeEffort: z.object({ range: z.string().max(100), assumptions: z.string().max(500) }).strict(),
  unknowns: z.array(text(400)).max(10),
  blockers:z.array(z.object({title:text(250),consequence:z.enum(['test','launch','follow-up']),kind:z.enum(['prerequisite','instruction','verification','missing-evidence']).optional(),owner:text(80),resolution:text(500),stepIds:z.array(text(60)).max(10).optional(),resolutionStepIds:z.array(text(60)).max(10).optional(),actionId:text(60).optional(),gap:z.object({actionId:text(60),fact:z.enum(['request','permission'])}).strict().optional()}).strict()).max(10).default([]),
  coverage:z.array(z.object({action:text(180),actionId:text(60).optional(),permissions:z.array(text(100)).max(8),status:z.enum(['mapped','unresolved','unsupported']),reason:text(800),missingFact:z.enum(['registration','permission','request','response']).optional(),evidence:z.array(z.object({sourceId:text(20),quote:text(260)})).max(6).optional(),support:z.enum(['reviewed','unresolved']).optional()}).strict()).max(10).default([]),
  researchNeeded:z.array(z.enum(['registration','permissions','identity','distribution'])).max(3).default([]),
}).strict();
export type Interpretation = z.infer<typeof interpretationSchema>;
export type RequestIntent=Pick<Interpretation,'requestedActions'|'prohibitions'>;
export type InferenceOutcome='accepted' | 'not-configured' | 'upstream-error' | 'incomplete' | 'validation-rejected' | 'timeout';
export type InferenceTelemetry = {
  model: string; attempts: number; elapsedMs: number; inputTokens: number; outputTokens: number;
  thinkingTokens?: number; thinking?: 'adaptive'|'disabled'|'between_tools'|'mixed'; effort?: 'medium'|'low';
  validationIssues?:string[];
  outcome:InferenceOutcome;followupOutcome?:InferenceOutcome;
  reviewOutcome?:InferenceOutcome;
};
export type LiveGuide = Interpretation & {
  schemaVersion: 1; id: string; previousId?: string; generatedAt: string; input: GuideInput;
  provider: { website: string; identity: 'provided' | 'inferred' };
  mode: 'interpreted' | 'evidence-only'; status: 'provisional' | 'needs-input' | 'unsupported' | 'documented-plan';
  notice: string; warnings: string[]; setupTested: false;
  engine?: InferenceTelemetry & { provider:'anthropic'; promptVersion:string };
  decisions?: {id:string;question:string;answer:string}[];
  pendingQuestions?:Interpretation['questions'];
  phase?:'identity'|'clarification'|'ready';
  resultState?:'researching'|'needs-user-decision'|'usable-guide'|'provider-limitation'|'research-failure';
  researchMetrics?:{navigationCalls:number};
  clarificationUsed?:boolean;
  followupDone?:boolean;
  journey?:{modelCalls:number;inputTokens:number;outputTokens:number;modelMs:number};
  observations?:{blockerTitle:string;note:string;satisfied:boolean;recordedAt:string;reportedBy:'developer'}[];
  sources: Omit<Document, 'text'>[];
  integration: { catalogName?: string; docsUrl?: string; message: string };
};
export type StoredRun = { guide: LiveGuide; documents: Document[] };
export type Bindings = IntentAiBindings & {
  LIVE_GUIDE_FIRECRAWL_KEY?: string;
};
export type Research = { documents: Document[]; website: string; inferred: boolean; warnings: string[];navigationCalls?:number };
export type WorkflowCheckpoint={research:Research;clarificationUsed?:boolean;followupDone?:boolean;intent?:RequestIntent;facts?:Interpretation;draft?:Interpretation;draftAccepted?:boolean;pendingReviewActionId?:string};

export function normalizeInput(raw: unknown): GuideInput {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Enter an app name (up to 100 characters), a short use case and valid answers.');
  const input = parsed.data;
  if (!input.website && /^(?:https:\/\/|[a-z0-9-]+\.[a-z]{2,}(?:\/|$))/i.test(input.app)) {
    input.website = input.app;
    input.app = new URL(publicUrl(input.website)).hostname.replace(/^www\./, '');
  }
  if (input.website) input.website = publicUrl(input.website).href;
  if(input.resolution&&!input.previousId)throw new Error('An update must refer to a saved guide.');
  if(input.documentationUrl)input.documentationUrl=publicUrl(input.documentationUrl).href;
  if(input.resolution?.url)input.resolution.url=publicUrl(input.resolution.url).href;
  if (/[<>\u0000-\u001f]/.test(input.useCase)) throw new Error('Describe the use case in plain text.');
  return input;
}

export function publicUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value.includes('://') ? value : `https://${value}`); }
  catch { throw new Error('Use a public HTTPS website or documentation URL.'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') ||
    !host.includes('.') || !/^[a-z0-9.-]+$/.test(host) || /^\d+(?:\.\d+)*$/.test(host) ||
    host.split('.').some(p => !p || p.startsWith('-') || p.endsWith('-')) ||
    /\.(?:localhost|local|internal|lan|home|test|invalid|example|onion)$/.test(host)) {
    throw new Error('Use a public HTTPS domain without credentials, IP addresses or custom ports.');
  }
  if ([...url.searchParams.keys()].some(k => /token|secret|password|api[_-]?key|^code$/i.test(k))) throw new Error('Remove credentials from the URL.');
  url.hash = '';
  return url;
}
export function onProvider(url: string, seed: string): boolean {
  const host = new URL(url).hostname.replace(/^www\./, '');
  const base = new URL(seed).hostname.replace(/^www\./, '');
  if(host===base||host.endsWith('.'+base))return true;
  const domain=getDomain(base,{allowPrivateDomains:true});return !!domain&&domain===getDomain(host,{allowPrivateDomains:true});
}
export const normalizeText = (s: string) => s.replace(/\s+/g, ' ').trim();
