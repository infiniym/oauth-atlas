import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const connection = process.env.DATABASE_URL;
if (!connection) throw new Error('Set DATABASE_URL in your server environment before migrating.');
const sql = neon(connection);
const statements = readFileSync(new URL('../db/postgres.sql', import.meta.url), 'utf8').split(';').map(value => value.trim()).filter(Boolean);
try {
  await sql.transaction(statements.map(statement => sql.query(statement)));
  console.log('Postgres schema ready.');
} catch {
  console.error('Could not initialize Postgres. Check the database URL, connectivity and schema permissions.');
  process.exitCode = 1;
}
