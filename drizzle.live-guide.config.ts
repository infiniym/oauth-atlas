import { defineConfig } from 'drizzle-kit';
// Deliberately separate from Atlas's migration journal until integration.
export default defineConfig({out:'./drizzle/live-guide',schema:'./db/live-guide/schema.ts',dialect:'sqlite'});
