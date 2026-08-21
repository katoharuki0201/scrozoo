import { relations, sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role").$type<"viewer" | "creator" | "admin">().default("viewer").notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("account_issuer_accountId_uidx").on(
      table.issuer,
      table.accountId,
    ),
    index("account_userId_idx").on(table.userId),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// --- Application schema ---
// Keep the Better Auth generated section above synchronized with
// auth-schema.ts. Application tables and relations are defined below.

import {
  check,
  foreignKey,
  primaryKey,
} from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull();

export type MediaPurpose =
  | "avatar"
  | "zooProfile"
  | "animalProfile"
  | "video"
  | "videoPreview"
  | "galleryImage";

export type MediaStatus = "pending" | "ready" | "deleted";

export type SubscriptionEventType =
  | "started"
  | "renewed"
  | "cancelScheduled"
  | "ended"
  | "paymentFailed";

export const userProfile = sqliteTable(
  "user_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "restrict" }),
    bio: text("bio"),
    withdrawnAt: integer("withdrawn_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "user_profile_bio_length_check",
      sql`${table.bio} is null or length(${table.bio}) <= 500`,
    ),
  ],
);

export const mediaAsset = sqliteTable(
  "media_asset",
  {
    id: text("id").primaryKey(),
    uploaderUserId: text("uploader_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    objectKey: text("object_key").notNull().unique(),
    purpose: text("purpose").$type<MediaPurpose>().notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    status: text("status")
      .$type<MediaStatus>()
      .default("pending")
      .notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (table) => [
    index("media_asset_uploader_created_at_idx").on(
      table.uploaderUserId,
      table.createdAt,
    ),
    index("media_asset_status_created_at_idx").on(table.status, table.createdAt),
    check("media_asset_byte_size_check", sql`${table.byteSize} > 0`),
    check(
      "media_asset_object_key_length_check",
      sql`length(${table.objectKey}) between 1 and 1024`,
    ),
    check(
      "media_asset_content_type_length_check",
      sql`length(${table.contentType}) between 1 and 255`,
    ),
    check(
      "media_asset_purpose_check",
      sql`${table.purpose} in ('avatar', 'zooProfile', 'animalProfile', 'video', 'videoPreview', 'galleryImage')`,
    ),
    check(
      "media_asset_status_check",
      sql`${table.status} in ('pending', 'ready', 'deleted')`,
    ),
  ],
);

export const zoo = sqliteTable(
  "zoo",
  {
    id: text("id").primaryKey(),
    publisherUserId: text("publisher_user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "restrict" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    region: text("region").notNull(),
    address: text("address"),
    profileMediaAssetId: text("profile_media_asset_id").references(
      () => mediaAsset.id,
      { onDelete: "set null" },
    ),
    status: text("status")
      .$type<"active" | "inactive">()
      .default("active")
      .notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("zoo_name_idx").on(table.name),
    index("zoo_region_status_idx").on(table.region, table.status),
    check(
      "zoo_slug_length_check",
      sql`length(${table.slug}) between 1 and 100`,
    ),
    check(
      "zoo_name_length_check",
      sql`length(${table.name}) between 1 and 100`,
    ),
    check(
      "zoo_description_length_check",
      sql`${table.description} is null or length(${table.description}) <= 1000`,
    ),
    check(
      "zoo_region_length_check",
      sql`length(${table.region}) between 1 and 100`,
    ),
    check(
      "zoo_address_length_check",
      sql`${table.address} is null or length(${table.address}) <= 255`,
    ),
    check("zoo_status_check", sql`${table.status} in ('active', 'inactive')`),
  ],
);

export const creatorAccount = sqliteTable(
  "creator_account",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    managerName: text("manager_name").notNull(),
    status: text("status")
      .$type<"active" | "suspended">()
      .default("active")
      .notNull(),
    issuedByAdminUserId: text("issued_by_admin_user_id").references(
      () => user.id,
      { onDelete: "set null" },
    ),
    issuedAt: integer("issued_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("creator_account_status_issued_at_idx").on(
      table.status,
      table.issuedAt,
    ),
    check(
      "creator_account_manager_name_length_check",
      sql`length(${table.managerName}) between 1 and 30`,
    ),
    check(
      "creator_account_status_check",
      sql`${table.status} in ('active', 'suspended')`,
    ),
  ],
);

export const zooSocialLink = sqliteTable(
  "zoo_social_link",
  {
    id: text("id").primaryKey(),
    zooId: text("zoo_id")
      .notNull()
      .references(() => zoo.id, { onDelete: "cascade" }),
    platform: text("platform")
      .$type<
        "website" | "x" | "instagram" | "youtube" | "tiktok" | "facebook"
      >()
      .notNull(),
    url: text("url").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("zoo_social_link_zoo_platform_uidx").on(
      table.zooId,
      table.platform,
    ),
    check(
      "zoo_social_link_platform_check",
      sql`${table.platform} in ('website', 'x', 'instagram', 'youtube', 'tiktok', 'facebook')`,
    ),
    check(
      "zoo_social_link_url_length_check",
      sql`length(${table.url}) between 1 and 2048`,
    ),
  ],
);

export const animal = sqliteTable(
  "animal",
  {
    id: text("id").primaryKey(),
    zooId: text("zoo_id")
      .notNull()
      .references(() => zoo.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    species: text("species").notNull(),
    description: text("description"),
    profileMediaAssetId: text("profile_media_asset_id").references(
      () => mediaAsset.id,
      { onDelete: "set null" },
    ),
    status: text("status")
      .$type<"active" | "archived">()
      .default("active")
      .notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("animal_id_zoo_id_uidx").on(table.id, table.zooId),
    index("animal_zoo_status_idx").on(table.zooId, table.status),
    index("animal_name_idx").on(table.name),
    index("animal_species_idx").on(table.species),
    check(
      "animal_name_length_check",
      sql`length(${table.name}) between 1 and 100`,
    ),
    check(
      "animal_species_length_check",
      sql`length(${table.species}) between 1 and 100`,
    ),
    check(
      "animal_description_length_check",
      sql`${table.description} is null or length(${table.description}) <= 1000`,
    ),
    check(
      "animal_status_check",
      sql`${table.status} in ('active', 'archived')`,
    ),
  ],
);

export const video = sqliteTable(
  "video",
  {
    id: text("id").primaryKey(),
    zooId: text("zoo_id")
      .notNull()
      .references(() => zoo.id, { onDelete: "restrict" }),
    animalId: text("animal_id").notNull(),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    fullMediaAssetId: text("full_media_asset_id")
      .notNull()
      .unique()
      .references(() => mediaAsset.id, { onDelete: "restrict" }),
    previewMediaAssetId: text("preview_media_asset_id")
      .notNull()
      .unique()
      .references(() => mediaAsset.id, { onDelete: "restrict" }),
    description: text("description").notNull(),
    durationMs: integer("duration_ms").notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    thumbnailTime: integer("thumbnail_time").default(0).notNull(),
    status: text("status")
      .$type<"draft" | "published" | "hidden">()
      .default("draft")
      .notNull(),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      name: "video_animal_zoo_fk",
      columns: [table.animalId, table.zooId],
      foreignColumns: [animal.id, animal.zooId],
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    index("video_status_published_at_idx").on(table.status, table.publishedAt),
    uniqueIndex("video_id_zoo_id_animal_id_uidx").on(
      table.id,
      table.zooId,
      table.animalId,
    ),
    index("video_zoo_status_published_at_idx").on(
      table.zooId,
      table.status,
      table.publishedAt,
    ),
    index("video_animal_status_idx").on(table.animalId, table.status),
    check(
      "video_duration_check",
      sql`${table.durationMs} > 0 and ${table.durationMs} <= 60000`,
    ),
    check(
      "video_description_length_check",
      sql`length(${table.description}) between 1 and 1000`,
    ),
    check(
      "video_status_check",
      sql`${table.status} in ('draft', 'published', 'hidden')`,
    ),
  ],
);

export const tag = sqliteTable(
  "tag",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    createdAt: createdAt(),
  },
  (table) => [
    check("tag_name_length_check", sql`length(${table.name}) between 1 and 50`),
    check("tag_slug_length_check", sql`length(${table.slug}) between 1 and 50`),
  ],
);

export const videoTag = sqliteTable(
  "video_tag",
  {
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.videoId, table.tagId] }),
    index("video_tag_tag_id_video_id_idx").on(table.tagId, table.videoId),
  ],
);

