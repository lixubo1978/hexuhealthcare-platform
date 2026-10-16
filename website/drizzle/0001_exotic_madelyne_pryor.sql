CREATE TABLE `service_disputes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_ref` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`role` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`contacted_at` text
);
