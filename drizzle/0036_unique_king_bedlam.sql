ALTER TABLE `live_october_tickets` ADD `zoom_registrant_id` varchar(120);--> statement-breakpoint
ALTER TABLE `live_october_tickets` ADD `zoom_join_url_encrypted` text;--> statement-breakpoint
ALTER TABLE `live_october_tickets` ADD `zoom_delivery_state` enum('pending','registered','sent') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `live_october_tickets` ADD `zoom_claimed_until` bigint;--> statement-breakpoint
ALTER TABLE `live_october_tickets` ADD `zoom_attempt_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `live_october_tickets` ADD `zoom_last_error` varchar(80);--> statement-breakpoint
ALTER TABLE `live_october_tickets` ADD `zoom_email_sent_at` bigint;--> statement-breakpoint
ALTER TABLE `live_october_tickets` ADD `zoom_email_message_id` varchar(160);--> statement-breakpoint
CREATE INDEX `live_october_zoom_delivery_idx` ON `live_october_tickets` (`zoom_delivery_state`,`zoom_claimed_until`);