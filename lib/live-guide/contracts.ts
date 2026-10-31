import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max).refine(s => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s), 'Use plain text.');
export const inputSchema = z.object({
  app: text(100), website: z.string().trim().max(1500).default(''),
  useCase: z.string().trim().max(600).default(''),
  audience: z.enum(['internal', 'customers', 'unknown']).default('unknown'),
  answers: z.record(z.string().max(60), text(300)).refine(a => Object.keys(a).length <= 4).default({}),
  previousId: z.string().regex(/^lg-[a-f0-9-]{36}$/).optional(),
}).strict();
export type GuideInput = z.infer<typeof inputSchema>;
export type Progress = { stage: string; detail: string; status: 'working' | 'done' | 'warning' };
export type Document = { id: string; url: string; title: string; retrievedAt: string; hash: string; text: string };
export type Evidence = { sourceId: string; quote: string };
const evidenceSchema = z.array(z.object({ sourceId: text(20), quote: text(260) }).strict()).min(1).max(3);
export const findingSchema = z.object({
  kind: z.enum(['oauth', 'permission', 'provider-review', 'customer-approval', 'prerequisite', 'provider-wait']),
  title: text(120), detail: text(800), appliesWhen: text(400), scope:z.string().max(100).default(''), evidence: evidenceSchema,
}).strict();
const stepSchema = z.object({
  title: text(120), detail: text(800), owner: z.enum(['developer', 'agent', 'customer admin', 'provider']),
  doneWhen: text(400), evidence: evidenceSchema,
}).strict();
const questionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,59}$/), prompt: text(200), why: text(300),
  options: z.array(text(120)).min(2).max(3),
}).strict();
export const interpretationSchema = z.object({
  oauthSupport: z.enum(['documented', 'unsupported', 'unknown']),
  summary: text(700), recommendation: text(700), nextAction: text(400),
  findings: z.array(findingSchema).max(16), steps: z.array(stepSchema).max(10),
  questions: z.array(questionSchema).max(3),
  activeEffort: z.object({ range: z.string().max(100), assumptions: z.string().max(500) }).strict(),
  unknowns: z.array(text(400)).max(10),
}).strict();
export type Interpretation = z.infer<typeof interpretationSchema>;
export type InferenceTelemetry = {
  model: string; attempts: number; elapsedMs: number; inputTokens: number; outputTokens: number;
  thinkingTokens?: number; thinking?: 'adaptive'; effort?: 'medium';
  outcome: 'accepted' | 'not-configured' | 'upstream-error' | 'incomplete' | 'validation-rejected' | 'timeout';
};
export type LiveGuide = Interpretation & {
  schemaVersion: 1; id: string; previousId?: string; generatedAt: string; input: GuideInput;
  provider: { website: string; identity: 'provided' | 'inferred' };
  mode: 'interpreted' | 'evidence-only'; status: 'provisional' | 'needs-input' | 'unsupported' | 'documented-plan';
  notice: string; warnings: string[]; setupTested: false;
  engine?: InferenceTelemetry & { provider:'anthropic'; promptVersion:string };
  decisions?: {id:string;question:string;answer:string}[];
  sources: Omit<Document, 'text'>[];
  integration: { catalogName?: string; docsUrl?: string; message: string };
};
export type StoredRun = { guide: LiveGuide; documents: Document[] };
export type Bindings = {
  LIVE_GUIDE_ANTHROPIC_KEY?: string; LIVE_GUIDE_ANTHROPIC_MODEL?: string; LIVE_GUIDE_FIRECRAWL_KEY?: string;
};
export type Research = { documents: Document[]; website: string; inferred: boolean; warnings: string[] };

export function normalizeInput(raw: unknown): GuideInput {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Enter an app name (up to 100 characters), a short use case and valid answers.');
  const input = parsed.data;
  if (!input.website && /^(?:https:\/\/|[a-z0-9-]+\.[a-z]{2,}(?:\/|$))/i.test(input.app)) {
    input.website = input.app;
    input.app = new URL(publicUrl(input.website)).hostname.replace(/^www\./, '');
  }
  if (input.website) input.website = publicUrl(input.website).href;
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
  return host === base || host.endsWith('.' + base);
}
export const normalizeText = (s: string) => s.replace(/\s+/g, ' ').trim();
