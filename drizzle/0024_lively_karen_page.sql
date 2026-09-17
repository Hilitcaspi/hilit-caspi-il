CREATE TABLE `feedback_followups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testimonialRecordId` int NOT NULL,
	`singleId` int,
	`matchId` int,
	`isPositive` boolean NOT NULL DEFAULT false,
	`needsServiceRecovery` boolean NOT NULL DEFAULT false,
	`needsMatchmakingAttention` boolean NOT NULL DEFAULT false,
	`needsPersonalAttention` boolean NOT NULL DEFAULT false,
	`needsPublishingReview` boolean NOT NULL DEFAULT false,
	`priority` enum('normal','high','urgent') NOT NULL DEFAULT 'normal',
	`status` enum('open','in_progress','waiting_customer','resolved','dismissed') NOT NULL DEFAULT 'open',
	`recommendedAction` text,
	`ownerNotes` text,
	`assignedTeamMemberId` int,
	`nextActionAt` bigint,
	`contactedAt` bigint,
	`contactChannel` enum('email','sms','phone','whatsapp','other'),
	`contactNote` text,
	`outcome` text,
	`resolvedAt` bigint,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `feedback_followups_id` PRIMARY KEY(`id`),
	CONSTRAINT `feedback_followup_record_unique` UNIQUE(`testimonialRecordId`)
);
--> statement-breakpoint
CREATE TABLE `match_delivery_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventKey` varchar(191) NOT NULL,
	`matchId` int NOT NULL,
	`singleId` int NOT NULL,
	`side` enum('A','B') NOT NULL,
	`channel` enum('email','sms') NOT NULL,
	`attemptType` enum('initial','manual_resend','followup') NOT NULL DEFAULT 'initial',
	`status` enum('accepted','failed','skipped') NOT NULL,
	`providerMessageId` varchar(255),
	`failureReason` text,
	`attemptedAt` bigint NOT NULL,
	`acceptedAt` bigint,
	CONSTRAINT `match_delivery_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_delivery_event_key_unique` UNIQUE(`eventKey`)
);
--> statement-breakpoint
CREATE INDEX `feedback_followup_status_priority_idx` ON `feedback_followups` (`status`,`priority`);--> statement-breakpoint
CREATE INDEX `feedback_followup_single_idx` ON `feedback_followups` (`singleId`);--> statement-breakpoint
CREATE INDEX `match_delivery_match_single_idx` ON `match_delivery_events` (`matchId`,`singleId`);--> statement-breakpoint
CREATE INDEX `match_delivery_single_status_idx` ON `match_delivery_events` (`singleId`,`status`);