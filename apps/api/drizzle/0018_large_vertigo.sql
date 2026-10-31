CREATE TABLE "free_preview_videos" (
	"user_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"video_id" uuid NOT NULL,
	CONSTRAINT "free_preview_videos_user_id_scope_video_id_pk" PRIMARY KEY("user_id","scope","video_id")
);
--> statement-breakpoint
ALTER TABLE "free_preview_videos" ADD CONSTRAINT "free_preview_videos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "free_preview_videos" ADD CONSTRAINT "free_preview_videos_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE no action ON UPDATE no action;