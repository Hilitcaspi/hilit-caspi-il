CREATE TABLE `testimonial_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`record_id` int NOT NULL,
	`event_type` enum('created','candidate_generated','contact_approved','request_marked_sent','form_opened','feedback_submitted','consent_granted','consent_updated','media_uploaded','team_verified','approved','published','usage_removed','consent_revoked','archived') NOT NULL,
	`actor_type` enum('customer','team','system') NOT NULL,
	`actor_ref` varchar(200),
	`metadata` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `testimonial_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testimonial_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`record_id` int NOT NULL,
	`media_type` enum('image','video') NOT NULL,
	`storage_key` varchar(500) NOT NULL,
	`storage_url` text NOT NULL,
	`original_file_name` varchar(255) NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`byte_size` bigint NOT NULL,
	`status` enum('uploaded','approved','rejected','revoked') NOT NULL DEFAULT 'uploaded',
	`uploaded_at` bigint NOT NULL,
	`approved_at` bigint,
	`approved_by` varchar(200),
	`rejected_at` bigint,
	`rejected_by` varchar(200),
	`rejection_reason` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `testimonial_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testimonial_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`public_token` varchar(64) NOT NULL,
	`status` enum('draft','candidate','approved_to_contact','sent','submitted','awaiting_consent','awaiting_verification','approved','published','revoked','archived') NOT NULL DEFAULT 'draft',
	`proof_type` enum('success','progress','product','database','service','internal') NOT NULL,
	`source_type` enum('match','database','dna','guide','course','boost','service','manual') NOT NULL,
	`single_id` int,
	`crm_lead_id` int,
	`match_id` int,
	`contact_name` varchar(150) NOT NULL,
	`contact_email` varchar(320) NOT NULL,
	`contact_phone` varchar(30),
	`source_snapshot` text,
	`rating` int,
	`nps_score` int,
	`feedback_text` text,
	`improvement_text` text,
	`testimonial_text_original` text,
	`testimonial_text_approved` text,
	`identity_scope` enum('anonymous','first_name','full_name','full_name_photo') NOT NULL DEFAULT 'anonymous',
	`consent_text` boolean NOT NULL DEFAULT false,
	`consent_photo` boolean NOT NULL DEFAULT false,
	`consent_video` boolean NOT NULL DEFAULT false,
	`allow_website` boolean NOT NULL DEFAULT false,
	`allow_organic_social` boolean NOT NULL DEFAULT false,
	`allow_email` boolean NOT NULL DEFAULT false,
	`allow_paid_ads` boolean NOT NULL DEFAULT false,
	`allow_pr` boolean NOT NULL DEFAULT false,
	`allow_spelling_edits` boolean NOT NULL DEFAULT false,
	`allow_material_edits` boolean NOT NULL DEFAULT false,
	`consent_version` varchar(50),
	`consent_confirmed_at` bigint,
	`consent_revoked_at` bigint,
	`team_verified_at` bigint,
	`team_verified_by` varchar(200),
	`team_approved_at` bigint,
	`team_approved_by` varchar(200),
	`published_at` bigint,
	`archived_at` bigint,
	`draft_subject` varchar(500),
	`draft_body` text,
	`request_approved_at` bigint,
	`request_approved_by` varchar(200),
	`request_sent_at` bigint,
	`last_response_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `testimonial_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `testimonial_records_public_token_unique` UNIQUE(`public_token`)
);
--> statement-breakpoint
CREATE TABLE `testimonial_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`record_id` int NOT NULL,
	`media_id` int,
	`channel` enum('website','organic_social','email','paid_ads','pr') NOT NULL,
	`format` varchar(100),
	`placement` varchar(255),
	`campaign_name` varchar(255),
	`public_url` text,
	`approved_copy_snapshot` text,
	`published_at` bigint NOT NULL,
	`removed_at` bigint,
	`created_by` varchar(200) NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `testimonial_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `testimonial_event_record_idx` ON `testimonial_events` (`record_id`);--> statement-breakpoint
CREATE INDEX `testimonial_event_type_idx` ON `testimonial_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `testimonial_event_created_idx` ON `testimonial_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `testimonial_media_record_idx` ON `testimonial_media` (`record_id`);--> statement-breakpoint
CREATE INDEX `testimonial_media_status_idx` ON `testimonial_media` (`status`);--> statement-breakpoint
CREATE INDEX `testimonial_record_status_idx` ON `testimonial_records` (`status`);--> statement-breakpoint
CREATE INDEX `testimonial_record_source_idx` ON `testimonial_records` (`source_type`);--> statement-breakpoint
CREATE INDEX `testimonial_record_single_idx` ON `testimonial_records` (`single_id`);--> statement-breakpoint
CREATE INDEX `testimonial_record_match_idx` ON `testimonial_records` (`match_id`);--> statement-breakpoint
CREATE INDEX `testimonial_record_email_idx` ON `testimonial_records` (`contact_email`);--> statement-breakpoint
CREATE INDEX `testimonial_record_created_idx` ON `testimonial_records` (`created_at`);--> statement-breakpoint
CREATE INDEX `testimonial_usage_record_idx` ON `testimonial_usage` (`record_id`);--> statement-breakpoint
CREATE INDEX `testimonial_usage_channel_idx` ON `testimonial_usage` (`channel`);