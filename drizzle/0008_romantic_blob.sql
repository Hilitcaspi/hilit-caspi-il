CREATE TABLE `plus_pilot_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`single_id` int NOT NULL,
	`status` enum('waitlist','eligible','invited','active','declined','churned') NOT NULL DEFAULT 'waitlist',
	`eligibility_score` int,
	`eligibility_reasons` text,
	`source` varchar(100) NOT NULL DEFAULT 'personal_area',
	`pilot_cohort` varchar(100),
	`pilot_price_agorot` int,
	`waitlisted_at` bigint NOT NULL,
	`invited_at` bigint,
	`activated_at` bigint,
	`ended_at` bigint,
	`last_engaged_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `plus_pilot_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `plus_pilot_members_single_id_unique` UNIQUE(`single_id`)
);
