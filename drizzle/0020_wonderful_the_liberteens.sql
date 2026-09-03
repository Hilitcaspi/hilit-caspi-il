CREATE TABLE `feedback_automation_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`setting_name` varchar(80) NOT NULL DEFAULT 'default',
	`enabled` boolean NOT NULL DEFAULT false,
	`schedule_cron_task_uid` varchar(65),
	`match_immediate_enabled` boolean NOT NULL DEFAULT false,
	`match_week_reminder_enabled` boolean NOT NULL DEFAULT false,
	`dna_result_enabled` boolean NOT NULL DEFAULT false,
	`database_complete_enabled` boolean NOT NULL DEFAULT false,
	`guide_complete_enabled` boolean NOT NULL DEFAULT false,
	`course_complete_enabled` boolean NOT NULL DEFAULT false,
	`satisfaction_survey_enabled` boolean NOT NULL DEFAULT false,
	`historical_batch_enabled` boolean NOT NULL DEFAULT false,
	`cooldown_days` int NOT NULL DEFAULT 45,
	`max_emails_per_run` int NOT NULL DEFAULT 50,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `feedback_automation_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `feedback_automation_setting_name_idx` UNIQUE(`setting_name`)
);
--> statement-breakpoint
ALTER TABLE `testimonial_records` ADD `request_key` varchar(191);--> statement-breakpoint
ALTER TABLE `testimonial_records` ADD `survey_kind` enum('positive_experience','satisfaction_survey') DEFAULT 'positive_experience' NOT NULL;--> statement-breakpoint
ALTER TABLE `testimonial_records` ADD `touchpoint` enum('match_mutual','match_week','dna_result','database_complete','guide_complete','course_complete','personal_session','historical_match','representative_sample','manual') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `testimonial_records` ADD `delivery_channel` enum('email','onsite','manual') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `testimonial_records` ADD `structured_answers` text;--> statement-breakpoint
ALTER TABLE `testimonial_records` ADD `scheduled_at` bigint;--> statement-breakpoint
ALTER TABLE `testimonial_records` ADD `reminder_due_at` bigint;--> statement-breakpoint
ALTER TABLE `testimonial_records` ADD `reminder_sent_at` bigint;--> statement-breakpoint
ALTER TABLE `testimonial_records` ADD `reward_type` enum('none','date_map','boost_free','boost_one_shekel') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `testimonial_records` ADD `reward_granted_at` bigint;--> statement-breakpoint
ALTER TABLE `testimonial_records` ADD `reward_viewed_at` bigint;--> statement-breakpoint
ALTER TABLE `testimonial_records` ADD `incentive_disclosure_required` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `testimonial_records` ADD CONSTRAINT `testimonial_record_request_key_idx` UNIQUE(`request_key`);--> statement-breakpoint
CREATE INDEX `feedback_automation_task_uid_idx` ON `feedback_automation_settings` (`schedule_cron_task_uid`);--> statement-breakpoint
CREATE INDEX `testimonial_record_survey_kind_idx` ON `testimonial_records` (`survey_kind`);--> statement-breakpoint
CREATE INDEX `testimonial_record_touchpoint_idx` ON `testimonial_records` (`touchpoint`);--> statement-breakpoint
CREATE INDEX `testimonial_record_scheduled_idx` ON `testimonial_records` (`scheduled_at`);