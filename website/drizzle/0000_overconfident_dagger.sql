CREATE TABLE `cooperation_leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`province_code` text NOT NULL,
	`province` text NOT NULL,
	`city_code` text NOT NULL,
	`city` text NOT NULL,
	`county_code` text NOT NULL,
	`county` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`contacted_at` text
);
