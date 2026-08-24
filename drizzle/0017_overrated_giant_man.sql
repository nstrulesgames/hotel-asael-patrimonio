CREATE TABLE `commercial_products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'OTROS' NOT NULL,
	`purchase_unit` text NOT NULL,
	`sale_unit` text NOT NULL,
	`units_per_purchase` integer DEFAULT 1 NOT NULL,
	`sale_price_cents` integer DEFAULT 0 NOT NULL,
	`average_cost_cents` integer DEFAULT 0 NOT NULL,
	`minimum_stock` integer DEFAULT 0 NOT NULL,
	`tracks_expiry` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_by` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commercial_products_sku_unique` ON `commercial_products` (`sku`);--> statement-breakpoint
CREATE INDEX `idx_commercial_products_active_name` ON `commercial_products` (`active`,`name`);--> statement-breakpoint
CREATE TABLE `stock_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`location_id` integer NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`unit_cost_cents` integer DEFAULT 0 NOT NULL,
	`expires_on` text,
	`received_at` text NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_stock_batches_product_location_expiry` ON `stock_batches` (`product_id`,`location_id`,`expires_on`);--> statement-breakpoint
CREATE TABLE `stock_locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_locations_code_unique` ON `stock_locations` (`code`);--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`from_location_id` integer,
	`to_location_id` integer,
	`movement_type` text NOT NULL,
	`quantity` integer NOT NULL,
	`total_cost_cents` integer DEFAULT 0 NOT NULL,
	`reason` text NOT NULL,
	`responsible` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_stock_movements_product_created` ON `stock_movements` (`product_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_stock_movements_locations_created` ON `stock_movements` (`from_location_id`,`to_location_id`,`created_at`);