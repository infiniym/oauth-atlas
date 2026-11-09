import type { Bindings } from '../live-guide/contracts.ts';
import type { Store } from '../live-guide/http.ts';

export type RuntimeBindings = Bindings & {
  DB?: Store;
  COMPOSIO_API_KEY?: string;
  platform?: 'vercel';
};

export function requestAddress(request: Request, bindings: RuntimeBindings): string {
  const header = bindings.platform === 'vercel' ? 'x-vercel-forwarded-for' : 'cf-connecting-ip';
  return request.headers.get(header) || 'local-preview';
}
