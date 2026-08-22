CREATE TABLE `completed_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transaction_id` varchar(200) NOT NULL,
	`dedupe_key` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`product` varchar(50) NOT NULL,
	`amount_agorot` int NOT NULL,
	`amount_source` enum('grow','estimated') NOT NULL DEFAULT 'grow',
	`paid_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `completed_payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `completed_payment_transaction_idx` UNIQUE(`transaction_id`),
	CONSTRAINT `completed_payment_dedupe_idx` UNIQUE(`dedupe_key`)
);
