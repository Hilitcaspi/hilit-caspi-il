CREATE TABLE `meta_purchase_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_key` varchar(64) NOT NULL,
	`product` varchar(50) NOT NULL,
	`amount_agorot` int NOT NULL,
	`event_time` bigint NOT NULL,
	`payload_encrypted` text,
	`state` enum('pending','accepted','failed','expired') NOT NULL DEFAULT 'pending',
	`attempt_count` int NOT NULL DEFAULT 0,
	`next_attempt_at` bigint NOT NULL,
	`claimed_until` bigint,
	`last_category` varchar(60),
	`last_http_status` int,
	`events_received` int,
	`accepted_at` bigint,
	`created_at` bigint NOT NULL,
	CONSTRAINT `meta_purchase_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `meta_purchase_event_idx` UNIQUE(`event_key`)
);
--> statement-breakpoint
CREATE TABLE `meta_purchase_delivery_settings` (
	`id` int NOT NULL,
	`schedule_cron_task_uid` varchar(65),
	`enabled_at` bigint NOT NULL,
	CONSTRAINT `meta_purchase_delivery_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `meta_purchase_due_idx` ON `meta_purchase_deliveries` (`state`,`next_attempt_at`);