CREATE TABLE `change_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_id` integer NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`field_name` text NOT NULL,
	`old_value` text,
	`proposed_value` text,
	`reason` text NOT NULL,
	`status` text NOT NULL,
	`application_mode` text NOT NULL,
	`requested_by_user_id` integer NOT NULL,
	`requested_by_name` text NOT NULL,
	`requested_at` text NOT NULL,
	`reviewed_by_user_id` integer,
	`reviewed_by_name` text,
	`reviewed_at` text,
	`review_note` text,
	`applied_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_change_requests_status_requested` ON `change_requests` (`status`,`requested_at`);--> statement-breakpoint
CREATE INDEX `idx_change_requests_entity_field` ON `change_requests` (`entity_type`,`entity_id`,`field_name`);