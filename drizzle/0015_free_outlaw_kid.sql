CREATE TABLE `match_boost_consent_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`single_id` int NOT NULL,
	`event_type` enum('invited','opted_in','paused','opted_out','removed','consent_updated') NOT NULL,
	`consent_version` varchar(100),
	`algorithmic_disclosure_accepted` boolean NOT NULL DEFAULT false,
	`anonymous_profile_accepted` boolean NOT NULL DEFAULT false,
	`terms_accepted` boolean NOT NULL DEFAULT false,
	`source` varchar(100) NOT NULL DEFAULT 'personal_area',
	`created_at` bigint NOT NULL,
	CONSTRAINT `match_boost_consent_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `boost_consent_single_created_idx` ON `match_boost_consent_events` (`single_id`,`created_at`);