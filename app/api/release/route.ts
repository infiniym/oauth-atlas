import { getRuntime, storageBackend } from '@/lib/server/runtime';
import { resolveIntentAiConfig, isIntentAiConfigured } from '@/lib/ai/config';
import { PROMPT_VERSION } from '@/lib/live-guide/interpretation';

export const dynamic = 'force-dynamic';

export function GET() {
  const bindings = getRuntime();
  const config = resolveIntentAiConfig(bindings);
  return Response.json({
    product: 'OAuth Launch Advisor',
    sourceCommit: process.env.OAUTH_BUILD_SOURCE,
    guideCodeFingerprint: process.env.OAUTH_BUILD_FINGERPRINT,
    builtAt: process.env.OAUTH_BUILD_TIME,
    repository: 'https://github.com/infiniym/oauth-atlas',
    promptVersion: PROMPT_VERSION,
    runtime: {
      provider: config.provider || null,
      model: config.model || null,
      configured: isIntentAiConfigured(config),
      storage: bindings.DB ? storageBackend : null,
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
