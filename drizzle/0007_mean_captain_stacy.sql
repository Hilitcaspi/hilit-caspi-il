CREATE TABLE `business_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expense_date` bigint NOT NULL,
	`category` enum('processing','refund','payroll','contractor','software','office','content','event','tax','other') NOT NULL,
	`description` varchar(255) NOT NULL,
	`vendor` varchar(150),
	`amount_agorot` int NOT NULL,
	`notes` text,
	`created_by` varchar(200),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `business_expenses_id` PRIMARY KEY(`id`)
);
