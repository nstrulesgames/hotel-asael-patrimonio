CREATE TABLE `inventory_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stay_id` integer NOT NULL,
	`room_id` integer NOT NULL,
	`segment_id` integer NOT NULL,
	`inventory_item_id` integer,
	`item_name` text NOT NULL,
	`quantity` integer NOT NULL,
	`movement_type` text NOT NULL,
	`reason` text NOT NULL,
	`responsible` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_inventory_movements_segment_created` ON `inventory_movements` (`segment_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_inventory_movements_room_created` ON `inventory_movements` (`room_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `room_infrastructure_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_id` integer NOT NULL,
	`area` text NOT NULL,
	`name` text NOT NULL,
	`evidence_category` text NOT NULL,
	`required_evidence` integer DEFAULT true NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`notes` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_room_infrastructure_room_active` ON `room_infrastructure_items` (`room_id`,`active`);--> statement-breakpoint
ALTER TABLE `documents` ADD `inventory_movement_id` integer;--> statement-breakpoint
ALTER TABLE `documents` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_documents_inventory_movement_id` ON `documents` (`inventory_movement_id`);--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `item_type` text DEFAULT 'PERMANENTE' NOT NULL;