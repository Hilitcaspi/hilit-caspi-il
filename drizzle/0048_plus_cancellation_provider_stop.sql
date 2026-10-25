ALTER TABLE `plus_cancellation_requests` ADD `provider_stopped_at` bigint;
--> statement-breakpoint
ALTER TABLE `plus_cancellation_requests` ADD `provider_stopped_by` varchar(191);
