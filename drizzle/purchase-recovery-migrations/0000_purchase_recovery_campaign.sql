CREATE TABLE `purchase_recovery_recipients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaign_key` varchar(80) NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255),
	`phone` varchar(32),
	`product` varchar(40) NOT NULL,
	`evidence` varchar(60) NOT NULL,
	`evidence_at` bigint NOT NULL,
	`email_consent` boolean NOT NULL DEFAULT false,
	`sms_consent` boolean NOT NULL DEFAULT false,
	`consent_source` varchar(160),
	`suppression_reason` varchar(160),
	`offer_code` varchar(50),
	`send_at` bigint,
	`send_expires_at` bigint,
	`schedule_cron_task_uid` varchar(65),
	`email_state` enum('draft','held','queued','processing','accepted','failed','skipped') NOT NULL DEFAULT 'draft',
	`sms_state` enum('draft','held','queued','processing','accepted','failed','skipped') NOT NULL DEFAULT 'draft',
	`email_provider_message_id` varchar(255),
	`sms_provider_message_id` varchar(255),
	`email_sent_at` bigint,
	`sms_sent_at` bigint,
	`offer_checkout_ref` varchar(255),
	`offer_reserved_until` bigint,
	`offer_redeemed_at` bigint,
	`offer_transaction_id` varchar(120),
	`gift_granted_at` bigint,
	`metadata` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `purchase_recovery_recipients_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_recovery_recipient_unique` UNIQUE(`campaign_key`,`email`,`product`)
);
--> statement-breakpoint
CREATE INDEX `purchase_recovery_due_email` ON `purchase_recovery_recipients` (`campaign_key`,`email_state`,`send_at`);--> statement-breakpoint
CREATE INDEX `purchase_recovery_due_sms` ON `purchase_recovery_recipients` (`campaign_key`,`sms_state`,`send_at`);--> statement-breakpoint
CREATE INDEX `purchase_recovery_cron_lookup` ON `purchase_recovery_recipients` (`schedule_cron_task_uid`);--> statement-breakpoint
CREATE INDEX `purchase_recovery_product_evidence` ON `purchase_recovery_recipients` (`product`,`evidence_at`);