export const subscription = sqliteTable(
  "subscription",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    zooId: text("zoo_id")
      .notNull()
      .references(() => zoo.id, { onDelete: "restrict" }),
    amount: integer("amount").default(500).notNull(),
    currency: text("currency").default("jpy").notNull(),
    status: text("status")
      .$type<"pending" | "active" | "canceling" | "expired" | "failed">()
      .default("pending")
      .notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    currentPeriodStart: integer("current_period_start", {
      mode: "timestamp_ms",
    }),
    currentPeriodEnd: integer("current_period_end", {
      mode: "timestamp_ms",
    }),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" })
      .default(false)
      .notNull(),
    canceledAt: integer("canceled_at", { mode: "timestamp_ms" }),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("subscription_active_user_zoo_uidx")
      .on(table.userId, table.zooId)
      .where(sql`${table.status} in ('active', 'canceling')`),
    index("subscription_user_status_idx").on(table.userId, table.status),
    index("subscription_zoo_status_idx").on(table.zooId, table.status),
    check("subscription_amount_check", sql`${table.amount} = 500`),
    check("subscription_currency_check", sql`${table.currency} = 'jpy'`),
    check(
      "subscription_status_check",
      sql`${table.status} in ('pending', 'active', 'canceling', 'expired', 'failed')`,
    ),
  ],
);

