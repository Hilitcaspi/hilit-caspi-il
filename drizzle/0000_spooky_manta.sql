CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` enum('email_open','email_click','guide_view','guide_download','database_view','database_cta','course_view','course_cta','coaching_view','coaching_cta','dna_quiz_start','dna_quiz_complete','calendly_click','whatsapp_click','podcast_click','page_view') NOT NULL,
	`email` varchar(320),
	`leadId` int,
	`page` varchar(200),
	`emailJourney` varchar(100),
	`emailIndex` int,
	`utmSource` varchar(100),
	`utmMedium` varchar(100),
	`utmCampaign` varchar(100),
	`utmContent` varchar(200),
	`userAgent` varchar(500),
	`createdAt` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(300) NOT NULL,
	`slug` varchar(300) NOT NULL,
	`excerpt` text NOT NULL,
	`content` text NOT NULL,
	`coverImage` text,
	`metaDescription` varchar(160),
	`tags` varchar(500),
	`isPublished` boolean NOT NULL DEFAULT true,
	`publishedAt` bigint NOT NULL,
	`createdAt` bigint NOT NULL DEFAULT 0,
	`updatedAt` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `blog_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_posts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `course_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`product` enum('guide_149','course_249','guide_live_bonus') NOT NULL,
	`completedChapters` text NOT NULL,
	`exerciseAnswers` text NOT NULL,
	`lastChapterId` int NOT NULL DEFAULT 1,
	`userName` varchar(100),
	`userGender` enum('female','male','other'),
	`userBirthdate` varchar(10),
	`analysisResult` text,
	`analysisGeneratedAt` bigint,
	`createdAt` bigint NOT NULL DEFAULT 0,
	`updatedAt` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `course_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(20),
	`gender` enum('female','male'),
	`source` enum('dna_quiz','guide_form','direct','referral','instagram','podcast','meta_lead_guide','meta_lead_dna','meta_lead_call','press_article') DEFAULT 'dna_quiz',
	`dnaType` enum('leader','romantic','free_spirit','anchor'),
	`quizSessionId` varchar(64),
	`status` enum('new_lead','needs_followup','call_scheduled','call_done','client_database','client_guide','client_course','client_coaching','not_relevant') NOT NULL DEFAULT 'new_lead',
	`meetingAt` timestamp,
	`meetingReminder1Sent` boolean DEFAULT false,
	`meetingReminder2Sent` boolean DEFAULT false,
	`followupSentAt` timestamp,
	`followupFlaggedAt` timestamp,
	`notes` text,
	`singleId` int,
	`emailUnsubscribed` boolean DEFAULT false,
	`emailUnsubscribedAt` bigint,
	`paymentRef` varchar(100),
	`product` enum('database','guide','course','coaching','coaching_mas'),
	`utmSource` varchar(100),
	`utmMedium` varchar(100),
	`utmCampaign` varchar(200),
	`utmContent` varchar(200),
	`ga4ClientId` varchar(100),
	`ga4SessionId` varchar(50),
	`createdAt` bigint NOT NULL DEFAULT 0,
	`updatedAt` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `crm_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discount_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`discountPercent` int,
	`discountAmount` int,
	`fixedPrice` int,
	`product` varchar(50),
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`expiresAt` bigint,
	`note` varchar(200),
	`createdAt` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `discount_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `discount_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `dna_quiz_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`gender` enum('female','male'),
	`dnaType` enum('leader','romantic','free_spirit','anchor') NOT NULL,
	`scores` text NOT NULL,
	`answers` text,
	`convertedToRegistration` boolean DEFAULT false,
	`singleId` int,
	`utmSource` varchar(100),
	`utmMedium` varchar(100),
	`utmCampaign` varchar(200),
	`utmContent` varchar(200),
	`utmTerm` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dna_quiz_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientName` varchar(100),
	`journeyKey` varchar(50) NOT NULL,
	`emailIndex` int NOT NULL,
	`subject` varchar(500) NOT NULL,
	`htmlBody` text NOT NULL,
	`textBody` text,
	`scheduledAt` bigint NOT NULL,
	`sentAt` bigint,
	`status` enum('pending','processing','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`openedAt` bigint,
	`openCount` int NOT NULL DEFAULT 0,
	`clickedAt` bigint,
	`clickCount` int NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `email_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `free_access_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`email` varchar(320) NOT NULL,
	`source` varchar(50) DEFAULT 'guide_149',
	`usedAt` bigint,
	`usedByEmail` varchar(320),
	`expiresAt` bigint NOT NULL,
	`createdAt` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `free_access_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `free_access_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `invite_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`boundEmail` varchar(320),
	`note` varchar(200),
	`usedAt` bigint,
	`usedByEmail` varchar(320),
	`usedBySingleId` int,
	`expiresAt` bigint NOT NULL,
	`createdAt` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `invite_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `invite_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(20),
	`source` varchar(50) DEFAULT 'guide',
	`utmSource` varchar(100),
	`utmMedium` varchar(100),
	`utmCampaign` varchar(200),
	`utmContent` varchar(200),
	`utmTerm` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `live_event_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventSlug` varchar(100) NOT NULL DEFAULT 'live-qa-june-2026',
	`name` varchar(200) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(30),
	`guideSent` boolean DEFAULT false,
	`confirmationSent` boolean DEFAULT false,
	`createdAt` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `live_event_registrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`singleId` int NOT NULL DEFAULT 0,
	`matchedSingleId` int NOT NULL DEFAULT 0,
	`singleAId` int NOT NULL DEFAULT 0,
	`singleBId` int NOT NULL DEFAULT 0,
	`score` float,
	`proposedAt` bigint,
	`emailAOpenedAt` bigint,
	`emailBOpenedAt` bigint,
	`singleAConsent` boolean NOT NULL DEFAULT false,
	`singleBConsent` boolean NOT NULL DEFAULT false,
	`singleAConsentAt` bigint,
	`singleBConsentAt` bigint,
	`singleAToken` varchar(64),
	`singleBToken` varchar(64),
	`approvalTokenA` varchar(64),
	`tokenAUsedAt` bigint,
	`approvalTokenB` varchar(64),
	`tokenBUsedAt` bigint,
	`approvalExpiresAt` bigint,
	`approvedByA` boolean NOT NULL DEFAULT false,
	`approvedByB` boolean NOT NULL DEFAULT false,
	`status` enum('pending','proposed','matched','rejected','expired') NOT NULL DEFAULT 'pending',
	`matchedAt` bigint,
	`contactRevealedAt` bigint,
	`ownerApprovalToken` varchar(64),
	`ownerApprovedAt` bigint,
	`scoreBreakdown` text,
	`autoExplanation` text,
	`notes` text,
	`followUpSentAt` bigint,
	`emailRetriedAt` bigint,
	`waSentAt` bigint,
	`matchWeekFollowupSentAt` bigint,
	`matchMonthFollowupSentAt` bigint,
	`returnedToPoolAt` bigint,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` bigint DEFAULT 0,
	CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matchmaking_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`singleId` int NOT NULL,
	`answersJson` text NOT NULL,
	`compatibilityCache` text,
	`completedAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `matchmaking_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`email` varchar(200) NOT NULL,
	`phone` varchar(30) NOT NULL,
	`product` varchar(50) NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `payment_leads_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_product_idx` UNIQUE(`email`,`product`)
);
--> statement-breakpoint
CREATE TABLE `product_access_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(100),
	`product` enum('guide_149','course_249','guide_live_bonus') NOT NULL,
	`paymentRef` varchar(100),
	`expiresAt` bigint NOT NULL,
	`lastAccessAt` bigint,
	`accessCount` int NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL DEFAULT 0,
	`deviceFingerprint` varchar(255),
	CONSTRAINT `product_access_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_access_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `profile_update_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`singleId` int NOT NULL,
	`changesJson` text NOT NULL,
	`pendingPhotoUrl` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`adminNote` varchar(500),
	`createdAt` bigint NOT NULL DEFAULT 0,
	`reviewedAt` bigint,
	CONSTRAINT `profile_update_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `singles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100),
	`gender` enum('female','male') NOT NULL,
	`age` int NOT NULL,
	`birthDate` varchar(10),
	`city` varchar(100) NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`height` int,
	`education` enum('high_school','vocational','technician','student','bachelor','master','phd','other'),
	`religiosity` enum('secular','traditional','religious','orthodox'),
	`religiosityOrigin` enum('cultural','halachic'),
	`occupation` varchar(150),
	`about` text,
	`interests` text,
	`maritalStatus` enum('single','divorced','widowed'),
	`hasKids` boolean DEFAULT false,
	`numKids` int DEFAULT 0,
	`wantsKids` enum('yes','no','open'),
	`dnaType` enum('leader','romantic','free_spirit','anchor'),
	`dnaScores` text,
	`seekingGender` enum('female','male','any'),
	`stepParentOpenness` enum('yes','open','no'),
	`openToPartnerWithKids` enum('yes','no','depends_on_age'),
	`kidsInvolvement` enum('full_time','weekends','rarely','grown'),
	`relationshipPace` enum('slow','medium','fast'),
	`hasPets` boolean DEFAULT false,
	`petType` varchar(100),
	`acceptsPets` boolean,
	`minAgePreference` int,
	`maxAgePreference` int,
	`minHeightPreference` int,
	`maxHeightPreference` int,
	`religiosityPreference` varchar(100),
	`acceptsKids` boolean,
	`locationPreference` enum('close','anywhere'),
	`smokingStatus` enum('no','occasionally','yes'),
	`smokingPreference` enum('no_smokers','occasionally_ok','doesnt_matter'),
	`partnerDescription` text,
	`photoUrl` text,
	`questionnaireToken` varchar(64),
	`questionnaireCompletedAt` bigint,
	`registrationSource` varchar(50),
	`utmSource` varchar(100),
	`utmMedium` varchar(100),
	`utmCampaign` varchar(200),
	`utmContent` varchar(200),
	`isActive` boolean NOT NULL DEFAULT true,
	`isSeed` boolean NOT NULL DEFAULT false,
	`isPaid` boolean NOT NULL DEFAULT false,
	`paymentRef` varchar(100),
	`subscriptionStatus` enum('active','cancelled','expired') DEFAULT 'active',
	`subscriptionStartedAt` bigint,
	`subscriptionRenewsAt` bigint,
	`subscriptionCancelledAt` bigint,
	`market` enum('il','us') DEFAULT 'il',
	`country` varchar(10) DEFAULT 'IL',
	`usState` varchar(100),
	`zoomOk` boolean DEFAULT false,
	`consentMatchmaking` boolean NOT NULL DEFAULT false,
	`consentDataSharing` boolean NOT NULL DEFAULT false,
	`consentEmailMarketing` boolean NOT NULL DEFAULT false,
	`createdAt` bigint NOT NULL DEFAULT 0,
	`updatedAt` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `singles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `wa_clicks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` varchar(50) NOT NULL,
	`ip` varchar(45),
	`userAgent` varchar(500),
	`createdAt` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `wa_clicks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_idempotency` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transaction_id` varchar(200) NOT NULL,
	`product` varchar(50),
	`email` varchar(320),
	`created_at` bigint NOT NULL,
	CONSTRAINT `webhook_idempotency_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhook_idempotency_transaction_id_unique` UNIQUE(`transaction_id`)
);
