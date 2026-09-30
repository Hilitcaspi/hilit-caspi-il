CREATE TABLE `lifecycle_marketing_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL DEFAULT 'israel-site-lifecycle',
	`is_enabled` boolean NOT NULL DEFAULT false,
	`lifecycle_cron_task_uid` varchar(65),
	`boost_cron_task_uid` varchar(65),
	`launched_at` bigint,
	`min_marketing_gap_hours` int NOT NULL DEFAULT 20,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `lifecycle_marketing_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `lifecycle_marketing_settings_name_idx` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE INDEX `lifecycle_marketing_lifecycle_uid_idx` ON `lifecycle_marketing_settings` (`lifecycle_cron_task_uid`);--> statement-breakpoint
CREATE INDEX `lifecycle_marketing_boost_uid_idx` ON `lifecycle_marketing_settings` (`boost_cron_task_uid`);--> statement-breakpoint
CREATE INDEX `lifecycle_marketing_enabled_idx` ON `lifecycle_marketing_settings` (`is_enabled`);
--> statement-breakpoint
INSERT INTO `lifecycle_marketing_settings`
  (`name`, `is_enabled`, `launched_at`, `min_marketing_gap_hours`, `created_at`, `updated_at`)
VALUES
  ('israel-site-lifecycle', false, 1790765100000, 20, 1790765100000, 1790765100000)
ON DUPLICATE KEY UPDATE
  `min_marketing_gap_hours` = VALUES(`min_marketing_gap_hours`),
  `updated_at` = VALUES(`updated_at`);
--> statement-breakpoint
INSERT INTO `discount_codes`
  (`code`, `discountPercent`, `discountAmount`, `fixedPrice`, `product`, `maxUses`, `usedCount`, `isActive`, `expiresAt`, `note`, `createdAt`)
VALUES
  ('BACK10', 10, NULL, NULL, NULL, NULL, 0, true, NULL, 'Lifecycle payment recovery only', 1790765100000)
ON DUPLICATE KEY UPDATE
  `discountPercent` = 10,
  `discountAmount` = NULL,
  `fixedPrice` = NULL,
  `product` = NULL,
  `isActive` = true,
  `expiresAt` = NULL,
  `note` = 'Lifecycle payment recovery only';
