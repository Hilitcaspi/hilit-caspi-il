CREATE TABLE `acquisition_first_touches` (
	`actor_key` varchar(64) NOT NULL,
	`utm_source` varchar(200),
	`utm_medium` varchar(200),
	`utm_campaign` varchar(200),
	`utm_content` varchar(200),
	`utm_term` varchar(200),
	`meta_campaign_id` varchar(100),
	`meta_adset_id` varchar(100),
	`meta_ad_id` varchar(100),
	`captured_at` bigint NOT NULL,
	`recorded_at` bigint NOT NULL,
	CONSTRAINT `acquisition_first_touches_actor_key` PRIMARY KEY(`actor_key`)
);
