CREATE TABLE `work_order_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_order_id` integer NOT NULL,
	`action` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`detail` text DEFAULT '' NOT NULL,
	`performed_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_work_order_history_order_created` ON `work_order_history` (`work_order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `work_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_id` integer NOT NULL,
	`stay_id` integer,
	`segment_id` integer,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`priority` text NOT NULL,
	`status` text NOT NULL,
	`assigned_user_id` integer,
	`due_at` text,
	`blocks_room` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`started_at` text,
	`started_by` text,
	`completed_at` text,
	`completed_by` text,
	`cancelled_at` text,
	`cancelled_by` text,
	`cancellation_reason` text
);
--> statement-breakpoint
CREATE INDEX `idx_work_orders_room_status` ON `work_orders` (`room_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_work_orders_status_priority` ON `work_orders` (`status`,`priority`);--> statement-breakpoint
ALTER TABLE `documents` ADD `work_order_id` integer;--> statement-breakpoint
CREATE INDEX `idx_documents_work_order_id` ON `documents` (`work_order_id`);