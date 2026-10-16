CREATE TABLE `showcase_content` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`description` text NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`link` text DEFAULT '' NOT NULL,
	`qr` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '' NOT NULL,
	`sop` text DEFAULT '' NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_showcase_published_kind_city` ON `showcase_content` (`published`,`kind`,`city`);