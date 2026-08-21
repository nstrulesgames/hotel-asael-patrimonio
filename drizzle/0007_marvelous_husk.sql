CREATE TABLE `stay_room_segments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stay_id` integer NOT NULL,
	`room_id` integer NOT NULL,
	`sequence` integer NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`start_reason` text NOT NULL,
	`end_reason` text,
	`created_by` text NOT NULL,
	`ended_by` text
);
--> statement-breakpoint
CREATE INDEX `idx_stay_segments_stay_sequence` ON `stay_room_segments` (`stay_id`,`sequence`);--> statement-breakpoint
ALTER TABLE `documents` ADD `segment_id` integer;--> statement-breakpoint
CREATE INDEX `idx_documents_segment_id` ON `documents` (`segment_id`);--> statement-breakpoint
ALTER TABLE `inspections` ADD `segment_id` integer;--> statement-breakpoint
CREATE INDEX `idx_inspections_segment_kind` ON `inspections` (`segment_id`,`kind`);--> statement-breakpoint
ALTER TABLE `room_turnovers` ADD `segment_id` integer;