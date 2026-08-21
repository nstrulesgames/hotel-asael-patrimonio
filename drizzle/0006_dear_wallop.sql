CREATE TABLE `room_turnovers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stay_id` integer NOT NULL,
	`room_id` integer NOT NULL,
	`status` text NOT NULL,
	`cleaning_started_at` text,
	`cleaning_started_by` text,
	`cleaning_completed_at` text,
	`cleaning_completed_by` text,
	`final_inspection_id` integer,
	`approved_at` text,
	`approved_by` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_turnovers_room_status` ON `room_turnovers` (`room_id`,`status`);--> statement-breakpoint
ALTER TABLE `documents` ADD `phase` text DEFAULT 'GENERAL' NOT NULL;