CREATE TABLE `exceptional_exit_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stay_id` integer NOT NULL,
	`room_id` integer NOT NULL,
	`segment_id` integer NOT NULL,
	`reason` text NOT NULL,
	`witnesses` text DEFAULT '' NOT NULL,
	`photo_count` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`requested_by_user_id` integer NOT NULL,
	`requested_by_name` text NOT NULL,
	`requested_at` text NOT NULL,
	`reviewed_by_user_id` integer,
	`reviewed_by_name` text,
	`reviewed_at` text,
	`review_note` text
);
--> statement-breakpoint
CREATE INDEX `idx_exceptional_exit_status_requested` ON `exceptional_exit_requests` (`status`,`requested_at`);--> statement-breakpoint
CREATE INDEX `idx_exceptional_exit_segment_requested` ON `exceptional_exit_requests` (`segment_id`,`requested_at`);