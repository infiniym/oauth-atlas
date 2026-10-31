import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const liveGuides = sqliteTable('live_guides', {
  id:text('id').primaryKey(),payload:text('payload').notNull(),createdAt:text('created_at').notNull(),
});
export const liveGuideLimits = sqliteTable('live_guide_limits', {
  bucket:text('bucket').primaryKey(),count:integer('count').notNull().default(0),
});
