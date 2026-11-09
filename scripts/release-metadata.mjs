import { execFileSync } from 'node:child_process';
import { guideCodeFingerprint } from './guide-fingerprint.mjs';

export function releaseMetadata() {
  const configured = process.env.OAUTH_RELEASE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA;
  const source = configured || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (!/^[a-f0-9]{40}$/.test(source)) throw new Error('Set OAUTH_RELEASE_COMMIT to the full source commit.');
  return {
    OAUTH_BUILD_SOURCE: source,
    OAUTH_BUILD_TIME: new Date().toISOString(),
    OAUTH_BUILD_FINGERPRINT: guideCodeFingerprint(),
  };
}
