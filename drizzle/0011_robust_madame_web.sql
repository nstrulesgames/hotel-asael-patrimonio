CREATE TABLE `primary_guest_transfers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stay_id` integer NOT NULL,
	`room_id` integer NOT NULL,
	`previous_guest_id` integer NOT NULL,
	`proposed_guest_id` integer NOT NULL,
	`reason` text NOT NULL,
	`status` text NOT NULL,
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
CREATE INDEX `idx_primary_transfers_status_requested` ON `primary_guest_transfers` (`status`,`requested_at`);--> statement-breakpoint
CREATE INDEX `idx_primary_transfers_stay_requested` ON `primary_guest_transfers` (`stay_id`,`requested_at`);