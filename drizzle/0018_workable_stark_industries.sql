CREATE TABLE `daily_report_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settings_id` int NOT NULL,
	`run_key` varchar(160) NOT NULL,
	`report_date` varchar(10) NOT NULL,
	`trigger` enum('preview','manual','scheduled') NOT NULL,
	`status` enum('dry_run','sent','skipped','failed') NOT NULL,
	`message` text NOT NULL,
	`metrics_json` text NOT NULL,
	`source_status_json` text NOT NULL,
	`provider_message_id` varchar(200),
	`error` text,
	`started_at` bigint NOT NULL,
	`completed_at` bigint,
	`created_at` bigint NOT NULL,
	CONSTRAINT `daily_report_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_report_run_key_idx` UNIQUE(`run_key`)
);
--> statement-breakpoint
CREATE TABLE `daily_report_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL DEFAULT 'israel-site-daily',
	`is_enabled` boolean NOT NULL DEFAULT false,
	`dry_run` boolean NOT NULL DEFAULT true,
	`timezone` varchar(50) NOT NULL DEFAULT 'Asia/Jerusalem',
	`delivery_hour` int NOT NULL DEFAULT 0,
	`delivery_minute` int NOT NULL DEFAULT 0,
	`recipient_phone` varchar(30),
	`schedule_cron_task_uid` varchar(65),
	`database_monthly_min_target` int NOT NULL DEFAULT 350,
	`database_monthly_stretch_target` int NOT NULL DEFAULT 400,
	`database_monthly_budget_agorot` int NOT NULL DEFAULT 1000000,
	`boost_monthly_target` int,
	`bundle_monthly_target` int,
	`lead_monthly_target` int,
	`revenue_monthly_target_agorot` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `daily_report_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `daily_report_run_settings_idx` ON `daily_report_runs` (`settings_id`);--> statement-breakpoint
CREATE INDEX `daily_report_run_date_idx` ON `daily_report_runs` (`report_date`);--> statement-breakpoint
CREATE INDEX `daily_report_run_status_idx` ON `daily_report_runs` (`status`);--> statement-breakpoint
CREATE INDEX `daily_report_settings_task_uid_idx` ON `daily_report_settings` (`schedule_cron_task_uid`);--> statement-breakpoint
CREATE INDEX `daily_report_settings_enabled_idx` ON `daily_report_settings` (`is_enabled`);