CREATE TABLE `lifecycle_message_keys` (
	`message_key` varchar(191) NOT NULL,
	`email_log_id` int,
	`created_at` bigint NOT NULL,
	CONSTRAINT `lifecycle_message_keys_message_key` PRIMARY KEY(`message_key`)
);
--> statement-breakpoint
CREATE TABLE `lifecycle_recipient_locks` (
	`recipient_hash` varchar(64) NOT NULL,
	`locked_until` bigint NOT NULL,
	`email_log_id` int,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `lifecycle_recipient_locks_recipient_hash` PRIMARY KEY(`recipient_hash`)
);
--> statement-breakpoint
CREATE TABLE `lifecycle_run_claims` (
	`run_key` varchar(120) NOT NULL,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`started_at` bigint NOT NULL,
	`completed_at` bigint,
	`result_json` text,
	CONSTRAINT `lifecycle_run_claims_run_key` PRIMARY KEY(`run_key`)
);
--> statement-breakpoint
ALTER TABLE `email_log` ADD `paymentLeadId` int;--> statement-breakpoint
CREATE INDEX `lifecycle_recipient_locked_until_idx` ON `lifecycle_recipient_locks` (`locked_until`);--> statement-breakpoint
CREATE INDEX `email_log_status_schedule_idx` ON `email_log` (`status`,`scheduledAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `email_log_payment_lead_idx` ON `email_log` (`paymentLeadId`);