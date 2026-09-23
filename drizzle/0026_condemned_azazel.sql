CREATE TABLE `content_studio_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('landing_page','story','ad_copy','email','course') NOT NULL,
	`title` varchar(220) NOT NULL,
	`slug` varchar(160),
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`template_key` varchar(80) NOT NULL DEFAULT 'signature_dark',
	`brief` text NOT NULL,
	`content_json` mediumtext NOT NULL,
	`model` varchar(80),
	`prompt_tokens` int,
	`completion_tokens` int,
	`created_by_hash` varchar(64),
	`published_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `content_studio_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `content_studio_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `content_studio_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` int NOT NULL,
	`version` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`template_key` varchar(80) NOT NULL,
	`content_json` mediumtext NOT NULL,
	`created_by_hash` varchar(64),
	`created_at` bigint NOT NULL,
	CONSTRAINT `content_studio_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `content_studio_document_version_idx` UNIQUE(`document_id`,`version`)
);
--> statement-breakpoint
CREATE TABLE `self_service_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_key` varchar(191) NOT NULL,
	`action_key` varchar(100) NOT NULL,
	`category` enum('database','dashboard','content','tracking') NOT NULL,
	`channel` enum('self_service','in_app_ai','manus','manual') NOT NULL,
	`outcome` enum('completed','previewed','drafted','published','failed') NOT NULL,
	`duration_ms` int,
	`model` varchar(80),
	`prompt_tokens` int,
	`completion_tokens` int,
	`metadata_json` text,
	`actor_hash` varchar(64),
	`occurred_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `self_service_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `self_service_event_key_idx` UNIQUE(`event_key`)
);
--> statement-breakpoint
CREATE INDEX `content_studio_status_kind_idx` ON `content_studio_documents` (`status`,`kind`);--> statement-breakpoint
CREATE INDEX `content_studio_updated_idx` ON `content_studio_documents` (`updated_at`);--> statement-breakpoint
CREATE INDEX `content_studio_version_document_idx` ON `content_studio_versions` (`document_id`);--> statement-breakpoint
CREATE INDEX `self_service_action_date_idx` ON `self_service_events` (`action_key`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `self_service_category_channel_idx` ON `self_service_events` (`category`,`channel`);