export const supportGoal = sqliteTable(
  "support_goal",
  {
    id: text("id").primaryKey(),
    zooId: text("zoo_id")
      .notNull()
      .references(() => zoo.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    targetAmount: integer("target_amount").notNull(),
    currentAmount: integer("current_amount").default(0).notNull(),
    deadline: text("deadline").notNull(),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("support_goal_active_zoo_uidx")
      .on(table.zooId)
      .where(sql`${table.archivedAt} is null`),
    index("support_goal_zoo_created_at_idx").on(table.zooId, table.createdAt),
    check(
      "support_goal_title_length_check",
      sql`length(${table.title}) between 1 and 50`,
    ),
    check("support_goal_target_amount_check", sql`${table.targetAmount} >= 500`),
    check("support_goal_current_amount_check", sql`${table.currentAmount} >= 0`),
    check(
      "support_goal_deadline_check",
      sql`${table.deadline} glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`,
    ),
  ],
);

export const comment = sqliteTable(
  "comment",
  {
    id: text("id").primaryKey(),
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    supporterAtPosting: integer("supporter_at_posting", { mode: "boolean" })
      .default(false)
      .notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("comment_id_video_id_user_id_uidx").on(
      table.id,
      table.videoId,
      table.userId,
    ),
    index("comment_video_created_at_idx").on(table.videoId, table.createdAt),
    index("comment_user_created_at_idx").on(table.userId, table.createdAt),
    check(
      "comment_body_length_check",
      sql`length(${table.body}) between 1 and 1000`,
    ),
  ],
);

export const tip = sqliteTable(
  "tip",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    zooId: text("zoo_id").notNull(),
    animalId: text("animal_id").notNull(),
    videoId: text("video_id").notNull(),
    commentId: text("comment_id").unique(),
    commentBody: text("comment_body").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").default("jpy").notNull(),
    status: text("status")
      .$type<"pending" | "succeeded" | "failed">()
      .default("pending")
      .notNull(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    succeededAt: integer("succeeded_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      name: "tip_video_zoo_animal_fk",
      columns: [table.videoId, table.zooId, table.animalId],
      foreignColumns: [video.id, video.zooId, video.animalId],
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      name: "tip_comment_video_user_fk",
      columns: [table.commentId, table.videoId, table.userId],
      foreignColumns: [comment.id, comment.videoId, comment.userId],
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    index("tip_user_created_at_idx").on(table.userId, table.createdAt),
    index("tip_zoo_status_created_at_idx").on(
      table.zooId,
      table.status,
      table.createdAt,
    ),
    index("tip_video_created_at_idx").on(table.videoId, table.createdAt),
    check("tip_amount_check", sql`${table.amount} between 100 and 3000`),
    check("tip_currency_check", sql`${table.currency} = 'jpy'`),
    check(
      "tip_status_check",
      sql`${table.status} in ('pending', 'succeeded', 'failed')`,
    ),
    check(
      "tip_comment_body_length_check",
      sql`length(${table.commentBody}) between 1 and 1000`,
    ),
  ],
);

export const favorite = sqliteTable(
  "favorite",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.videoId] }),
    index("favorite_user_created_at_idx").on(table.userId, table.createdAt),
  ],
);

