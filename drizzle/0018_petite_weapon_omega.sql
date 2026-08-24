CREATE TABLE `commercial_sequences` (
	`year` integer PRIMARY KEY NOT NULL,
	`next_value` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`product_name` text NOT NULL,
	`product_sku` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`unit_cost_cents` integer NOT NULL,
	`total_price_cents` integer NOT NULL,
	`total_cost_cents` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sale_items_sale` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE TABLE `sale_stock_allocations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`batch_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_cost_cents` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sale_allocations_sale` ON `sale_stock_allocations` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_sale_allocations_batch` ON `sale_stock_allocations` (`batch_id`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_number` text NOT NULL,
	`sale_year` integer NOT NULL,
	`sequence` integer NOT NULL,
	`sale_type` text NOT NULL,
	`stay_id` integer,
	`room_id` integer,
	`consumer_guest_id` integer,
	`customer_name` text,
	`status` text NOT NULL,
	`payment_method` text NOT NULL,
	`subtotal_cents` integer NOT NULL,
	`total_cents` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`print_count` integer DEFAULT 0 NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`created_by_name` text NOT NULL,
	`created_at` text NOT NULL,
	`cancelled_by_user_id` integer,
	`cancelled_by_name` text,
	`cancelled_at` text,
	`cancellation_reason` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_sale_number_unique` ON `sales` (`sale_number`);--> statement-breakpoint
CREATE INDEX `idx_sales_stay_status` ON `sales` (`stay_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_sales_created_status` ON `sales` (`created_at`,`status`);