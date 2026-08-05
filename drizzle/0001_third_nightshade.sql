CREATE INDEX `idx_documents_stay_id` ON `documents` (`stay_id`);--> statement-breakpoint
CREATE INDEX `idx_events_room_created` ON `room_events` (`room_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_rooms_floor_id` ON `rooms` (`floor_id`);--> statement-breakpoint
CREATE INDEX `idx_stays_room_status` ON `stays` (`room_id`,`status`);