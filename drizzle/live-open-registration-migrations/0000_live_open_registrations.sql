CREATE TABLE `live_open_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_slug` varchar(64) NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(30) NOT NULL,
	`is_database_member` boolean NOT NULL,
	`marketing_consent` boolean NOT NULL,
	`consent_version` varchar(40) NOT NULL DEFAULT 'live-open-v1',
	`consented_at` bigint,
	`registered_at` bigint NOT NULL,
	`ticket_id` int,
	`utm_source` varchar(100),
	`utm_medium` varchar(100),
	`utm_campaign` varchar(200),
	`utm_content` varchar(200),
	CONSTRAINT `live_open_registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `live_open_registration_event_email_unique` UNIQUE(`event_slug`,`email`)
);
--> statement-breakpoint
CREATE INDEX `live_open_registration_ticket_idx` ON `live_open_registrations` (`ticket_id`);