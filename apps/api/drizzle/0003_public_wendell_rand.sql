ALTER TABLE "videos" DROP CONSTRAINT "duration_ms_non_negative_check";--> statement-breakpoint
ALTER TABLE "quiz_answer_events" DROP CONSTRAINT "quiz_answer_events_selected_option_id_quiz_options_id_fk";
--> statement-breakpoint
ALTER TABLE "video_watch_events" DROP CONSTRAINT "video_watch_events_video_id_videos_id_fk";
--> statement-breakpoint
ALTER TABLE "quiz_answer_events" ADD CONSTRAINT "quiz_answer_events_selected_option_id_quiz_options_id_fk" FOREIGN KEY ("selected_option_id") REFERENCES "public"."quiz_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_watch_events" ADD CONSTRAINT "video_watch_events_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_watch_events_user_id_idx" ON "video_watch_events" USING btree ("user_id");--> statement-breakpoint
-- Legacy topic taxonomy'sini (CEFR ile 1:1 örtüşen, curriculum-flavored) yeni
-- content-interest taxonomy'sine remap et — CHECK constraint eklenmeden ÖNCE,
-- aksi halde mevcut satırlar yeni constraint'i ihlal eder. 'travel' zaten yeni
-- vocabulary'de olduğu için UPDATE gerektirmiyor.
UPDATE "videos" SET "topic" = 'lifestyle' WHERE "topic" = 'greetings';--> statement-breakpoint
UPDATE "videos" SET "topic" = 'dating' WHERE "topic" = 'daily-routine';--> statement-breakpoint
UPDATE "videos" SET "topic" = 'career' WHERE "topic" = 'work-life';--> statement-breakpoint
UPDATE "videos" SET "topic" = 'humor' WHERE "topic" = 'culture';--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "topic_check" CHECK ("videos"."topic" IN ('dating', 'travel', 'career', 'lifestyle', 'humor'));--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "duration_ms_positive_check" CHECK ("videos"."duration_ms" > 0);