CREATE TABLE `animal` (
	`id` text PRIMARY KEY NOT NULL,
	`zoo_id` text NOT NULL,
	`name` text NOT NULL,
	`species` text NOT NULL,
	`description` text,
	`profile_media_asset_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`zoo_id`) REFERENCES `zoo`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`profile_media_asset_id`) REFERENCES `media_asset`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "animal_name_length_check" CHECK(length("animal"."name") between 1 and 100),
	CONSTRAINT "animal_species_length_check" CHECK(length("animal"."species") between 1 and 100),
	CONSTRAINT "animal_description_length_check" CHECK("animal"."description" is null or length("animal"."description") <= 1000),
	CONSTRAINT "animal_status_check" CHECK("animal"."status" in ('active', 'archived'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `animal_id_zoo_id_uidx` ON `animal` (`id`,`zoo_id`);--> statement-breakpoint
CREATE INDEX `animal_zoo_status_idx` ON `animal` (`zoo_id`,`status`);--> statement-breakpoint
CREATE INDEX `animal_name_idx` ON `animal` (`name`);--> statement-breakpoint
CREATE INDEX `animal_species_idx` ON `animal` (`species`);--> statement-breakpoint
CREATE TABLE `chat_message` (
	`id` text PRIMARY KEY NOT NULL,
	`zoo_id` text NOT NULL,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`zoo_id`) REFERENCES `zoo`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chat_message_body_length_check" CHECK(length("chat_message"."body") between 1 and 500)
);
--> statement-breakpoint
CREATE INDEX `chat_message_zoo_created_at_idx` ON `chat_message` (`zoo_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `chat_message_expires_at_idx` ON `chat_message` (`expires_at`);--> statement-breakpoint
CREATE TABLE `comment` (
	`id` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`supporter_at_posting` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "comment_body_length_check" CHECK(length("comment"."body") between 1 and 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comment_id_video_id_user_id_uidx` ON `comment` (`id`,`video_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `comment_video_created_at_idx` ON `comment` (`video_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `comment_user_created_at_idx` ON `comment` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `favorite` (
	`user_id` text NOT NULL,
	`video_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `video_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `favorite_user_created_at_idx` ON `favorite` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `gallery_post` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`zoo_id` text NOT NULL,
	`animal_id` text,
	`visit_permit_id` text NOT NULL,
	`image_media_asset_id` text NOT NULL,
	`title` text NOT NULL,
	`published_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`zoo_id`) REFERENCES `zoo`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`image_media_asset_id`) REFERENCES `media_asset`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`visit_permit_id`,`user_id`,`zoo_id`) REFERENCES `visit_permit`(`id`,`user_id`,`zoo_id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`animal_id`,`zoo_id`) REFERENCES `animal`(`id`,`zoo_id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "gallery_post_title_length_check" CHECK(length("gallery_post"."title") between 1 and 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gallery_post_image_media_asset_id_unique` ON `gallery_post` (`image_media_asset_id`);--> statement-breakpoint
CREATE INDEX `gallery_post_zoo_published_at_idx` ON `gallery_post` (`zoo_id`,`published_at`);--> statement-breakpoint
CREATE INDEX `gallery_post_user_published_at_idx` ON `gallery_post` (`user_id`,`published_at`);--> statement-breakpoint
CREATE TABLE `media_asset` (
	`id` text PRIMARY KEY NOT NULL,
	`uploader_user_id` text NOT NULL,
	`object_key` text NOT NULL,
	`purpose` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`completed_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`uploader_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "media_asset_byte_size_check" CHECK("media_asset"."byte_size" > 0),
	CONSTRAINT "media_asset_object_key_length_check" CHECK(length("media_asset"."object_key") between 1 and 1024),
	CONSTRAINT "media_asset_content_type_length_check" CHECK(length("media_asset"."content_type") between 1 and 255),
	CONSTRAINT "media_asset_purpose_check" CHECK("media_asset"."purpose" in ('avatar', 'zooProfile', 'animalProfile', 'video', 'videoPreview', 'galleryImage')),
	CONSTRAINT "media_asset_status_check" CHECK("media_asset"."status" in ('pending', 'ready', 'deleted'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_asset_object_key_unique` ON `media_asset` (`object_key`);--> statement-breakpoint
CREATE INDEX `media_asset_uploader_created_at_idx` ON `media_asset` (`uploader_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `media_asset_status_created_at_idx` ON `media_asset` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `stripe_webhook_event` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`object_id` text,
	`status` text DEFAULT 'processing' NOT NULL,
	`error_message` text,
	`received_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`processed_at` integer,
	CONSTRAINT "stripe_webhook_event_status_check" CHECK("stripe_webhook_event"."status" in ('processing', 'processed', 'failed'))
);
--> statement-breakpoint
CREATE INDEX `stripe_webhook_event_status_received_at_idx` ON `stripe_webhook_event` (`status`,`received_at`);--> statement-breakpoint
CREATE TABLE `subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`zoo_id` text NOT NULL,
	`amount` integer DEFAULT 500 NOT NULL,
	`currency` text DEFAULT 'jpy' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`stripe_customer_id` text,
	`stripe_checkout_session_id` text,
	`stripe_subscription_id` text,
	`idempotency_key` text NOT NULL,
	`current_period_start` integer,
	`current_period_end` integer,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`canceled_at` integer,
	`ended_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`zoo_id`) REFERENCES `zoo`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "subscription_amount_check" CHECK("subscription"."amount" = 500),
	CONSTRAINT "subscription_currency_check" CHECK("subscription"."currency" = 'jpy'),
	CONSTRAINT "subscription_status_check" CHECK("subscription"."status" in ('pending', 'active', 'canceling', 'expired', 'failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_stripe_checkout_session_id_unique` ON `subscription` (`stripe_checkout_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_stripe_subscription_id_unique` ON `subscription` (`stripe_subscription_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_idempotency_key_unique` ON `subscription` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_active_user_zoo_uidx` ON `subscription` (`user_id`,`zoo_id`) WHERE "subscription"."status" in ('active', 'canceling');--> statement-breakpoint
CREATE INDEX `subscription_user_status_idx` ON `subscription` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `subscription_zoo_status_idx` ON `subscription` (`zoo_id`,`status`);--> statement-breakpoint
CREATE TABLE `subscription_event` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`stripe_webhook_event_id` text,
	`type` text NOT NULL,
	`amount` integer,
	`currency` text DEFAULT 'jpy' NOT NULL,
	`stripe_object_id` text,
	`period_start` integer,
	`period_end` integer,
	`occurred_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`stripe_webhook_event_id`) REFERENCES `stripe_webhook_event`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "subscription_event_type_check" CHECK("subscription_event"."type" in ('started', 'renewed', 'cancelScheduled', 'ended', 'paymentFailed')),
	CONSTRAINT "subscription_event_amount_check" CHECK((
        "subscription_event"."type" in ('started', 'renewed', 'paymentFailed')
        and "subscription_event"."amount" = 500
      ) or (
        "subscription_event"."type" in ('cancelScheduled', 'ended')
        and "subscription_event"."amount" is null
      )),
	CONSTRAINT "subscription_event_currency_check" CHECK("subscription_event"."currency" = 'jpy'),
	CONSTRAINT "subscription_event_period_check" CHECK("subscription_event"."period_start" is null or "subscription_event"."period_end" is null or "subscription_event"."period_start" < "subscription_event"."period_end")
);
--> statement-breakpoint
CREATE INDEX `subscription_event_subscription_occurred_at_idx` ON `subscription_event` (`subscription_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `subscription_event_webhook_idx` ON `subscription_event` (`stripe_webhook_event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_event_type_stripe_object_uidx` ON `subscription_event` (`type`,`stripe_object_id`) WHERE "subscription_event"."stripe_object_id" is not null;--> statement-breakpoint
CREATE TABLE `tag` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT "tag_name_length_check" CHECK(length("tag"."name") between 1 and 50),
	CONSTRAINT "tag_slug_length_check" CHECK(length("tag"."slug") between 1 and 50)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_slug_unique` ON `tag` (`slug`);--> statement-breakpoint
CREATE TABLE `tip` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`zoo_id` text NOT NULL,
	`animal_id` text NOT NULL,
	`video_id` text NOT NULL,
	`comment_id` text,
	`comment_body` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'jpy' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`stripe_checkout_session_id` text,
	`stripe_payment_intent_id` text,
	`idempotency_key` text NOT NULL,
	`succeeded_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`video_id`,`zoo_id`,`animal_id`) REFERENCES `video`(`id`,`zoo_id`,`animal_id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`comment_id`,`video_id`,`user_id`) REFERENCES `comment`(`id`,`video_id`,`user_id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "tip_amount_check" CHECK("tip"."amount" between 100 and 3000),
	CONSTRAINT "tip_currency_check" CHECK("tip"."currency" = 'jpy'),
	CONSTRAINT "tip_status_check" CHECK("tip"."status" in ('pending', 'succeeded', 'failed')),
	CONSTRAINT "tip_comment_body_length_check" CHECK(length("tip"."comment_body") between 1 and 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tip_comment_id_unique` ON `tip` (`comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tip_stripe_checkout_session_id_unique` ON `tip` (`stripe_checkout_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tip_stripe_payment_intent_id_unique` ON `tip` (`stripe_payment_intent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tip_idempotency_key_unique` ON `tip` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `tip_user_created_at_idx` ON `tip` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `tip_zoo_status_created_at_idx` ON `tip` (`zoo_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `tip_video_created_at_idx` ON `tip` (`video_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `user_profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`bio` text,
	`withdrawn_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "user_profile_bio_length_check" CHECK("user_profile"."bio" is null or length("user_profile"."bio") <= 500)
);
--> statement-breakpoint
CREATE TABLE `video` (
	`id` text PRIMARY KEY NOT NULL,
	`zoo_id` text NOT NULL,
	`animal_id` text NOT NULL,
	`author_user_id` text NOT NULL,
	`full_media_asset_id` text NOT NULL,
	`preview_media_asset_id` text NOT NULL,
	`description` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`zoo_id`) REFERENCES `zoo`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`author_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`full_media_asset_id`) REFERENCES `media_asset`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`preview_media_asset_id`) REFERENCES `media_asset`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`animal_id`,`zoo_id`) REFERENCES `animal`(`id`,`zoo_id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "video_duration_check" CHECK("video"."duration_ms" > 0 and "video"."duration_ms" <= 60000),
	CONSTRAINT "video_description_length_check" CHECK(length("video"."description") between 1 and 1000),
	CONSTRAINT "video_status_check" CHECK("video"."status" in ('draft', 'published', 'hidden'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `video_full_media_asset_id_unique` ON `video` (`full_media_asset_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `video_preview_media_asset_id_unique` ON `video` (`preview_media_asset_id`);--> statement-breakpoint
CREATE INDEX `video_status_published_at_idx` ON `video` (`status`,`published_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `video_id_zoo_id_animal_id_uidx` ON `video` (`id`,`zoo_id`,`animal_id`);--> statement-breakpoint
CREATE INDEX `video_zoo_status_published_at_idx` ON `video` (`zoo_id`,`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `video_animal_status_idx` ON `video` (`animal_id`,`status`);--> statement-breakpoint
CREATE TABLE `video_tag` (
	`video_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`video_id`, `tag_id`),
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `video_tag_tag_id_video_id_idx` ON `video_tag` (`tag_id`,`video_id`);--> statement-breakpoint
CREATE TABLE `visit_permit` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`zoo_id` text NOT NULL,
	`qr_code_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`zoo_id`) REFERENCES `zoo`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`qr_code_id`,`zoo_id`) REFERENCES `visit_qr_code`(`id`,`zoo_id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visit_permit_id_user_id_zoo_id_uidx` ON `visit_permit` (`id`,`user_id`,`zoo_id`);--> statement-breakpoint
CREATE INDEX `visit_permit_user_zoo_expires_at_idx` ON `visit_permit` (`user_id`,`zoo_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `visit_qr_code` (
	`id` text PRIMARY KEY NOT NULL,
	`zoo_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` integer,
	`revoked_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`zoo_id`) REFERENCES `zoo`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "visit_qr_code_status_check" CHECK("visit_qr_code"."status" in ('active', 'revoked'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visit_qr_code_token_hash_unique` ON `visit_qr_code` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `visit_qr_code_id_zoo_id_uidx` ON `visit_qr_code` (`id`,`zoo_id`);--> statement-breakpoint
CREATE INDEX `visit_qr_code_zoo_status_idx` ON `visit_qr_code` (`zoo_id`,`status`);--> statement-breakpoint
CREATE TABLE `zoo` (
	`id` text PRIMARY KEY NOT NULL,
	`publisher_user_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`region` text NOT NULL,
	`address` text,
	`profile_media_asset_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`publisher_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`profile_media_asset_id`) REFERENCES `media_asset`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "zoo_slug_length_check" CHECK(length("zoo"."slug") between 1 and 100),
	CONSTRAINT "zoo_name_length_check" CHECK(length("zoo"."name") between 1 and 100),
	CONSTRAINT "zoo_description_length_check" CHECK("zoo"."description" is null or length("zoo"."description") <= 1000),
	CONSTRAINT "zoo_region_length_check" CHECK(length("zoo"."region") between 1 and 100),
	CONSTRAINT "zoo_address_length_check" CHECK("zoo"."address" is null or length("zoo"."address") <= 255),
	CONSTRAINT "zoo_status_check" CHECK("zoo"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zoo_publisher_user_id_unique` ON `zoo` (`publisher_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `zoo_slug_unique` ON `zoo` (`slug`);--> statement-breakpoint
CREATE INDEX `zoo_name_idx` ON `zoo` (`name`);--> statement-breakpoint
CREATE INDEX `zoo_region_status_idx` ON `zoo` (`region`,`status`);--> statement-breakpoint
CREATE TABLE `zoo_social_link` (
	`id` text PRIMARY KEY NOT NULL,
	`zoo_id` text NOT NULL,
	`platform` text NOT NULL,
	`url` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`zoo_id`) REFERENCES `zoo`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "zoo_social_link_platform_check" CHECK("zoo_social_link"."platform" in ('website', 'x', 'instagram', 'youtube', 'tiktok', 'facebook')),
	CONSTRAINT "zoo_social_link_url_length_check" CHECK(length("zoo_social_link"."url") between 1 and 2048)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zoo_social_link_zoo_platform_uidx` ON `zoo_social_link` (`zoo_id`,`platform`);