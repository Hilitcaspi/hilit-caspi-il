CREATE TABLE `course_compass_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(20),
	`result_key` enum('information','consistency','pace','boundary','self_choice','safety') NOT NULL,
	`secondary_result_key` enum('information','consistency','pace','boundary','self_choice'),
	`selected_action` varchar(100),
	`waitlist_consent` boolean NOT NULL DEFAULT false,
	`marketing_consent` boolean NOT NULL DEFAULT false,
	`consent_version` varchar(50) NOT NULL,
	`benefit_version` varchar(50) NOT NULL,
	`status` enum('waitlist','invited','enrolled','declined') NOT NULL DEFAULT 'waitlist',
	`utm_source` varchar(100),
	`utm_medium` varchar(100),
	`utm_campaign` varchar(200),
	`utm_content` varchar(200),
	`utm_term` varchar(200),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `course_compass_leads_id` PRIMARY KEY(`id`),
	CONSTRAINT `course_compass_leads_email_uq` UNIQUE(`email`),
	CONSTRAINT `course_compass_leads_session_uq` UNIQUE(`session_id`)
);
--> statement-breakpoint
CREATE INDEX `course_compass_leads_status_created_idx` ON `course_compass_leads` (`status`,`created_at`);