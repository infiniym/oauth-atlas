import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const guides = sqliteTable('guides', {
  id: text('id').primaryKey(), payload: text('payload').notNull(), createdAt: text('created_at').notNull(),
});
export const researchLimits = sqliteTable('research_limits', {
  bucket: text('bucket').primaryKey(), count: integer('count').notNull().default(0),
});

// Live research shares the existing database and migration sequence.
export { liveGuides, liveGuideLimits } from './live-guide/schema';
export const launchPlans=sqliteTable('launch_plans',{id:text('id').primaryKey(),payload:text('payload').notNull(),createdAt:text('created_at').notNull()});
export const guideJobs=sqliteTable('guide_jobs',{id:text('id').primaryKey(),requestKey:text('request_key').notNull().unique(),payload:text('payload').notNull(),state:text('state').notNull(),lease:text('lease'),leaseUntil:integer('lease_until').notNull().default(0),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()});
