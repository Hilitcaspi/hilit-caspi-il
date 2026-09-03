CREATE TABLE `match_boost_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`single_id` int NOT NULL,
	`match_id` int NOT NULL,
	`source` enum('paid','plus_included','admin') NOT NULL,
	`status` enum('awaiting_payment','paid','queued','reviewing','approved','rejected','refunded','cancelled') NOT NULL DEFAULT 'awaiting_payment',
	`amount_agorot` int NOT NULL DEFAULT 1999,
	`idempotency_key` varchar(200) NOT NULL,
	`provider_transaction_id` varchar(200),
	`plus_billing_cycle_started_at` bigint,
	`requested_at` bigint NOT NULL,
	`paid_at` bigint,
	`review_started_at` bigint,
	`decided_at` bigint,
	`fulfilled_at` bigint,
	`expires_at` bigint,
	`decision_reason` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `match_boost_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_boost_requests_idempotency_key_unique` UNIQUE(`idempotency_key`),
	CONSTRAINT `match_boost_requests_provider_transaction_id_unique` UNIQUE(`provider_transaction_id`)
);
--> statement-breakpoint
CREATE INDEX `boost_single_status_idx` ON `match_boost_requests` (`single_id`,`status`);--> statement-breakpoint
CREATE INDEX `boost_match_status_idx` ON `match_boost_requests` (`match_id`,`status`);--> statement-breakpoint
CREATE INDEX `boost_requested_idx` ON `match_boost_requests` (`requested_at`);