CREATE TABLE "video_feedback" (
	"user_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"comment" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_feedback_user_id_video_id_reason_pk" PRIMARY KEY("user_id","video_id","reason")
);
--> statement-breakpoint
ALTER TABLE "video_feedback" ADD CONSTRAINT "video_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_feedback" ADD CONSTRAINT "video_feedback_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;