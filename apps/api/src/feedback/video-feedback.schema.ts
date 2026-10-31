import { pgTable, text, uuid, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "../users/users.schema";
import { videosTable } from "../videos/videos.schema";
/** Aynı kullanıcı/video/neden güncellenir; tekrar dokunma sınırsız satır üretmez. */
export const videoFeedbackTable = pgTable("video_feedback", {
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  videoId: uuid("video_id").notNull().references(() => videosTable.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(), comment: text("comment").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.videoId, t.reason] })]);
