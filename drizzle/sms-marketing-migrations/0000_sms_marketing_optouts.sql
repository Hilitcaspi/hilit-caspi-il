CREATE TABLE `sms_optouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`source` varchar(60) NOT NULL DEFAULT 'signed_sms_token',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `sms_optouts_id` PRIMARY KEY(`id`),
	CONSTRAINT `sms_optouts_phone_unique` UNIQUE(`phone`)
);
