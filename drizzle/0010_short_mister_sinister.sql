CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`user_name` text NOT NULL,
	`user_role` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer,
	`room_id` integer,
	`old_value` text,
	`new_value` text,
	`reason` text DEFAULT '' NOT NULL,
	`approval_request_id` integer,
	`session_info` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_created` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_room_created` ON `audit_logs` (`room_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `stay_guests` ADD `joined_at` text;--> statement-breakpoint
ALTER TABLE `stay_guests` ADD `left_at` text;--> statement-breakpoint
ALTER TABLE `stay_guests` ADD `added_by` text;--> statement-breakpoint
ALTER TABLE `stay_guests` ADD `removed_by` text;--> statement-breakpoint
ALTER TABLE `stay_guests` ADD `removal_reason` text;--> statement-breakpoint
CREATE INDEX `idx_stay_guests_stay_active` ON `stay_guests` (`stay_id`,`left_at`);