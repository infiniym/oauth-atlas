import { env } from 'cloudflare:workers';
import { getRequestExecutionContext } from 'vinext/shims/request-context';
import type { RuntimeBindings } from './runtime-types.ts';

export function getRuntime(): RuntimeBindings {
  return env as unknown as RuntimeBindings;
}

export function retainJob(work: Promise<unknown>) {
  getRequestExecutionContext()?.waitUntil(work);
}

export const storageBackend = 'd1';