export const visitQrCode = sqliteTable(
  "visit_qr_code",
  {
    id: text("id").primaryKey(),
    zooId: text("zoo_id")
      .notNull()
      .references(() => zoo.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull().unique(),
    status: text("status")
      .$type<"active" | "revoked">()
      .default("active")
      .notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("visit_qr_code_id_zoo_id_uidx").on(table.id, table.zooId),
    index("visit_qr_code_zoo_status_idx").on(table.zooId, table.status),
    check(
      "visit_qr_code_status_check",
      sql`${table.status} in ('active', 'revoked')`,
    ),
  ],
);

export const visitPermit = sqliteTable(
  "visit_permit",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    zooId: text("zoo_id")
      .notNull()
      .references(() => zoo.id, { onDelete: "restrict" }),
    qrCodeId: text("qr_code_id").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "visit_permit_qr_code_zoo_fk",
      columns: [table.qrCodeId, table.zooId],
      foreignColumns: [visitQrCode.id, visitQrCode.zooId],
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    uniqueIndex("visit_permit_id_user_id_zoo_id_uidx").on(
      table.id,
      table.userId,
      table.zooId,
    ),
    index("visit_permit_user_zoo_expires_at_idx").on(
      table.userId,
      table.zooId,
      table.expiresAt,
    ),
  ],
);

export const galleryPost = sqliteTable(
  "gallery_post",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    zooId: text("zoo_id")
      .notNull()
      .references(() => zoo.id, { onDelete: "restrict" }),
    animalId: text("animal_id"),
    visitPermitId: text("visit_permit_id").notNull(),
    imageMediaAssetId: text("image_media_asset_id")
      .notNull()
      .unique()
      .references(() => mediaAsset.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    publishedAt: integer("published_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "gallery_post_visit_permit_user_zoo_fk",
      columns: [table.visitPermitId, table.userId, table.zooId],
      foreignColumns: [visitPermit.id, visitPermit.userId, visitPermit.zooId],
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      name: "gallery_post_animal_zoo_fk",
      columns: [table.animalId, table.zooId],
      foreignColumns: [animal.id, animal.zooId],
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    index("gallery_post_zoo_published_at_idx").on(
      table.zooId,
      table.publishedAt,
    ),
    index("gallery_post_user_published_at_idx").on(
      table.userId,
      table.publishedAt,
    ),
    check(
      "gallery_post_title_length_check",
      sql`length(${table.title}) between 1 and 100`,
    ),
  ],
);

export const chatMessage = sqliteTable(
  "chat_message",
  {
    id: text("id").primaryKey(),
    zooId: text("zoo_id")
      .notNull()
      .references(() => zoo.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("chat_message_zoo_created_at_idx").on(table.zooId, table.createdAt),
    index("chat_message_expires_at_idx").on(table.expiresAt),
    check(
      "chat_message_body_length_check",
      sql`length(${table.body}) between 1 and 500`,
    ),
  ],
);

export const stripeWebhookEvent = sqliteTable(
  "stripe_webhook_event",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    objectId: text("object_id"),
    status: text("status")
      .$type<"processing" | "processed" | "failed">()
      .default("processing")
      .notNull(),
    errorMessage: text("error_message"),
    receivedAt: integer("received_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    processedAt: integer("processed_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("stripe_webhook_event_status_received_at_idx").on(
      table.status,
      table.receivedAt,
    ),
    check(
      "stripe_webhook_event_status_check",
      sql`${table.status} in ('processing', 'processed', 'failed')`,
    ),
  ],
);

export const subscriptionEvent = sqliteTable(
  "subscription_event",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscription.id, { onDelete: "restrict" }),
    stripeWebhookEventId: text("stripe_webhook_event_id").references(
      () => stripeWebhookEvent.id,
      { onDelete: "restrict" },
    ),
    type: text("type").$type<SubscriptionEventType>().notNull(),
    amount: integer("amount"),
    currency: text("currency").default("jpy").notNull(),
    stripeObjectId: text("stripe_object_id"),
    periodStart: integer("period_start", { mode: "timestamp_ms" }),
    periodEnd: integer("period_end", { mode: "timestamp_ms" }),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("subscription_event_subscription_occurred_at_idx").on(
      table.subscriptionId,
      table.occurredAt,
    ),
    index("subscription_event_webhook_idx").on(table.stripeWebhookEventId),
    uniqueIndex("subscription_event_type_stripe_object_uidx")
      .on(table.type, table.stripeObjectId)
      .where(sql`${table.stripeObjectId} is not null`),
    check(
      "subscription_event_type_check",
      sql`${table.type} in ('started', 'renewed', 'cancelScheduled', 'ended', 'paymentFailed')`,
    ),
    check(
      "subscription_event_amount_check",
      sql`(
        ${table.type} in ('started', 'renewed', 'paymentFailed')
        and ${table.amount} = 500
      ) or (
        ${table.type} in ('cancelScheduled', 'ended')
        and ${table.amount} is null
      )`,
    ),
    check(
      "subscription_event_currency_check",
      sql`${table.currency} = 'jpy'`,
    ),
    check(
      "subscription_event_period_check",
      sql`${table.periodStart} is null or ${table.periodEnd} is null or ${table.periodStart} < ${table.periodEnd}`,
    ),
  ],
);

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
}));

