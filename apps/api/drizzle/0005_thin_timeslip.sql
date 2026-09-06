CREATE TABLE "transcript_segment_learning_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transcript_segment_id" uuid NOT NULL,
	"type" text NOT NULL,
	"expression" text NOT NULL,
	"english_explanation" text NOT NULL,
	"turkish_explanation" text NOT NULL,
	"example_en" text,
	"example_tr" text,
	"ordinal" integer NOT NULL,
	CONSTRAINT "transcript_segment_learning_points_segment_id_ordinal_unique" UNIQUE("transcript_segment_id","ordinal"),
	CONSTRAINT "transcript_segment_learning_points_type_check" CHECK ("transcript_segment_learning_points"."type" IN ('phrase', 'grammar'))
);
--> statement-breakpoint
CREATE TABLE "video_transcript_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"text" text NOT NULL,
	"english_explanation" text NOT NULL,
	"turkish_explanation" text NOT NULL,
	CONSTRAINT "video_transcript_segments_video_id_ordinal_unique" UNIQUE("video_id","ordinal"),
	CONSTRAINT "video_transcript_segments_start_ms_non_negative_check" CHECK ("video_transcript_segments"."start_ms" >= 0),
	CONSTRAINT "video_transcript_segments_end_after_start_check" CHECK ("video_transcript_segments"."end_ms" > "video_transcript_segments"."start_ms")
);
--> statement-breakpoint
-- Chunk 10 review kararı: quiz artık video-bağımsız olamaz (source_transcript_segment_id
-- NOT NULL). Var olan quiz'ler (Chunk 5/10 seed'inin generic/video-bağımsız soruları)
-- bu invariant'ı hiçbir zaman karşılayamaz ve zaten kasıtlı olarak deprecate edildi
-- (bkz. seed-quizzes.ts) — bu satırlar sadece seed/sample data, gerçek kullanıcı
-- verisi değil, bu yüzden NOT NULL kolonu eklemeden önce temizleniyor.
DELETE FROM "quiz_answer_events";--> statement-breakpoint
DELETE FROM "quiz_options";--> statement-breakpoint
DELETE FROM "quizzes";--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "source_transcript_segment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "transcript_segment_learning_points" ADD CONSTRAINT "transcript_segment_learning_points_transcript_segment_id_video_transcript_segments_id_fk" FOREIGN KEY ("transcript_segment_id") REFERENCES "public"."video_transcript_segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_transcript_segments" ADD CONSTRAINT "video_transcript_segments_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_transcript_segments_video_id_ordinal_idx" ON "video_transcript_segments" USING btree ("video_id","ordinal");--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_source_transcript_segment_id_video_transcript_segments_id_fk" FOREIGN KEY ("source_transcript_segment_id") REFERENCES "public"."video_transcript_segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quizzes_source_transcript_segment_id_idx" ON "quizzes" USING btree ("source_transcript_segment_id");