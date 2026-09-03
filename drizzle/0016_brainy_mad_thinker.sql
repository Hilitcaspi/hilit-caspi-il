CREATE TABLE `match_boost_pilot_interests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(40),
	`first_name` varchar(100),
	`matched_single_id` int,
	`contact_consent` boolean NOT NULL DEFAULT false,
	`consent_version` varchar(100) NOT NULL,
	`source` varchar(100) NOT NULL DEFAULT 'match_boost_landing',
	`utm_source` varchar(200),
	`utm_medium` varchar(200),
	`utm_campaign` varchar(200),
	`utm_content` varchar(200),
	`status` enum('interested','invited','joined','not_eligible','declined') NOT NULL DEFAULT 'interested',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `match_boost_pilot_interests_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_boost_pilot_interests_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `boost_interest_status_created_idx` ON `match_boost_pilot_interests` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `boost_interest_single_idx` ON `match_boost_pilot_interests` (`matched_single_id`);