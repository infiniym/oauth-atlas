CREATE TABLE `guide_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`request_key` text NOT NULL,
	`payload` text NOT NULL,
	`state` text NOT NULL,
	`lease` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guide_jobs_request_key_unique` ON `guide_jobs` (`request_key`);