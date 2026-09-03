CREATE TABLE `plus_payment_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plus_member_id` int NOT NULL,
	`single_id` int NOT NULL,
	`event_type` enum('subscription_started','payment_succeeded','payment_failed','subscription_cancelled','subscription_ended') NOT NULL,
	`amount_agorot` int NOT NULL DEFAULT 9900,
	`provider_transaction_id` varchar(200),
	`provider_subscription_id` varchar(200),
	`billing_period_started_at` bigint,
	`billing_period_ends_at` bigint,
	`failure_reason` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `plus_payment_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `plus_pilot_members` ADD `billing_status` enum('not_configured','pending','active','past_due','cancelled','ended') DEFAULT 'not_configured' NOT NULL;--> statement-breakpoint
ALTER TABLE `plus_pilot_members` ADD `monthly_match_target` int DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `plus_pilot_members` ADD `billing_cycle_started_at` bigint;--> statement-breakpoint
ALTER TABLE `plus_pilot_members` ADD `billing_cycle_ends_at` bigint;--> statement-breakpoint
ALTER TABLE `plus_pilot_members` ADD `next_billing_at` bigint;--> statement-breakpoint
ALTER TABLE `plus_pilot_members` ADD `cancelled_at` bigint;--> statement-breakpoint
ALTER TABLE `plus_pilot_members` ADD `provider_subscription_id` varchar(200);--> statement-breakpoint
ALTER TABLE `plus_pilot_members` ADD `last_payment_transaction_id` varchar(200);--> statement-breakpoint
ALTER TABLE `plus_pilot_members` ADD `last_payment_at` bigint;--> statement-breakpoint
ALTER TABLE `plus_pilot_members` ADD `premium_support_enabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `plus_pilot_members` ADD `social_exposure_consent` enum('not_asked','declined','approved') DEFAULT 'not_asked' NOT NULL;--> statement-breakpoint
ALTER TABLE `plus_pilot_members` ADD `social_consent_at` bigint;--> statement-breakpoint
ALTER TABLE `plus_pilot_members` ADD `social_photo_approved` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `plus_pilot_members` ADD `social_copy_approved` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `plus_pilot_members` ADD `social_approved_text` text;--> statement-breakpoint
CREATE INDEX `plus_payment_member_created_idx` ON `plus_payment_events` (`plus_member_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `plus_payment_provider_tx_idx` ON `plus_payment_events` (`provider_transaction_id`);