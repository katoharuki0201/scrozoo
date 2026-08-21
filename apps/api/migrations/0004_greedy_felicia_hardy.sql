CREATE TABLE `support_goal` (
	`id` text PRIMARY KEY NOT NULL,
	`zoo_id` text NOT NULL,
	`title` text NOT NULL,
	`target_amount` integer NOT NULL,
	`current_amount` integer DEFAULT 0 NOT NULL,
	`deadline` text NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`zoo_id`) REFERENCES `zoo`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "support_goal_title_length_check" CHECK(length("support_goal"."title") between 1 and 50),
	CONSTRAINT "support_goal_target_amount_check" CHECK("support_goal"."target_amount" >= 500),
	CONSTRAINT "support_goal_current_amount_check" CHECK("support_goal"."current_amount" >= 0),
	CONSTRAINT "support_goal_deadline_check" CHECK("support_goal"."deadline" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `support_goal_active_zoo_uidx` ON `support_goal` (`zoo_id`) WHERE "support_goal"."archived_at" is null;--> statement-breakpoint
CREATE INDEX `support_goal_zoo_created_at_idx` ON `support_goal` (`zoo_id`,`created_at`);