import { neon } from '@neondatabase/serverless';
import { after } from 'next/server';
import { postgresStore } from './postgres-store.ts';
import type { RuntimeBindings } from './runtime-types.ts';

export function getRuntime(): RuntimeBindings {
  const connection = process.env.DATABASE_URL;
  const sql = connection ? neon(connection) : undefined;
  return {
    AI_PROVIDER: process.env.AI_PROVIDER,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
    LIVE_GUIDE_ANTHROPIC_KEY: process.env.LIVE_GUIDE_ANTHROPIC_KEY,
    LIVE_GUIDE_ANTHROPIC_MODEL: process.env.LIVE_GUIDE_ANTHROPIC_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    LIVE_GUIDE_FIRECRAWL_KEY: process.env.LIVE_GUIDE_FIRECRAWL_KEY,
    COMPOSIO_API_KEY: process.env.COMPOSIO_API_KEY,
    platform: process.env.VERCEL === '1' ? 'vercel' : undefined,
    DB: sql ? postgresStore((statement, values) => sql.query(statement, values)) : undefined,
  };
}

export function retainJob(work: Promise<unknown>) {
  after(async () => { await work; });
}

export const storageBackend = 'postgres';
