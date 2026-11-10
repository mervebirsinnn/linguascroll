import { pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "../users/users.schema";
import { videosTable } from "../videos/videos.schema";

/** Her hesap için kalıcı ücretsiz seçki. Yeni kod canonical `scope=all`
 * kullanır; kolon ve composite PK mevcut migration/veriyle uyumluluk için korunur. */
export const freePreviewVideosTable = pgTable("free_preview_videos", {
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  scope: text("scope").notNull(),
  videoId: uuid("video_id").notNull().references(() => videosTable.id),
}, (t) => [primaryKey({ columns: [t.userId, t.scope, t.videoId] })]);
