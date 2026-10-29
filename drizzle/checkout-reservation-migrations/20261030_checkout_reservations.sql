CREATE TABLE `checkout_reservations` (
	`reservation_key` varchar(64) NOT NULL,
	`scope_kind` varchar(191) NOT NULL,
	`attempt_id` varchar(36) NOT NULL,
	`binding_hmac` varchar(64) NOT NULL,
	`owner_token` varchar(64) NOT NULL,
	`state` enum('creating','open','uncertain','completed','failed') NOT NULL,
	`result_json` mediumtext,
	`diagnostic_test` boolean NOT NULL DEFAULT false,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `checkout_reservations_reservation_key` PRIMARY KEY(`reservation_key`)
);
--> statement-breakpoint
CREATE INDEX `checkout_reservations_state_updated_idx` ON `checkout_reservations` (`state`,`updated_at`);
