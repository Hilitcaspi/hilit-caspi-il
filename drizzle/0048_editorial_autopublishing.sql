-- Scoped migration: unrelated historical schema drift is intentionally excluded.
CREATE TABLE `editorial_automation_runs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `slot_key` varchar(32) NOT NULL,
  `topic_key` varchar(100) NOT NULL,
  `status` enum('working','draft','published','failed') NOT NULL DEFAULT 'working',
  `article_id` int,
  `quality_notes` varchar(500),
  `created_at` bigint NOT NULL DEFAULT 0,
  `updated_at` bigint NOT NULL DEFAULT 0,
  CONSTRAINT `editorial_automation_runs_id` PRIMARY KEY(`id`),
  CONSTRAINT `editorial_runs_slot_idx` UNIQUE(`slot_key`)
);
--> statement-breakpoint
CREATE TABLE `editorial_automation_settings` (
  `id` int NOT NULL,
  `schedule_cron_task_uid` varchar(65),
  `enabled` boolean NOT NULL DEFAULT false,
  `timezone` varchar(64) NOT NULL DEFAULT 'Asia/Jerusalem',
  `model` varchar(100) NOT NULL DEFAULT 'gpt-6.1-sol',
  `updated_at` bigint NOT NULL DEFAULT 0,
  CONSTRAINT `editorial_automation_settings_id` PRIMARY KEY(`id`),
  CONSTRAINT `editorial_settings_task_uid_idx` UNIQUE(`schedule_cron_task_uid`)
);
