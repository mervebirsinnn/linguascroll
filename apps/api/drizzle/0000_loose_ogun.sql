CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_language" text NOT NULL,
	"cefr_level" text NOT NULL,
	"mux_asset_id" text NOT NULL,
	"topic" text NOT NULL,
	"duration_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cefr_level_check" CHECK ("videos"."cefr_level" IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
	CONSTRAINT "duration_ms_non_negative_check" CHECK ("videos"."duration_ms" >= 0)
);
