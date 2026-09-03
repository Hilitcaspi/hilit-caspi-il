CREATE TABLE `match_boost_memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`single_id` int NOT NULL,
	`status` enum('invited','active','paused','opted_out','removed') NOT NULL DEFAULT 'invited',
	`consent_version` varchar(100),
	`algorithmic_disclosure_accepted` boolean NOT NULL DEFAULT false,
	`anonymous_profile_accepted` boolean NOT NULL DEFAULT false,
	`terms_accepted` boolean NOT NULL DEFAULT false,
	`consented_at` bigint,
	`opted_out_at` bigint,
	`invited_at` bigint,
	`source` varchar(100) NOT NULL DEFAULT 'personal_area',
	`pilot_cohort` varchar(100),
	`eligible_at` bigint,
	`eligibility_snapshot` text,
	`last_active_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `match_boost_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_boost_memberships_single_id_unique` UNIQUE(`single_id`)
);
--> statement-breakpoint
CREATE INDEX `boost_membership_status_idx` ON `match_boost_memberships` (`status`,`consented_at`);--> statement-breakpoint
CREATE INDEX `boost_membership_cohort_idx` ON `match_boost_memberships` (`pilot_cohort`,`status`);
