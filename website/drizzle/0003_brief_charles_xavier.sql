CREATE INDEX `idx_guide_applications_phone_created` ON `guide_applications` (`phone`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_guide_applications_status` ON `guide_applications` (`status`);--> statement-breakpoint
CREATE INDEX `idx_guide_grants_email_template` ON `guide_grants` (`email`,`template_id`);