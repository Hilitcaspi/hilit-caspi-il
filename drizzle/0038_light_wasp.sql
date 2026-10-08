CREATE TABLE `matchmaking_service_consent_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`single_id` int NOT NULL,
	`consent_version` varchar(32) NOT NULL,
	`source` varchar(64) NOT NULL,
	`prior_matchmaking` boolean NOT NULL,
	`prior_data_sharing` boolean NOT NULL,
	`confirmed_at` bigint NOT NULL,
	CONSTRAINT `matchmaking_service_consent_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `matchmaking_service_consent_single_date_idx` ON `matchmaking_service_consent_events` (`single_id`,`confirmed_at`);