CREATE TABLE `creator_account` (
	`user_id` text PRIMARY KEY NOT NULL,
	`manager_name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`issued_by_admin_user_id` text,
	`issued_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`issued_by_admin_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "creator_account_manager_name_length_check" CHECK(length("creator_account"."manager_name") between 1 and 30),
	CONSTRAINT "creator_account_status_check" CHECK("creator_account"."status" in ('active', 'suspended'))
);
--> statement-breakpoint
CREATE INDEX `creator_account_status_issued_at_idx` ON `creator_account` (`status`,`issued_at`);