export const mediaAssetRelations = relations(mediaAsset, ({ one }) => ({
  uploader: one(user, {
    fields: [mediaAsset.uploaderUserId],
    references: [user.id],
  }),
}));

export const zooRelations = relations(zoo, ({ one, many }) => ({
  publisher: one(user, {
    fields: [zoo.publisherUserId],
    references: [user.id],
  }),
  profileMediaAsset: one(mediaAsset, {
    fields: [zoo.profileMediaAssetId],
    references: [mediaAsset.id],
  }),
  socialLinks: many(zooSocialLink),
  animals: many(animal),
  videos: many(video),
  subscriptions: many(subscription),
  supportGoals: many(supportGoal),
  tips: many(tip),
  visitQrCodes: many(visitQrCode),
  visitPermits: many(visitPermit),
  galleryPosts: many(galleryPost),
  chatMessages: many(chatMessage),
}));

export const creatorAccountRelations = relations(
  creatorAccount,
  ({ one }) => ({
    user: one(user, {
      fields: [creatorAccount.userId],
      references: [user.id],
      relationName: "creatorAccountUser",
    }),
    issuer: one(user, {
      fields: [creatorAccount.issuedByAdminUserId],
      references: [user.id],
      relationName: "creatorAccountIssuer",
    }),
  }),
);

export const zooSocialLinkRelations = relations(zooSocialLink, ({ one }) => ({
  zoo: one(zoo, {
    fields: [zooSocialLink.zooId],
    references: [zoo.id],
  }),
}));

export const animalRelations = relations(animal, ({ one, many }) => ({
  zoo: one(zoo, {
    fields: [animal.zooId],
    references: [zoo.id],
  }),
  profileMediaAsset: one(mediaAsset, {
    fields: [animal.profileMediaAssetId],
    references: [mediaAsset.id],
  }),
  videos: many(video),
  tips: many(tip),
  galleryPosts: many(galleryPost),
}));

export const videoRelations = relations(video, ({ one, many }) => ({
  zoo: one(zoo, {
    fields: [video.zooId],
    references: [zoo.id],
  }),
  animal: one(animal, {
    fields: [video.animalId],
    references: [animal.id],
  }),
  author: one(user, {
    fields: [video.authorUserId],
    references: [user.id],
  }),
  fullMediaAsset: one(mediaAsset, {
    relationName: "videoFullMediaAsset",
    fields: [video.fullMediaAssetId],
    references: [mediaAsset.id],
  }),
  previewMediaAsset: one(mediaAsset, {
    relationName: "videoPreviewMediaAsset",
    fields: [video.previewMediaAssetId],
    references: [mediaAsset.id],
  }),
  tags: many(videoTag),
  comments: many(comment),
  tips: many(tip),
  favorites: many(favorite),
}));

