CREATE TABLE `user_access_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`performed_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_user_access_events_user` ON `user_access_events` (`user_id`,`created_at`);