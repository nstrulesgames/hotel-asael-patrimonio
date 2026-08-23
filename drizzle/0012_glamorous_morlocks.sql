CREATE TABLE `exit_assessments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stay_id` integer NOT NULL,
	`room_id` integer NOT NULL,
	`segment_id` integer NOT NULL,
	`delivery_inspection_id` integer NOT NULL,
	`return_inspection_id` integer NOT NULL,
	`work_order_id` integer,
	`issue_count` integer DEFAULT 0 NOT NULL,
	`missing_count` integer DEFAULT 0 NOT NULL,
	`observed_count` integer DEFAULT 0 NOT NULL,
	`discrepancies` text DEFAULT '[]' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`submitted_by_user_id` integer NOT NULL,
	`submitted_by_name` text NOT NULL,
	`submitted_at` text NOT NULL,
	`reviewed_by_user_id` integer,
	`reviewed_by_name` text,
	`reviewed_at` text,
	`review_note` text
);
--> statement-breakpoint
CREATE INDEX `idx_exit_assessments_status_submitted` ON `exit_assessments` (`status`,`submitted_at`);--> statement-breakpoint
CREATE INDEX `idx_exit_assessments_segment_submitted` ON `exit_assessments` (`segment_id`,`submitted_at`);