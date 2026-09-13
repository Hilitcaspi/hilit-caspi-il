ALTER TABLE `payment_leads` ADD `tracking_token` varchar(64);--> statement-breakpoint
ALTER TABLE `payment_leads` ADD `provider_process_token` varchar(255);--> statement-breakpoint
ALTER TABLE `payment_leads` ADD `purchase_event_id` varchar(120);--> statement-breakpoint
ALTER TABLE `payment_leads` ADD `fbp` varchar(255);--> statement-breakpoint
ALTER TABLE `payment_leads` ADD `fbc` varchar(255);--> statement-breakpoint
ALTER TABLE `payment_leads` ADD `client_ip` varchar(64);--> statement-breakpoint
ALTER TABLE `payment_leads` ADD `client_user_agent` varchar(500);--> statement-breakpoint
ALTER TABLE `payment_leads` ADD `attribution_expires_at` bigint;--> statement-breakpoint
ALTER TABLE `payment_leads` ADD `confirmed_transaction_id` varchar(200);--> statement-breakpoint
ALTER TABLE `payment_leads` ADD `confirmed_amount_agorot` int;--> statement-breakpoint
ALTER TABLE `payment_leads` ADD `confirmed_at` bigint;--> statement-breakpoint
ALTER TABLE `payment_leads` ADD `browser_tracked_at` bigint;--> statement-breakpoint
ALTER TABLE `payment_leads` ADD CONSTRAINT `payment_leads_tracking_token_idx` UNIQUE(`tracking_token`);--> statement-breakpoint
CREATE INDEX `payment_leads_process_token_idx` ON `payment_leads` (`provider_process_token`);