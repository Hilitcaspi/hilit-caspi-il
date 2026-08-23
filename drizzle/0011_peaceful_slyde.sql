CREATE TABLE `business_recurring_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_type` enum('income','expense') NOT NULL,
	`category` varchar(50) NOT NULL,
	`description` varchar(255) NOT NULL,
	`vendor` varchar(150),
	`amount_agorot` int NOT NULL,
	`valid_from` bigint NOT NULL,
	`valid_to` bigint,
	`is_active` boolean NOT NULL DEFAULT true,
	`includes_vat` boolean NOT NULL DEFAULT true,
	`notes` text,
	`created_by` varchar(200),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `business_recurring_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `business_recurring_active_idx` ON `business_recurring_items` (`is_active`,`item_type`);