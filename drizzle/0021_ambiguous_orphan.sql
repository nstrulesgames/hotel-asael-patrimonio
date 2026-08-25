ALTER TABLE `commercial_products` ADD `item_type` text DEFAULT 'PRODUCTO' NOT NULL;--> statement-breakpoint
ALTER TABLE `sales` ADD `customer_ci` text;--> statement-breakpoint
ALTER TABLE `sales` ADD `customer_phone` text;--> statement-breakpoint
ALTER TABLE `sales` ADD `courtesy_reviewed_by_user_id` integer;--> statement-breakpoint
ALTER TABLE `sales` ADD `courtesy_reviewed_by_name` text;--> statement-breakpoint
ALTER TABLE `sales` ADD `courtesy_reviewed_at` text;--> statement-breakpoint
ALTER TABLE `sales` ADD `courtesy_review_note` text;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `supplier` text;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `receipt_number` text;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `receipt_filename` text;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `receipt_object_key` text;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `receipt_content_type` text;--> statement-breakpoint
INSERT OR IGNORE INTO `commercial_settings` (`key`, `value`, `updated_by_name`, `updated_at`) VALUES ('services_enabled', '0', 'Sistema', CURRENT_TIMESTAMP);
