CREATE TABLE `patrimony_distribution` (
	`code` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`percentage` integer NOT NULL,
	`position` integer NOT NULL,
	`updated_by_user_id` integer,
	`updated_by_name` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `patrimony_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`incurred_on` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`status` text DEFAULT 'PENDIENTE' NOT NULL,
	`evidence_note` text NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`created_by_name` text NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_by_user_id` integer,
	`reviewed_by_name` text,
	`reviewed_at` text,
	`review_note` text
);
--> statement-breakpoint
CREATE INDEX `idx_patrimony_expenses_property_date` ON `patrimony_expenses` (`property_id`,`incurred_on`);--> statement-breakpoint
CREATE INDEX `idx_patrimony_expenses_status_date` ON `patrimony_expenses` (`status`,`incurred_on`);--> statement-breakpoint
CREATE TABLE `patrimony_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`tenant_id` integer,
	`paid_on` text NOT NULL,
	`concept` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`payment_method` text NOT NULL,
	`status` text DEFAULT 'CONCILIADO' NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`created_by_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_patrimony_payments_property_date` ON `patrimony_payments` (`property_id`,`paid_on`);--> statement-breakpoint
CREATE INDEX `idx_patrimony_payments_tenant_date` ON `patrimony_payments` (`tenant_id`,`paid_on`);--> statement-breakpoint
CREATE TABLE `patrimony_properties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`property_type` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`unit_count` integer DEFAULT 0 NOT NULL,
	`monthly_potential_cents` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'PRODUCTIVA' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`created_by_name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_patrimony_properties_status` ON `patrimony_properties` (`active`,`status`);--> statement-breakpoint
CREATE TABLE `patrimony_tenants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`unit_name` text NOT NULL,
	`full_name` text NOT NULL,
	`ci` text,
	`phone` text,
	`monthly_rent_cents` integer DEFAULT 0 NOT NULL,
	`payment_day` integer NOT NULL,
	`contract_start` text,
	`contract_end` text,
	`status` text DEFAULT 'ACTIVO' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`created_by_name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_patrimony_tenants_property_active` ON `patrimony_tenants` (`property_id`,`active`);