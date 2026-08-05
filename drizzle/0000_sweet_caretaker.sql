CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_id` integer NOT NULL,
	`stay_id` integer,
	`category` text NOT NULL,
	`filename` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `floors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `guests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`ci` text,
	`phone` text,
	`is_minor` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `room_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_id` integer NOT NULL,
	`stay_id` integer,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`status` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`floor_id` integer NOT NULL,
	`number` text NOT NULL,
	`type` text NOT NULL,
	`capacity` integer NOT NULL,
	`status` text NOT NULL,
	`notes` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_number_unique` ON `rooms` (`number`);--> statement-breakpoint
CREATE TABLE `stay_guests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stay_id` integer NOT NULL,
	`guest_id` integer NOT NULL,
	`is_primary` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stays` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_id` integer NOT NULL,
	`primary_guest_id` integer NOT NULL,
	`stay_type` text NOT NULL,
	`check_in` text NOT NULL,
	`expected_check_out` text,
	`check_out` text,
	`status` text NOT NULL,
	`notes` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_external_id_unique` ON `users` (`external_id`);