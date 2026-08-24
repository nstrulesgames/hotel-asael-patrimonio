CREATE TABLE `contracts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stay_id` integer NOT NULL,
	`primary_guest_id` integer NOT NULL,
	`initial_room_id` integer NOT NULL,
	`parent_contract_id` integer,
	`contract_number` text NOT NULL,
	`contract_type` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`status` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`ended_by` text,
	`ended_at` text,
	`end_reason` text
);
--> statement-breakpoint
CREATE INDEX `idx_contracts_stay_status` ON `contracts` (`stay_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_contracts_end_status` ON `contracts` (`end_date`,`status`);--> statement-breakpoint
ALTER TABLE `documents` ADD `contract_id` integer;--> statement-breakpoint
CREATE INDEX `idx_documents_contract_id` ON `documents` (`contract_id`);