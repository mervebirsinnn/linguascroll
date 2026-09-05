CREATE TABLE "user_saved_words" (
	"user_id" uuid NOT NULL,
	"word_id" uuid NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_saved_words_user_id_word_id_pk" PRIMARY KEY("user_id","word_id")
);
--> statement-breakpoint
CREATE TABLE "video_words" (
	"video_id" uuid NOT NULL,
	"word_id" uuid NOT NULL,
	CONSTRAINT "video_words_video_id_word_id_pk" PRIMARY KEY("video_id","word_id")
);
--> statement-breakpoint
CREATE TABLE "words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"language" text NOT NULL,
	"lemma" text NOT NULL,
	"gloss" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_saved_words" ADD CONSTRAINT "user_saved_words_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_words" ADD CONSTRAINT "user_saved_words_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_words" ADD CONSTRAINT "video_words_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_words" ADD CONSTRAINT "video_words_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;