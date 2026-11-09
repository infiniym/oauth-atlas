import type { NextConfig } from 'next';
import { releaseMetadata } from './scripts/release-metadata.mjs';

const nextConfig: NextConfig = {
  distDir: '.next-vercel',
  // Only public build identity is inlined. Credentials stay in the runtime.
  env: releaseMetadata(),
};

export default nextConfig;
