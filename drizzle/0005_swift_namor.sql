ALTER TABLE `documents` ADD `uploaded_by` text DEFAULT 'Hotel ASAEL' NOT NULL;--> statement-breakpoint
ALTER TABLE `guests` ADD `identification_pending` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `guests` ADD `updated_at` text;--> statement-breakpoint
CREATE INDEX `idx_guests_ci` ON `guests` (`ci`);--> statement-breakpoint
ALTER TABLE `stays` ADD `capacity_override` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `stays` ADD `capacity_override_reason` text;--> statement-breakpoint
ALTER TABLE `stays` ADD `capacity_authorized_by` text;