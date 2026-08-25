CREATE TABLE `commercial_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_by_user_id` integer,
	`updated_by_name` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_evidences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_payment_id` integer NOT NULL,
	`filename` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`uploaded_by_user_id` integer NOT NULL,
	`uploaded_by_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_payment_evidences_payment` ON `payment_evidences` (`sale_payment_id`);--> statement-breakpoint
CREATE TABLE `replenishment_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`requested_quantity` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'PENDIENTE' NOT NULL,
	`requested_by_user_id` integer NOT NULL,
	`requested_by_name` text NOT NULL,
	`requested_at` text NOT NULL,
	`reviewed_by_user_id` integer,
	`reviewed_by_name` text,
	`reviewed_at` text,
	`review_note` text,
	`fulfilled_movement_id` integer
);
--> statement-breakpoint
CREATE INDEX `idx_replenishment_status_requested` ON `replenishment_requests` (`status`,`requested_at`);--> statement-breakpoint
CREATE INDEX `idx_replenishment_product_status` ON `replenishment_requests` (`product_id`,`status`);
--> statement-breakpoint
INSERT INTO `commercial_settings` (`key`, `value`, `updated_by_name`, `updated_at`) VALUES ('pending_limit_cents', '20000', 'Sistema', CURRENT_TIMESTAMP);
