CREATE TABLE `cash_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text DEFAULT 'ABIERTA' NOT NULL,
	`opened_by_user_id` integer NOT NULL,
	`opened_by_name` text NOT NULL,
	`opened_at` text NOT NULL,
	`opening_cash_cents` integer NOT NULL,
	`opening_notes` text DEFAULT '' NOT NULL,
	`closed_by_user_id` integer,
	`closed_by_name` text,
	`closed_at` text,
	`expected_cash_cents` integer,
	`counted_cash_cents` integer,
	`difference_cents` integer,
	`difference_reason` text,
	`closing_notes` text,
	`reviewed_by_user_id` integer,
	`reviewed_by_name` text,
	`reviewed_at` text,
	`review_note` text
);
--> statement-breakpoint
CREATE INDEX `idx_cash_sessions_status_opened` ON `cash_sessions` (`status`,`opened_at`);--> statement-breakpoint
CREATE TABLE `sale_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`cash_session_id` integer,
	`payment_method` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`received_by_user_id` integer NOT NULL,
	`received_by_name` text NOT NULL,
	`received_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sale_payments_sale_received` ON `sale_payments` (`sale_id`,`received_at`);--> statement-breakpoint
CREATE INDEX `idx_sale_payments_session_method` ON `sale_payments` (`cash_session_id`,`payment_method`);--> statement-breakpoint
CREATE TABLE `sale_return_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`return_id` integer NOT NULL,
	`sale_item_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`product_name` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`unit_cost_cents` integer NOT NULL,
	`total_price_cents` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sale_return_items_return` ON `sale_return_items` (`return_id`);--> statement-breakpoint
CREATE INDEX `idx_sale_return_items_sale_item` ON `sale_return_items` (`sale_item_id`);--> statement-breakpoint
CREATE TABLE `sale_returns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`return_number` text,
	`reason` text NOT NULL,
	`responsible` text NOT NULL,
	`physical_condition` text NOT NULL,
	`returns_to_stock` integer DEFAULT false NOT NULL,
	`refund_method` text NOT NULL,
	`refund_amount_cents` integer DEFAULT 0 NOT NULL,
	`cash_session_id` integer,
	`created_by_user_id` integer NOT NULL,
	`created_by_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sale_returns_return_number_unique` ON `sale_returns` (`return_number`);--> statement-breakpoint
CREATE INDEX `idx_sale_returns_sale_created` ON `sale_returns` (`sale_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sale_returns_session_method` ON `sale_returns` (`cash_session_id`,`refund_method`);--> statement-breakpoint
ALTER TABLE `sales` ADD `cash_session_id` integer;--> statement-breakpoint
INSERT INTO `sale_payments` (`sale_id`, `cash_session_id`, `payment_method`, `amount_cents`, `reference`, `received_by_user_id`, `received_by_name`, `received_at`)
SELECT `id`, NULL, `payment_method`, `total_cents`, 'Migración de venta pagada existente', `created_by_user_id`, `created_by_name`, `created_at`
FROM `sales` WHERE `status` = 'PAGADA' AND `payment_method` != 'PENDIENTE';
