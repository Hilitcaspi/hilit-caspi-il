CREATE TABLE `plus_checkout_intents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`full_name` varchar(200) NOT NULL,
	`phone` varchar(40) NOT NULL,
	`status` enum('pending','paid_pending_profile','active','failed','cancelled') NOT NULL DEFAULT 'pending',
	`checkout_mode` enum('sandbox','production') NOT NULL,
	`renewal_accepted` boolean NOT NULL DEFAULT false,
	`terms_accepted` boolean NOT NULL DEFAULT false,
	`boost_accepted` boolean NOT NULL DEFAULT false,
	`process_token` varchar(200),
	`provider_transaction_id` varchar(200),
	`provider_subscription_id` varchar(200),
	`amount_agorot` int,
	`single_id` int,
	`plus_member_id` int,
	`paid_at` bigint,
	`activated_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `plus_checkout_intents_id` PRIMARY KEY(`id`),
	CONSTRAINT `plus_checkout_intents_email_unique` UNIQUE(`email`),
	CONSTRAINT `plus_checkout_transaction_idx` UNIQUE(`provider_transaction_id`)
);
--> statement-breakpoint
CREATE INDEX `plus_checkout_status_updated_idx` ON `plus_checkout_intents` (`status`,`updated_at`);