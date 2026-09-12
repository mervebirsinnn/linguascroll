CREATE TABLE "word_review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"word_id" uuid NOT NULL,
	"is_correct" boolean NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_saved_words" ADD COLUMN "source_segment_id" uuid;--> statement-breakpoint
ALTER TABLE "word_review_events" ADD CONSTRAINT "word_review_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_review_events" ADD CONSTRAINT "word_review_events_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "word_review_events_user_id_idx" ON "word_review_events" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "user_saved_words" ADD CONSTRAINT "user_saved_words_source_segment_id_video_transcript_segments_id_fk" FOREIGN KEY ("source_segment_id") REFERENCES "public"."video_transcript_segments"("id") ON DELETE set null ON UPDATE no action;