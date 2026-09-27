ALTER TABLE `completed_payments` ADD `coupon_code` varchar(100);--> statement-breakpoint
ALTER TABLE `completed_payments` ADD `utm_source` varchar(100);--> statement-breakpoint
ALTER TABLE `completed_payments` ADD `utm_medium` varchar(100);--> statement-breakpoint
ALTER TABLE `completed_payments` ADD `utm_campaign` varchar(200);--> statement-breakpoint
ALTER TABLE `completed_payments` ADD `utm_content` varchar(200);--> statement-breakpoint
ALTER TABLE `payment_leads` ADD `coupon_code` varchar(100);--> statement-breakpoint
ALTER TABLE `payment_leads` ADD `utm_source` varchar(100);--> statement-breakpoint
ALTER TABLE `payment_leads` ADD `utm_medium` varchar(100);--> statement-breakpoint
ALTER TABLE `payment_leads` ADD `utm_campaign` varchar(200);--> statement-breakpoint
ALTER TABLE `payment_leads` ADD `utm_content` varchar(200);