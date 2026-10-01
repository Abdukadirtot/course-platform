import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// User IDs come from Neon Auth's `neon_auth.user` table. They are stored as text
// without a cross-schema foreign key until SPIKE-3 confirms the column type.

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const coursePricing = pgEnum("course_pricing", ["free", "paid"]);
export const courseStatus = pgEnum("course_status", ["draft", "published", "archived"]);
export const lessonStatus = pgEnum("lesson_status", ["draft", "published"]);
export const entitlementKind = pgEnum("entitlement_kind", ["course", "subscription", "lifetime"]);
export const entitlementStatus = pgEnum("entitlement_status", ["active", "canceled", "revoked"]);

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  descriptionMd: text("description_md").notNull().default(""),
  thumbnailPath: text("thumbnail_path"),
  previewVideoPath: text("preview_video_path"),
  pricing: coursePricing("pricing").notNull().default("paid"),
  priceCents: integer("price_cents").notNull().default(2500),
  polarProductId: text("polar_product_id").unique(),
  status: courseStatus("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ...timestamps,
});

export const sections = pgTable(
  "sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull(),
    ...timestamps,
  },
  (t) => [index("sections_course_position_idx").on(t.courseId, t.position)],
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    contentMd: text("content_md").notNull().default(""),
    videoFileId: text("video_file_id"),
    videoPath: text("video_path"),
    durationSec: integer("duration_sec"),
    isFreePreview: boolean("is_free_preview").notNull().default(false),
    status: lessonStatus("status").notNull().default("draft"),
    position: integer("position").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("lessons_course_slug_uq").on(t.courseId, t.slug),
    index("lessons_section_position_idx").on(t.sectionId, t.position),
  ],
);

export const lessonAttachments = pgTable("lesson_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  fileId: text("file_id").notNull(),
  filePath: text("file_path").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  mimeType: text("mime_type").notNull(),
  position: integer("position").notNull(),
  ...timestamps,
});

export const polarCustomers = pgTable("polar_customers", {
  userId: text("user_id").primaryKey(),
  polarCustomerId: text("polar_customer_id").notNull().unique(),
  ...timestamps,
});

// Rows are never hard-deleted: revocations set status + revokedAt for an audit trail.
export const entitlements = pgTable(
  "entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    kind: entitlementKind("kind").notNull(),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "restrict" }),
    polarOrderId: text("polar_order_id").unique(),
    polarSubscriptionId: text("polar_subscription_id").unique(),
    status: entitlementStatus("status").notNull().default("active"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    polarModifiedAt: timestamp("polar_modified_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokeReason: text("revoke_reason"),
    ...timestamps,
  },
  (t) => [index("entitlements_user_idx").on(t.userId)],
);

export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(), // Polar `webhook-id` header
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  error: text("error"),
});

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: text("user_id").notNull(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    positionSec: integer("position_sec").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastWatchedAt: timestamp("last_watched_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.lessonId] }),
    index("lesson_progress_user_recent_idx").on(t.userId, t.lastWatchedAt),
  ],
);
