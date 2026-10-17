CREATE TABLE "segment_word_glosses" (
	"segment_id" uuid NOT NULL,
	"word" text NOT NULL,
	"gloss" text NOT NULL,
	CONSTRAINT "segment_word_glosses_segment_id_word_pk" PRIMARY KEY("segment_id","word")
);
--> statement-breakpoint
ALTER TABLE "segment_word_glosses" ADD CONSTRAINT "segment_word_glosses_segment_id_video_transcript_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."video_transcript_segments"("id") ON DELETE cascade ON UPDATE no action;