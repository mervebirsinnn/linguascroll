ALTER TABLE "videos" ADD COLUMN "category" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "attribution" jsonb;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "video_category_check" CHECK ("videos"."category" IN ('general', 'animation'));--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "animation_attribution_check" CHECK ("videos"."category" <> 'animation' OR "videos"."attribution" IS NOT NULL);