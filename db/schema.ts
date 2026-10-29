import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const guides = sqliteTable('guides', {
  id: text('id').primaryKey(), payload: text('payload').notNull(), createdAt: text('created_at').notNull(),
});
export const researchLimits = sqliteTable('research_limits', {
  bucket: text('bucket').primaryKey(), count: integer('count').notNull().default(0),
});
