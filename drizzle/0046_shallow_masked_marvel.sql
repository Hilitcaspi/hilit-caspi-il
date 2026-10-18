CREATE TABLE `plus_cancellation_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`request_key` varchar(191) NOT NULL,
	`plus_member_id` int NOT NULL,
	`requested_at` bigint NOT NULL,
	`resolved_at` bigint,
	`push_status` enum('sending','accepted','failed','unknown') NOT NULL,
	`email_status` enum('sending','accepted','failed','unknown') NOT NULL,
	`sms_status` enum('sending','accepted','failed','unknown') NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `plus_cancellation_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `plus_cancellation_requests_request_key_unique` UNIQUE(`request_key`)
);
--> statement-breakpoint
CREATE TABLE `plus_cancellation_settings` (
	`owner_open_id` varchar(64) NOT NULL,
	`recipient_email` varchar(320) NOT NULL,
	`recipient_phone` varchar(30) NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `plus_cancellation_settings_owner_open_id` PRIMARY KEY(`owner_open_id`)
);
--> statement-breakpoint
CREATE INDEX `plus_cancellation_member_idx` ON `plus_cancellation_requests` (`plus_member_id`,`resolved_at`);