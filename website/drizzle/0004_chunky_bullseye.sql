CREATE TABLE `storefronts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`region` text NOT NULL,
	`description` text NOT NULL,
	`cover_url` text NOT NULL,
	`interior_urls` text NOT NULL,
	`projects` text NOT NULL,
	`featured_rank` integer DEFAULT 0 NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_storefronts_published_rank` ON `storefronts` (`published`,`featured_rank`);