CREATE TABLE `crm_team_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`single_id` int,
	`match_id` int,
	`crm_lead_id` int,
	`assigned_team_member_id` int,
	`task_type` enum('match_review','followup','call','feedback','profile','plus','partner','event','other') NOT NULL DEFAULT 'other',
	`title` varchar(255) NOT NULL,
	`description` text,
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`status` enum('todo','in_progress','done','cancelled') NOT NULL DEFAULT 'todo',
	`due_at` bigint,
	`completed_at` bigint,
	`created_by` varchar(200) NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `crm_team_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`type` enum('partner','event','organization','referrer') NOT NULL,
	`code` varchar(100) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`contact_name` varchar(150),
	`contact_email` varchar(320),
	`contact_phone` varchar(30),
	`commission_type` enum('none','fixed','percentage') NOT NULL DEFAULT 'none',
	`commission_value` int NOT NULL DEFAULT 0,
	`event_date` bigint,
	`notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `partner_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `partner_sources_code_unique` UNIQUE(`code`)
);