export const tagRelations = relations(tag, ({ many }) => ({
  videos: many(videoTag),
}));

export const videoTagRelations = relations(videoTag, ({ one }) => ({
  video: one(video, {
    fields: [videoTag.videoId],
    references: [video.id],
  }),
  tag: one(tag, {
    fields: [videoTag.tagId],
    references: [tag.id],
  }),
}));

export const subscriptionRelations = relations(
  subscription,
  ({ one, many }) => ({
    user: one(user, {
      fields: [subscription.userId],
      references: [user.id],
    }),
    zoo: one(zoo, {
      fields: [subscription.zooId],
      references: [zoo.id],
    }),
    events: many(subscriptionEvent),
  }),
);

export const supportGoalRelations = relations(supportGoal, ({ one }) => ({
  zoo: one(zoo, {
    fields: [supportGoal.zooId],
    references: [zoo.id],
  }),
}));

export const commentRelations = relations(comment, ({ one }) => ({
  video: one(video, {
    fields: [comment.videoId],
    references: [video.id],
  }),
  user: one(user, {
    fields: [comment.userId],
    references: [user.id],
  }),
}));

export const tipRelations = relations(tip, ({ one }) => ({
  user: one(user, {
    fields: [tip.userId],
    references: [user.id],
  }),
  zoo: one(zoo, {
    fields: [tip.zooId],
    references: [zoo.id],
  }),
  animal: one(animal, {
    fields: [tip.animalId],
    references: [animal.id],
  }),
  video: one(video, {
    fields: [tip.videoId],
    references: [video.id],
  }),
  comment: one(comment, {
    fields: [tip.commentId],
    references: [comment.id],
  }),
}));

export const favoriteRelations = relations(favorite, ({ one }) => ({
  user: one(user, {
    fields: [favorite.userId],
    references: [user.id],
  }),
  video: one(video, {
    fields: [favorite.videoId],
    references: [video.id],
  }),
}));

export const visitQrCodeRelations = relations(visitQrCode, ({ one, many }) => ({
  zoo: one(zoo, {
    fields: [visitQrCode.zooId],
    references: [zoo.id],
  }),
  permits: many(visitPermit),
}));

export const visitPermitRelations = relations(visitPermit, ({ one, many }) => ({
  user: one(user, {
    fields: [visitPermit.userId],
    references: [user.id],
  }),
  zoo: one(zoo, {
    fields: [visitPermit.zooId],
    references: [zoo.id],
  }),
  qrCode: one(visitQrCode, {
    fields: [visitPermit.qrCodeId],
    references: [visitQrCode.id],
  }),
  galleryPosts: many(galleryPost),
}));

export const galleryPostRelations = relations(galleryPost, ({ one }) => ({
  user: one(user, {
    fields: [galleryPost.userId],
    references: [user.id],
  }),
  zoo: one(zoo, {
    fields: [galleryPost.zooId],
    references: [zoo.id],
  }),
  animal: one(animal, {
    fields: [galleryPost.animalId],
    references: [animal.id],
  }),
  visitPermit: one(visitPermit, {
    fields: [galleryPost.visitPermitId],
    references: [visitPermit.id],
  }),
  imageMediaAsset: one(mediaAsset, {
    fields: [galleryPost.imageMediaAssetId],
    references: [mediaAsset.id],
  }),
}));

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
  zoo: one(zoo, {
    fields: [chatMessage.zooId],
    references: [zoo.id],
  }),
  user: one(user, {
    fields: [chatMessage.userId],
    references: [user.id],
  }),
}));

export const stripeWebhookEventRelations = relations(
  stripeWebhookEvent,
  ({ many }) => ({
    subscriptionEvents: many(subscriptionEvent),
  }),
);

export const subscriptionEventRelations = relations(
  subscriptionEvent,
  ({ one }) => ({
    subscription: one(subscription, {
      fields: [subscriptionEvent.subscriptionId],
      references: [subscription.id],
    }),
    stripeWebhookEvent: one(stripeWebhookEvent, {
      fields: [subscriptionEvent.stripeWebhookEventId],
      references: [stripeWebhookEvent.id],
    }),
  }),
);
