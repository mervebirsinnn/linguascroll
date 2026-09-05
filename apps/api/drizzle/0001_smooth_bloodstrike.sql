CREATE TABLE "quiz_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"text" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "quiz_options_position_unique" UNIQUE("quiz_id","position"),
	CONSTRAINT "quiz_options_position_non_negative_check" CHECK ("quiz_options"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz_options" ADD CONSTRAINT "quiz_options_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_options_one_correct_per_quiz" ON "quiz_options" USING btree ("quiz_id") WHERE "quiz_options"."is_correct" = true;