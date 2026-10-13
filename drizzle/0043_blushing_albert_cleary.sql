CREATE TABLE `grow_payment_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receipt_key` varchar(64) NOT NULL,
	`product` varchar(80) NOT NULL,
	`amount_agorot` int NOT NULL,
	`state` enum('notification_only','verified','review','duplicate_existing') NOT NULL,
	`category` varchar(80) NOT NULL,
	`references_encrypted` text NOT NULL,
	`paid_at` bigint NOT NULL,
	`received_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `grow_payment_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `grow_receipt_identity_idx` UNIQUE(`receipt_key`)
);
--> statement-breakpoint
CREATE INDEX `grow_receipt_date_state_idx` ON `grow_payment_receipts` (`received_at`,`state`);