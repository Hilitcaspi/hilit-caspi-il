CREATE TABLE `live_october_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_id` int NOT NULL,
	`body` text NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `live_october_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `live_october_tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_slug` varchar(64) NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(200) NOT NULL,
	`single_id` int,
	`source` enum('database_live','plus','friends','standalone') NOT NULL,
	`voucher_code` varchar(30) NOT NULL,
	`amount_agorot` int NOT NULL DEFAULT 0,
	`provider_transaction_id` varchar(200),
	`issued_at` bigint NOT NULL,
	`revoked_at` bigint,
	CONSTRAINT `live_october_tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `live_october_event_email_unique` UNIQUE(`event_slug`,`email`),
	CONSTRAINT `live_october_voucher_unique` UNIQUE(`voucher_code`)
);
--> statement-breakpoint
CREATE INDEX `live_october_question_ticket_idx` ON `live_october_questions` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `live_october_source_idx` ON `live_october_tickets` (`source`);