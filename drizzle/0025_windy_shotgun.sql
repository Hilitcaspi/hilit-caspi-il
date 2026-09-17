CREATE TABLE `feedback_followup_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followupId` int NOT NULL,
	`channel` enum('email','sms','phone','whatsapp','other') NOT NULL,
	`note` text,
	`contactedAt` bigint NOT NULL,
	`actorRef` varchar(191),
	CONSTRAINT `feedback_followup_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `feedback_followup_contact_idx` ON `feedback_followup_contacts` (`followupId`,`contactedAt`);